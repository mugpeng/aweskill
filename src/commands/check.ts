import { detectInstalledAgents, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir, supportsScope } from "../lib/agents.js";
import { importSkill } from "../lib/import.js";
import { getAweskillPaths, uniqueSorted } from "../lib/path.js";
import { buildCanonicalSkillIndex, parseSkillName, resolveCanonicalSkillName } from "../lib/rmdup.js";
import { getSkillSuspicionReason, listSkillEntriesInDirectory, listSkills, getSkillPath } from "../lib/skills.js";
import { listManagedSkillNames, createSkillSymlink } from "../lib/symlink.js";
import type { AgentId, RuntimeContext, Scope } from "../types.js";

const DEFAULT_PREVIEW_COUNT = 5;

function getProjectDir(context: RuntimeContext, explicitProjectDir?: string): string {
  return explicitProjectDir ?? context.cwd;
}

async function resolveAgentsForScope(
  context: RuntimeContext,
  requestedAgents: string[],
  scope: Scope,
  projectDir?: string,
): Promise<AgentId[]> {
  if (requestedAgents.length === 0 || requestedAgents.includes("all")) {
    const detected = await detectInstalledAgents({
      homeDir: context.homeDir,
      projectDir: scope === "project" ? projectDir : undefined,
    });
    const candidates = detected.length > 0 ? detected : listSupportedAgentIds();
    return candidates.filter((agentId) => supportsScope(agentId, scope));
  }

  return uniqueSorted(
    requestedAgents.map((agent) => {
      if (!isAgentId(agent)) {
        throw new Error(`Unsupported agent: ${agent}`);
      }
      if (!supportsScope(agent, scope)) {
        throw new Error(`Agent ${agent} does not support ${scope} scope.`);
      }
      return agent;
    }),
  );
}

export type CheckCategory = "linked" | "duplicate" | "matched" | "new" | "suspicious";

interface CheckedSkill {
  name: string;
  path: string;
  category: CheckCategory;
  hasSKILLMd: boolean;
  suspicionReason?: string;
  duplicateKind?: "exact" | "family";
  canonicalName?: string;
}

function formatSkillBlockWithSummary(title: string, skills: CheckedSkill[], verbose = false): string[] {
  if (skills.length === 0) {
    return [`No skills found for ${title.replace(/:$/, "").toLowerCase()}.`];
  }

  const lines = [title];
  const categories: Array<{ title: string; marker: string; key: CheckCategory }> = [
    { title: "  linked", marker: "✓", key: "linked" },
    { title: "  duplicate", marker: "!", key: "duplicate" },
    { title: "  matched", marker: "~", key: "matched" },
    { title: "  new", marker: "+", key: "new" },
    { title: "  suspicious", marker: "?", key: "suspicious" },
  ];

  for (const category of categories) {
    const entries = skills.filter((skill) => skill.category === category.key);
    lines.push(`${category.title}: ${entries.length}`);
    const preview = verbose ? entries : entries.slice(0, DEFAULT_PREVIEW_COUNT);
    for (const skill of preview) {
      lines.push(`    ${category.marker} ${skill.name} ${skill.path}`);
    }
    if (!verbose && entries.length > preview.length) {
      lines.push(`    ... and ${entries.length - preview.length} more (use --verbose to show all)`);
    }
  }

  return lines;
}

