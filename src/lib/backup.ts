import { gunzipSync, gzipSync } from "node:zlib";
import { cp, mkdtemp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { pathExists } from "./fs.js";
import { scanStoreHygiene } from "./hygiene.js";
import { getAweskillPaths } from "./path.js";

const TAR_BLOCK_SIZE = 512;
const BACKUP_MANIFEST_FILE = "backup.json";
const BACKUP_FORMAT = "aweskill-backup";
const BACKUP_VERSION = 1;

interface TarEntry {
  name: string;
  type: "file" | "directory";
  mode: number;
  data?: Buffer;
}

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  includesBundles: boolean;
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

function formatBackupLabel(includeBundles: boolean): string {
  return includeBundles ? "skills and bundles" : "skills";
}

function createBackupManifest(includeBundles: boolean): BackupManifest {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    includesBundles: includeBundles,
  };
}

function normalizeTarPath(entryPath: string): string {
  return entryPath.split(path.sep).join("/");
}

function encodeOctal(value: number, length: number): Buffer {
  const encoded = value.toString(8).padStart(length - 1, "0");
  return Buffer.from(`${encoded}\0`, "ascii");
}

function writeString(field: Buffer, value: string): void {
  field.fill(0);
  field.write(value, 0, Math.min(Buffer.byteLength(value, "utf8"), field.length), "utf8");
}

function splitTarName(name: string): { name: string; prefix: string } {
  if (Buffer.byteLength(name, "utf8") <= 100) {
    return { name, prefix: "" };
  }

  const parts = name.split("/");
  while (parts.length > 1) {
    const candidatePrefix = parts.slice(0, -1).join("/");
    const candidateName = parts[parts.length - 1] ?? "";
    if (Buffer.byteLength(candidateName, "utf8") <= 100 && Buffer.byteLength(candidatePrefix, "utf8") <= 155) {
      return { name: candidateName, prefix: candidatePrefix };
    }
    parts.shift();
  }

  throw new Error(`Path is too long for tar header: ${name}`);
}

function createTarHeader(entry: TarEntry): Buffer {
  const header = Buffer.alloc(TAR_BLOCK_SIZE, 0);
  const entryName = entry.type === "directory" && !entry.name.endsWith("/") ? `${entry.name}/` : entry.name;
  const { name, prefix } = splitTarName(entryName);

  writeString(header.subarray(0, 100), name);
  encodeOctal(entry.mode, 8).copy(header, 100);
  encodeOctal(0, 8).copy(header, 108);
  encodeOctal(0, 8).copy(header, 116);
  encodeOctal(entry.type === "file" ? (entry.data?.length ?? 0) : 0, 12).copy(header, 124);
  encodeOctal(Math.floor(Date.now() / 1000), 12).copy(header, 136);
  header.fill(0x20, 148, 156);
  header[156] = entry.type === "directory" ? "5".charCodeAt(0) : "0".charCodeAt(0);
  writeString(header.subarray(257, 263), "ustar");
  writeString(header.subarray(263, 265), "00");
  writeString(header.subarray(345, 500), prefix);

  let checksum = 0;
  for (const byte of header) {
    checksum += byte;
  }
  Buffer.from(checksum.toString(8).padStart(6, "0") + "\0 ", "ascii").copy(header, 148);
  return header;
}

function buildTarArchive(entries: TarEntry[]): Buffer {
  const chunks: Buffer[] = [];

  for (const entry of entries) {
    chunks.push(createTarHeader(entry));
    if (entry.type === "file") {
      const data = entry.data ?? Buffer.alloc(0);
      chunks.push(data);
      const remainder = data.length % TAR_BLOCK_SIZE;
      if (remainder !== 0) {
        chunks.push(Buffer.alloc(TAR_BLOCK_SIZE - remainder, 0));
      }
    }
  }

  chunks.push(Buffer.alloc(TAR_BLOCK_SIZE * 2, 0));
  return Buffer.concat(chunks);
}

