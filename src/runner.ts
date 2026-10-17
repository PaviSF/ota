import type { ChildProcess, SpawnOptions } from "node:child_process";
import spawn from "cross-spawn";
import type { OtaConfig } from "./store";

export const PLATFORMS = ["android", "ios"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** A single (channel, version, platform) the user can include or leave out of a push. */
export interface Target {
  channel: string;
  version: string;
  platform: Platform;
}

export interface Job {
  channel: string;
  version: string;
  platforms: Platform[];
}

export type JobStatus = "pending" | "running" | "done" | "failed";

export type SpawnFn = (command: string, args: string[], options: SpawnOptions) => ChildProcess;

export interface RunOptions {
  cwd: string;
  /** Stream eas output to the terminal instead of piping it to onOutput. */
  inherit?: boolean;
  onOutput?: (line: string) => void;
  onStatus?: (index: number, status: JobStatus) => void;
  spawnFn?: SpawnFn;
}

/** Every (channel, assigned version, platform), in the order the channels were given. */
export function buildTargets(
  cfg: OtaConfig,
  channels: string[],
  platforms: readonly Platform[] = PLATFORMS,
): Target[] {
  return channels.flatMap((channel) =>
    (cfg.channels[channel] ?? []).flatMap((version) =>
      platforms.map((platform) => ({ channel, version, platform })),
    ),
  );
}

export const targetKey = (t: Target) => `${t.channel}\0${t.version}\0${t.platform}`;

/** Merges targets into one job per (channel, version), keeping first-seen order. */
export function groupTargets(targets: Target[]): Job[] {
  const jobs = new Map<string, Job>();
  for (const { channel, version, platform } of targets) {
    const key = `${channel}\0${version}`;
    const job = jobs.get(key) ?? { channel, version, platforms: [] };
    if (!job.platforms.includes(platform)) job.platforms.push(platform);
    jobs.set(key, job);
  }
  for (const job of jobs.values()) job.platforms = PLATFORMS.filter((p) => job.platforms.includes(p));
  return [...jobs.values()];
}

/** One job per (channel, assigned version) covering the given platforms. */
export const buildJobs = (cfg: OtaConfig, channels: string[], platforms: readonly Platform[] = PLATFORMS) =>
  groupTargets(buildTargets(cfg, channels, platforms));

export const jobLabel = (job: Job) => `${job.channel} · ${job.version} · ${job.platforms.join("+")}`;

/** With every platform selected, -p is omitted so a single eas call covers all of them. */
export function easArgs(job: Job, message: string): string[] {
  if (job.platforms.length === 0) throw new Error("No platform selected");
  const args = ["update", "--channel", job.channel];
  if (job.platforms.length < PLATFORMS.length) args.push("-p", job.platforms[0]);
  args.push("-m", message, "--non-interactive");
  return args;
}

const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

function lineReader(emit: (line: string) => void) {
  let buffer = "";
  const out = (raw: string) => {
    const line = raw.replace(ANSI_RE, "").trimEnd();
    if (line) emit(line);
  };
  return {
    push(chunk: Buffer | string) {
      const parts = (buffer + chunk.toString()).split(/\r\n|\r|\n/);
      buffer = parts.pop() ?? "";
      parts.forEach(out);
    },
    flush() {
      out(buffer);
      buffer = "";
    },
  };
}

let current: ChildProcess | undefined;

/** Kills the eas process that is currently running, if any. */
export function killCurrent(): void {
  current?.kill();
}

/** Resolves with the exit code; a process that fails to start counts as code 1. */
export function runJob(job: Job, message: string, opts: RunOptions): Promise<number> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (code: number) => {
      if (settled) return;
      settled = true;
      current = undefined;
      stdout.flush();
      stderr.flush();
      resolve(code);
    };
    const emit = (line: string) => opts.onOutput?.(line);
    const stdout = lineReader(emit);
    const stderr = lineReader(emit);

    const child = (opts.spawnFn ?? spawn)("eas", easArgs(job, message), {
      cwd: opts.cwd,
      env: { ...process.env, APP_VERSION: job.version },
      stdio: opts.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    current = child;
    child.stdout?.on("data", (chunk) => stdout.push(chunk));
    child.stderr?.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (err) => {
      emit(`Failed to start eas: ${err.message}`);
      settle(1);
    });
    child.on("close", (code) => settle(code ?? 1));
  });
}

/** Runs jobs one after another and stops at the first failure. Returns true if all succeeded. */
export async function runJobs(jobs: Job[], message: string, opts: RunOptions): Promise<boolean> {
  for (const [i, job] of jobs.entries()) {
    opts.onStatus?.(i, "running");
    const code = await runJob(job, message, opts);
    if (code !== 0) {
      opts.onStatus?.(i, "failed");
      return false;
    }
    opts.onStatus?.(i, "done");
  }
  return true;
}
