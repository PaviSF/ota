import fs from "node:fs";
import path from "node:path";

export const CONFIG_FILE = ".ota.json";

export interface OtaConfig {
  versions: string[];
  /** channel name -> versions assigned to it */
  channels: Record<string, string[]>;
}

export const emptyConfig = (): OtaConfig => ({ versions: [], channels: {} });

export const isEmptyConfig = (cfg: OtaConfig) =>
  cfg.versions.length === 0 && Object.keys(cfg.channels).length === 0;

const VERSION_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const CHANNEL_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function validateVersion(version: string): string | undefined {
  if (!VERSION_RE.test(version)) return `"${version}" is not a version like 1.0.0`;
}

export function validateChannelName(name: string): string | undefined {
  if (!CHANNEL_RE.test(name)) {
    return `"${name}" is not a valid channel name (letters, digits, . _ -)`;
  }
}

function parseVersion(version: string) {
  const dash = version.indexOf("-");
  const core = dash < 0 ? version : version.slice(0, dash);
  return { nums: core.split(".").map(Number), pre: dash < 0 ? "" : version.slice(dash + 1) };
}

export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (x.nums[i] !== y.nums[i]) return x.nums[i] - y.nums[i];
  }
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre.localeCompare(y.pre, undefined, { numeric: true });
}

const hasChannel = (cfg: OtaConfig, name: string) => Object.hasOwn(cfg.channels, name);

function fail(message: string | undefined): void {
  if (message) throw new Error(message);
}

export function addVersion(cfg: OtaConfig, raw: string): OtaConfig {
  const version = raw.trim();
  fail(validateVersion(version));
  if (cfg.versions.includes(version)) throw new Error(`Version ${version} already exists`);
  return { ...cfg, versions: [...cfg.versions, version].sort(compareVersions) };
}

/** Removes the version and drops it from every channel it was assigned to. */
export function removeVersion(cfg: OtaConfig, version: string): OtaConfig {
  return {
    versions: cfg.versions.filter((v) => v !== version),
    channels: Object.fromEntries(
      Object.entries(cfg.channels).map(([name, vs]) => [name, vs.filter((v) => v !== version)]),
    ),
  };
}

export function addChannel(cfg: OtaConfig, raw: string): OtaConfig {
  const name = raw.trim();
  fail(validateChannelName(name));
  if (hasChannel(cfg, name)) throw new Error(`Channel ${name} already exists`);
  return { ...cfg, channels: { ...cfg.channels, [name]: [] } };
}

export function renameChannel(cfg: OtaConfig, from: string, raw: string): OtaConfig {
  const to = raw.trim();
  fail(validateChannelName(to));
  if (!hasChannel(cfg, from)) throw new Error(`Channel ${from} does not exist`);
  if (to === from) return cfg;
  if (hasChannel(cfg, to)) throw new Error(`Channel ${to} already exists`);
  return {
    ...cfg,
    channels: Object.fromEntries(
      Object.entries(cfg.channels).map(([name, vs]) => [name === from ? to : name, vs]),
    ),
  };
}

export function removeChannel(cfg: OtaConfig, name: string): OtaConfig {
  const { [name]: _removed, ...rest } = cfg.channels;
  return { ...cfg, channels: rest };
}

export function assignVersions(cfg: OtaConfig, channel: string, versions: string[]): OtaConfig {
  if (!hasChannel(cfg, channel)) throw new Error(`Channel ${channel} does not exist`);
  const unknown = versions.filter((v) => !cfg.versions.includes(v));
  if (unknown.length) throw new Error(`Unknown version(s): ${unknown.join(", ")}`);
  return {
    ...cfg,
    channels: { ...cfg.channels, [channel]: [...new Set(versions)].sort(compareVersions) },
  };
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseConfig(text: string): OtaConfig {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${CONFIG_FILE} is not valid JSON`);
  }
  const bad = (why: string) => new Error(`${CONFIG_FILE}: ${why}`);
  if (!isObject(data)) throw bad("expected an object");
  const { versions = [], channels = {} } = data;
  if (!isStringArray(versions)) throw bad(`"versions" must be a list of strings`);
  if (!isObject(channels)) throw bad(`"channels" must be an object`);

  let cfg = emptyConfig();
  try {
    for (const v of versions) cfg = addVersion(cfg, v);
    for (const [name, assigned] of Object.entries(channels)) {
      if (!isStringArray(assigned)) throw new Error(`channel "${name}" must be a list of versions`);
      cfg = assignVersions(addChannel(cfg, name), name, assigned);
    }
  } catch (err) {
    throw bad((err as Error).message);
  }
  return cfg;
}

/** Returns null when the project has no config file yet. */
export function loadConfig(root: string): OtaConfig | null {
  let text: string;
  try {
    text = fs.readFileSync(path.join(root, CONFIG_FILE), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  return parseConfig(text);
}

export function saveConfig(root: string, cfg: OtaConfig): void {
  const file = path.join(root, CONFIG_FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + "\n");
  fs.renameSync(tmp, file);
}
