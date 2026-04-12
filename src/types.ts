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
export type ProjectionMode = "symlink" | "copy";
export type ImportMode = "mv" | "cp";
export type Scope = "global" | "project";

export interface BundleDefinition {
  name: string;
  skills: string[];
}

export interface AweskillPaths {
  homeDir: string;
  rootDir: string;
  skillsDir: string;
  dupSkillsDir: string;
  bundlesDir: string;
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