export function classifyCheckedSkill(
  skill: { name: string; path: string; hasSKILLMd: boolean },
  managed: Map<string, "symlink" | "copy">,
  canonicalSkillNames: Map<string, { name: string }>,
): CheckedSkill {
  const suspicionReason = getSkillSuspicionReason(skill);
  if (suspicionReason) {
    return {
      name: skill.name,
      path: skill.path,
      category: "suspicious",
      hasSKILLMd: skill.hasSKILLMd,
      suspicionReason,
    };
  }

  let category: CheckCategory = "new";
  let duplicateKind: CheckedSkill["duplicateKind"];
  let canonicalName: string | undefined;
  if (managed.has(skill.name)) {
    category = "linked";
  } else {
    canonicalName = resolveCanonicalSkillName(skill.name, canonicalSkillNames);
    if (canonicalName) {
      category = canonicalName === skill.name ? "duplicate" : "matched";
      duplicateKind = canonicalName === skill.name ? "exact" : "family";
    }
  }

  if (category === "linked") {
    const parsed = parseSkillName(skill.name);
    canonicalName = canonicalSkillNames.get(parsed.baseName)?.name;
  }

  return {
    name: skill.name,
    path: skill.path,
    category,
    hasSKILLMd: skill.hasSKILLMd,
    duplicateKind,
    canonicalName,
  };
}

export function buildCentralCanonicalSkills(homeDir: string, centralSkillEntries: Awaited<ReturnType<typeof listSkills>>): Map<string, { name: string }> {
  return buildCanonicalSkillIndex(centralSkillEntries);
}

function getCanonicalProjectionPath(homeDir: string, skill: CheckedSkill): string {
  return getSkillPath(homeDir, skill.canonicalName ?? skill.name);
}

export async function relinkCheckedSkillToCentral(homeDir: string, skill: CheckedSkill): Promise<void> {
  await createSkillSymlink(getCanonicalProjectionPath(homeDir, skill), skill.path, {
    allowReplaceExisting: true,
  });
}

export async function runCheck(
  context: RuntimeContext,
  options: {
    scope: Scope;
    agents: string[];
    projectDir?: string;
    update?: boolean;
    verbose?: boolean;
  },
) {
  const lines: string[] = [];
  const centralSkillEntries = await listSkills(context.homeDir);
  const canonicalSkillNames = buildCentralCanonicalSkills(context.homeDir, centralSkillEntries);

  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);
  const updated: string[] = [];
  const skipped: string[] = [];
  let importedCount = 0;

  for (const agentId of agents) {
    const baseDir = options.scope === "global" ? context.homeDir : projectDir!;
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const managed = await listManagedSkillNames(skillsDir, getAweskillPaths(context.homeDir).skillsDir);
    const skills = await listSkillEntriesInDirectory(skillsDir);
    const checked = skills.map((skill) => classifyCheckedSkill(skill, managed, canonicalSkillNames));

    if (options.update) {
      for (const skill of checked) {
        if (skill.category === "linked") {
          continue;
        }

        if (skill.category === "suspicious") {
          const reason = skill.suspicionReason === "reserved-name"
            ? `reserved skill name in ${skill.path}`
            : `missing SKILL.md in ${skill.path}`;
          context.write(`Warning: Skipping ${agentId}:${skill.name}; ${reason}`);
          skipped.push(`${agentId}:${skill.name}`);
          continue;
        }

        if (skill.category === "new") {
          await importSkill({
            homeDir: context.homeDir,
            sourcePath: skill.path,
          });
          canonicalSkillNames.set(skill.name, { name: skill.name });
          importedCount += 1;
        }

        await relinkCheckedSkillToCentral(context.homeDir, skill);
        updated.push(`${agentId}:${skill.name}`);
      }
    }

    const title = options.scope === "global"
      ? `Global skills for ${agentId}:`
      : `Project skills for ${agentId} (${projectDir}):`;
    lines.push("");
    lines.push(...formatSkillBlockWithSummary(title, checked, options.verbose));
  }

  if (options.update) {
    lines.push("");
    lines.push(`Updated ${updated.length} skills`);
    if (importedCount > 0) {
      lines.push(`Imported ${importedCount} new skills into the central repo`);
    }
    if (skipped.length > 0) {
      lines.push(`Skipped ${skipped.length} entries: ${skipped.join(", ")}`);
    }
  }

  context.write(lines.join("\n").trim());
  return { agents, updated, importedCount, skipped };
}
