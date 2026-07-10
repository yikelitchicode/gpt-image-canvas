import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import { requireManagedUser } from "../server/auth-context.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(moduleDir, "../..");
const repoRoot = resolve(packageRoot, "../..");

for (const envPath of [resolve(repoRoot, ".env"), resolve(packageRoot, ".env"), resolve(process.cwd(), ".env")]) {
  loadDotEnv({ path: envPath, quiet: true });
}

function parsePort(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "8787", 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    return 8787;
  }
  return parsed;
}

function resolveFromRepo(value: string): string {
  return isAbsolute(value) ? value : resolve(repoRoot, value);
}

function optionalEnvPath(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function defaultPromptPoolDir(): string {
  return resolve(repoRoot, "prompt-pool-data");
}

const sqliteJournalModes = ["DELETE", "TRUNCATE", "PERSIST", "MEMORY", "WAL", "OFF"] as const;
type SqliteJournalMode = (typeof sqliteJournalModes)[number];

const sqliteLockingModes = ["NORMAL", "EXCLUSIVE"] as const;
type SqliteLockingMode = (typeof sqliteLockingModes)[number];

function parseSqliteJournalMode(value: string | undefined): SqliteJournalMode {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return "WAL";
  }

  return sqliteJournalModes.includes(normalized as SqliteJournalMode) ? (normalized as SqliteJournalMode) : "WAL";
}

function parseSqliteLockingMode(value: string | undefined): SqliteLockingMode {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return "NORMAL";
  }

  return sqliteLockingModes.includes(normalized as SqliteLockingMode) ? (normalized as SqliteLockingMode) : "NORMAL";
}

const dataDir = resolveFromRepo(process.env.DATA_DIR ?? "./data");

export const runtimePaths = {
  repoRoot,
  packageRoot,
  dataDir,
  assetsDir: resolve(dataDir, "assets"),
  assetPreviewsDir: resolve(dataDir, "asset-previews"),
  databaseFile: resolve(dataDir, "gpt-image-canvas.sqlite"),
  projectSnapshotBackupsDir: resolve(dataDir, "project-snapshot-backups"),
  promptPoolDir: resolveFromRepo(optionalEnvPath(process.env.PROMPT_POOL_DIR) ?? defaultPromptPoolDir()),
  webDistDir: resolve(repoRoot, "apps/web/dist")
};

export interface ManagedRuntimePaths {
  dataDir: string;
  assetsDir: string;
  assetPreviewsDir: string;
  projectSnapshotBackupsDir: string;
}

export function getManagedRuntimePaths(): ManagedRuntimePaths {
  const userId = requireManagedUser().userId.replace(/[^a-zA-Z0-9_-]/gu, "_");
  const userDataDir = resolve(runtimePaths.dataDir, "users", userId);
  const paths = {
    dataDir: userDataDir,
    assetsDir: resolve(userDataDir, "assets"),
    assetPreviewsDir: resolve(userDataDir, "asset-previews"),
    projectSnapshotBackupsDir: resolve(userDataDir, "project-snapshot-backups")
  };
  mkdirSync(paths.assetsDir, { recursive: true });
  mkdirSync(paths.assetPreviewsDir, { recursive: true });
  mkdirSync(paths.projectSnapshotBackupsDir, { recursive: true });
  return paths;
}

export const serverConfig = {
  host: process.env.HOST ?? "127.0.0.1",
  port: parsePort(process.env.PORT)
};

export const sqliteConfig = {
  journalMode: parseSqliteJournalMode(process.env.SQLITE_JOURNAL_MODE),
  lockingMode: parseSqliteLockingMode(process.env.SQLITE_LOCKING_MODE)
};

export function ensureRuntimeStorage(): void {
  mkdirSync(runtimePaths.dataDir, { recursive: true });
  mkdirSync(runtimePaths.assetsDir, { recursive: true });
  mkdirSync(runtimePaths.assetPreviewsDir, { recursive: true });
  mkdirSync(runtimePaths.projectSnapshotBackupsDir, { recursive: true });
}
