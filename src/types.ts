export type AgentId =
  | "amp"
  | "claude-code"
  | "cline"
  | "codex"
  | "cursor"
  | "gemini-cli"
  | "goose"
  | "opencode"
  | "roo"
  | "windsurf";
export type ActivationType = "bundle" | "skill";
export type MatchType = "exact" | "prefix" | "glob";
export type ProjectionMode = "symlink" | "copy";
export type ImportMode = "mv" | "cp";
export type Scope = "global" | "project";
export interface ActivationBase {
  type: ActivationType;
  name: string;
  agents: AgentId[];
}

export interface GlobalActivation extends ActivationBase {
  scope: "global";
}

export interface ProjectActivation extends ActivationBase {
  scope?: never;
}

export type Activation = GlobalActivation | ProjectActivation;

export interface ProjectRule {
  path: string;
  match: MatchType;
  activations: ProjectActivation[];
}

export interface GlobalConfig {
  version: 1;
  activations: GlobalActivation[];
  projects: ProjectRule[];
}

export interface ProjectConfig {
  version: 1;
  activations: ProjectActivation[];
}

export interface BundleDefinition {
  name: string;
  skills: string[];
}

export interface AweskillPaths {
  homeDir: string;
  rootDir: string;
  skillsDir: string;
  bundlesDir: string;
  globalConfigPath: string;
  registryDir: string;
}

export interface AgentDefinition {
  id: AgentId;
  displayName: string;
  defaultProjectionMode: ProjectionMode;
  rootDir: (homeDir: string) => string;
  globalSkillsDir: (homeDir: string) => string;
  projectSkillsDir: (projectDir: string) => string;
}

export interface RuntimeContext {
  cwd: string;
  homeDir: string;
  write: (message: string) => void;
  error: (message: string) => void;
}

export interface ProjectionSpec {
  agentId: AgentId;
  skillName: string;
  sourcePath: string;
  targetPath: string;
  scope: Scope;
  projectDir?: string;
  mode: ProjectionMode;
  locationDir: string;
}

export interface ReconcileChange {
  action: "create" | "remove" | "skip";
  path: string;
  detail: string;
}

export interface ReconcileResult {
  changes: ReconcileChange[];
  warnings: string[];
}

export interface ScanCandidate {
  agentId: AgentId;
  name: string;
  path: string;
  scope: Scope;
  projectDir?: string;
  isSymlink: boolean;
  symlinkSourcePath?: string;
  isBrokenSymlink?: boolean;
}

export interface ImportResult {
  name: string;
  destination: string;
  warnings: string[];
}

export interface SkillEntry {
  name: string;
  path: string;
  hasSKILLMd: boolean;
}

export interface StatusSnapshot {
  scope: Scope;
  projectDir?: string;
  projections: ProjectionSpec[];
  warnings: string[];
}

export interface RegistrySkillEntry {
  name: string;
  scope: Scope;
  projectDir?: string;
  sourcePath: string;
  managedByAweskill: boolean;
}

export interface RegistryData {
  version: 2;
  agentId: AgentId;
  lastSynced: string;
  skills: RegistrySkillEntry[];
}