function isZeroBlock(block: Buffer): boolean {
  for (const byte of block) {
    if (byte !== 0) {
      return false;
    }
  }
  return true;
}

function readTarString(block: Buffer, start: number, end: number): string {
  const value = block.subarray(start, end).toString("utf8");
  return value.replace(/\0.*$/, "");
}

function readTarNumber(block: Buffer, start: number, end: number): number {
  const value = readTarString(block, start, end).trim();
  return value === "" ? 0 : Number.parseInt(value, 8);
}

function safeExtractPath(baseDir: string, entryName: string): string {
  const normalized = entryName.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`Archive contains unsafe path: ${entryName}`);
  }
  return path.join(baseDir, ...normalized.split("/").filter(Boolean));
}

async function extractTarArchive(buffer: Buffer, destinationDir: string): Promise<void> {
  let offset = 0;

  while (offset + TAR_BLOCK_SIZE <= buffer.length) {
    const header = buffer.subarray(offset, offset + TAR_BLOCK_SIZE);
    offset += TAR_BLOCK_SIZE;

    if (isZeroBlock(header)) {
      break;
    }

    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 500);
    const entryName = prefix ? `${prefix}/${name}` : name;
    const typeFlag = String.fromCharCode(header[156] || "0".charCodeAt(0));
    const size = readTarNumber(header, 124, 136);
    const outputPath = safeExtractPath(destinationDir, entryName);

    if (typeFlag === "5") {
      await mkdir(outputPath, { recursive: true });
      continue;
    }

    const fileData = buffer.subarray(offset, offset + size);
    offset += Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, fileData);
  }
}

async function collectTarEntries(rootDir: string, relativeDir: string): Promise<TarEntry[]> {
  const entries: TarEntry[] = [
    {
      name: normalizeTarPath(relativeDir),
      type: "directory",
      mode: 0o755,
    },
  ];
  const absoluteDir = path.join(rootDir, relativeDir);
  const directoryEntries = await readdir(absoluteDir, { withFileTypes: true });

  for (const entry of directoryEntries) {
    const absolutePath = path.join(absoluteDir, entry.name);
    const archivePath = normalizeTarPath(path.join(relativeDir, entry.name));
    if (entry.isDirectory()) {
      entries.push(...await collectTarEntries(rootDir, path.join(relativeDir, entry.name)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const entryStats = await stat(absolutePath);
    entries.push({
      name: archivePath,
      type: "file",
      mode: entryStats.mode & 0o777,
      data: await readFile(absolutePath),
    });
  }

  return entries;
}

async function collectTarEntriesForFile(rootDir: string, relativeFilePath: string): Promise<TarEntry[]> {
  const absolutePath = path.join(rootDir, relativeFilePath);
  const entryStats = await stat(absolutePath);
  return [{
    name: normalizeTarPath(relativeFilePath),
    type: "file",
    mode: entryStats.mode & 0o777,
    data: await readFile(absolutePath),
  }];
}

async function archiveEntries(homeDir: string, includeBundles: boolean): Promise<TarEntry[]> {
  const { rootDir, skillsDir, bundlesDir } = getAweskillPaths(homeDir);
  const entries: TarEntry[] = [{
    name: BACKUP_MANIFEST_FILE,
    type: "file",
    mode: 0o644,
    data: Buffer.from(`${JSON.stringify(createBackupManifest(includeBundles), null, 2)}\n`, "utf8"),
  }];
  const hygiene = await scanStoreHygiene({ rootDir, skillsDir, bundlesDir, includeBundles });

  if (hygiene.validSkills.length > 0) {
    entries.push({ name: "skills", type: "directory", mode: 0o755 });
    for (const skill of hygiene.validSkills) {
      entries.push(...await collectTarEntries(rootDir, path.relative(rootDir, skill.path)));
    }
  }

  if (includeBundles && hygiene.validBundles.length > 0) {
    entries.push({ name: "bundles", type: "directory", mode: 0o755 });
    for (const bundle of hygiene.validBundles) {
      entries.push(...await collectTarEntriesForFile(rootDir, path.join("bundles", `${bundle.name}.yaml`)));
    }
  }

  return entries;
}

export async function createSkillsBackupArchive(
  homeDir: string,
  options: {
    archivePath?: string;
    includeBundles?: boolean;
  } = {},
): Promise<string> {
  const { backupDir } = getAweskillPaths(homeDir);
  const includeBundles = options.includeBundles ?? false;
  const archivePath = await resolveBackupArchivePath(backupDir, options.archivePath);

  await mkdir(path.dirname(archivePath), { recursive: true });

  const tarArchive = buildTarArchive(await archiveEntries(homeDir, includeBundles));
  await writeFile(archivePath, gzipSync(tarArchive));
  return archivePath;
}

export async function extractSkillsArchive(archivePath: string): Promise<{
  tempDir: string;
  extractedSkillsDir: string;
  extractedBundlesDir: string;
  manifest?: BackupManifest;
}> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "aweskill-restore-"));
  const sourceStats = await stat(archivePath);

  if (sourceStats.isDirectory()) {
    const sourceSkillsDir = path.join(archivePath, "skills");
    const sourceBundlesDir = path.join(archivePath, "bundles");
    const sourceManifestPath = path.join(archivePath, BACKUP_MANIFEST_FILE);
    if (!(await pathExists(sourceSkillsDir))) {
      throw new Error(`Restore source does not contain a skills/ directory: ${archivePath}`);
    }

    await cp(sourceSkillsDir, path.join(tempDir, "skills"), { recursive: true });
    if (await pathExists(sourceBundlesDir)) {
      await cp(sourceBundlesDir, path.join(tempDir, "bundles"), { recursive: true });
    }
    if (await pathExists(sourceManifestPath)) {
      await cp(sourceManifestPath, path.join(tempDir, BACKUP_MANIFEST_FILE));
    }
  } else {
    const archiveBuffer = await readFile(archivePath);
    await extractTarArchive(gunzipSync(archiveBuffer), tempDir);
  }

  const manifest = await readBackupManifest(tempDir);

  return {
    tempDir,
    extractedSkillsDir: path.join(tempDir, "skills"),
    extractedBundlesDir: path.join(tempDir, "bundles"),
    manifest,
  };
}

