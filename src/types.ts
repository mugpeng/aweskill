export type AgentId = "claude-code" | "codex" | "cursor";
export type ActivationType = "bundle" | "skill";
export type MatchType = "exact" | "prefix" | "glob";
export type ProjectionMode = "symlink" | "copy";
export type ImportMode = "symlink" | "mv" | "cp";
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
}

export interface AgentDefinition {
  id: AgentId;
  displayName: string;
  defaultProjectionMode: ProjectionMode;
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
}

export interface StatusSnapshot {
  scope: Scope;
  projectDir?: string;
  projections: ProjectionSpec[];
  warnings: string[];
}
