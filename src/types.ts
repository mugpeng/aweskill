export type ActivationType = "bundle" | "skill";
export type ProjectionMode = "symlink" | "copy";
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
  backupDir: string;
  dedupBackupDir: string;
  fixSkillsBackupDir: string;
  bundlesDir: string;
}

export interface AgentDefinition {
  id: string;
  displayName: string;
  defaultProjectionMode: ProjectionMode;
  supportsGlobal: boolean;
  supportsProject: boolean;
  rootDir: (homeDir: string) => string;
  globalSkillsDir?: (homeDir: string) => string;
  projectSkillsDir?: (projectDir: string) => string;
}

export interface RuntimeContext {
  cwd: string;
  homeDir: string;
  write: (message: string) => void;
  writeRaw?: (message: string) => void;
  error: (message: string) => void;
}

export interface ScanCandidate {
  agentId: string;
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
  linkedSourcePath?: string;
}

export interface SkillEntry {
  name: string;
  path: string;
  hasSKILLMd: boolean;
}
