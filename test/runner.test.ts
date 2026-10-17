import type { ChildProcess, SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { buildJobs, buildTargets, easArgs, groupTargets, runJobs, type JobStatus, type SpawnFn } from "../src/runner";
import type { OtaConfig } from "../src/store";

const cfg: OtaConfig = {
  versions: ["1.0.0", "1.0.1"],
  channels: { staging: ["1.0.0", "1.0.1"], production: ["1.0.0"] },
};

interface Call {
  args: string[];
  options: SpawnOptions;
}

/** Fake spawn whose processes print a line and exit with the next code from `codes`. */
function fakeSpawn(codes: number[]) {
  const calls: Call[] = [];
  const spawnFn: SpawnFn = (_cmd, args, options) => {
    calls.push({ args, options });
    const child = new EventEmitter() as ChildProcess;
    const stdout = new PassThrough();
    Object.assign(child, { stdout, stderr: new PassThrough() });
    const code = codes.shift() ?? 0;
    setImmediate(() => {
      stdout.write(`\x1b[32mout ${args[2]}\x1b[0m\r\nprogress`);
      setImmediate(() => child.emit("close", code));
    });
    return child;
  };
  return { calls, spawnFn };
}

describe("buildJobs", () => {
  it("makes one job per channel and assigned version, in order", () => {
    const jobs = buildJobs(cfg, ["production", "staging"], ["android", "ios"]);
    expect(jobs.map((j) => `${j.channel}@${j.version}`)).toEqual([
      "production@1.0.0",
      "staging@1.0.0",
      "staging@1.0.1",
    ]);
  });
});

describe("groupTargets", () => {
  it("merges the ticked platforms of each version into one job", () => {
    // Leave android out for 1.0.0 only.
    const targets = buildTargets(cfg, ["staging"]).filter(
      (t) => !(t.version === "1.0.0" && t.platform === "android"),
    );
    const jobs = groupTargets(targets);
    expect(jobs).toEqual([
      { channel: "staging", version: "1.0.0", platforms: ["ios"] },
      { channel: "staging", version: "1.0.1", platforms: ["android", "ios"] },
    ]);
    expect(easArgs(jobs[0], "m")).toEqual(expect.arrayContaining(["-p", "ios"]));
    expect(easArgs(jobs[1], "m")).not.toContain("-p");
  });
});

describe("easArgs", () => {
  const job = { channel: "staging", version: "1.0.0" };

  it("omits -p when both platforms are selected", () => {
    expect(easArgs({ ...job, platforms: ["android", "ios"] }, 'fix "quotes" & $HOME')).toEqual([
      "update",
      "--channel",
      "staging",
      "-m",
      'fix "quotes" & $HOME',
      "--non-interactive",
    ]);
  });

  it("passes -p for a single platform", () => {
    expect(easArgs({ ...job, platforms: ["ios"] }, "m")).toEqual(
      expect.arrayContaining(["-p", "ios"]),
    );
    expect(() => easArgs({ ...job, platforms: [] }, "m")).toThrow();
  });
});

describe("runJobs", () => {
  it("runs sequentially with APP_VERSION set and streams clean lines", async () => {
    const { calls, spawnFn } = fakeSpawn([0, 0]);
    const lines: string[] = [];
    const jobs = buildJobs(cfg, ["staging"], ["android", "ios"]);
    const ok = await runJobs(jobs, "msg", { cwd: "/proj", spawnFn, onOutput: (l) => lines.push(l) });

    expect(ok).toBe(true);
    expect(calls.map((c) => c.options.env?.APP_VERSION)).toEqual(["1.0.0", "1.0.1"]);
    expect(calls.every((c) => c.options.cwd === "/proj")).toBe(true);
    expect(lines).toEqual(["out staging", "progress", "out staging", "progress"]);
  });

  it("stops at the first failure", async () => {
    const { calls, spawnFn } = fakeSpawn([0, 1, 0]);
    const statuses: [number, JobStatus][] = [];
    const jobs = buildJobs(cfg, ["staging", "production"], ["android"]);
    const ok = await runJobs(jobs, "msg", {
      cwd: "/proj",
      spawnFn,
      onStatus: (i, s) => statuses.push([i, s]),
    });

    expect(ok).toBe(false);
    expect(calls).toHaveLength(2);
    expect(statuses).toEqual([
      [0, "running"],
      [0, "done"],
      [1, "running"],
      [1, "failed"],
    ]);
  });
});