export { formatBackupLabel };

async function readBackupManifest(rootDir: string): Promise<BackupManifest | undefined> {
  const manifestPath = path.join(rootDir, BACKUP_MANIFEST_FILE);
  if (!(await pathExists(manifestPath))) {
    return undefined;
  }

  const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as Partial<BackupManifest>;
  if (parsed.format !== BACKUP_FORMAT) {
    throw new Error(`Unsupported backup manifest format in ${manifestPath}: ${String(parsed.format)}`);
  }
  if (parsed.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup manifest version in ${manifestPath}: ${String(parsed.version)}`);
  }
  if (typeof parsed.createdAt !== "string" || typeof parsed.includesBundles !== "boolean") {
    throw new Error(`Invalid backup manifest in ${manifestPath}`);
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: parsed.createdAt,
    includesBundles: parsed.includesBundles,
  };
}

async function resolveBackupArchivePath(backupDir: string, requestedPath?: string): Promise<string> {
  if (!requestedPath) {
    return nextBackupArchivePath(backupDir);
  }

  try {
    const requestedStats = await stat(requestedPath);
    if (requestedStats.isDirectory()) {
      return nextBackupArchivePath(requestedPath);
    }
  } catch {
    // Treat missing paths as explicit archive filenames and let writeFile surface other filesystem errors.
  }

  return requestedPath;
}

async function nextBackupArchivePath(backupDir: string): Promise<string> {
  const base = `skills-${formatTimestamp(new Date())}`;
  const primary = path.join(backupDir, `${base}.tar.gz`);
  if (!(await pathExists(primary))) {
    return primary;
  }

  let index = 1;
  while (true) {
    const candidate = path.join(backupDir, `${base}-${index}.tar.gz`);
    if (!(await pathExists(candidate))) {
      return candidate;
    }
    index += 1;
  }
}
