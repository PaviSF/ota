import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addChannel,
  addVersion,
  assignVersions,
  compareVersions,
  CONFIG_FILE,
  emptyConfig,
  loadConfig,
  parseConfig,
  removeChannel,
  removeVersion,
  renameChannel,
  saveConfig,
} from "../src/store";

const sample = () => {
  let cfg = emptyConfig();
  for (const v of ["1.0.1", "1.0.0", "1.10.0", "1.2.0"]) cfg = addVersion(cfg, v);
  cfg = addChannel(addChannel(cfg, "staging"), "production");
  cfg = assignVersions(cfg, "staging", ["1.0.1", "1.0.0"]);
  return assignVersions(cfg, "production", ["1.0.0"]);
};

describe("versions", () => {
  it("adds versions sorted semantically and rejects bad or duplicate ones", () => {
    const cfg = sample();
    expect(cfg.versions).toEqual(["1.0.0", "1.0.1", "1.2.0", "1.10.0"]);
    expect(() => addVersion(cfg, "1.0.0")).toThrow("already exists");
    expect(() => addVersion(cfg, "v1")).toThrow("not a version");
    expect(addVersion(cfg, " 2.0.0 ").versions).toContain("2.0.0");
  });

  it("orders pre-releases before the release", () => {
    expect(["1.0.0", "1.0.0-beta.2", "1.0.0-beta.10"].sort(compareVersions)).toEqual([
      "1.0.0-beta.2",
      "1.0.0-beta.10",
      "1.0.0",
    ]);
  });

  it("removing a version also removes its assignments", () => {
    const cfg = removeVersion(sample(), "1.0.0");
    expect(cfg.versions).not.toContain("1.0.0");
    expect(cfg.channels).toEqual({ staging: ["1.0.1"], production: [] });
  });
});

describe("channels", () => {
  it("adds, renames in place and removes channels", () => {
    let cfg = sample();
    expect(() => addChannel(cfg, "staging")).toThrow("already exists");
    expect(() => addChannel(cfg, "has space")).toThrow("not a valid channel");
    cfg = renameChannel(cfg, "staging", "preview");
    expect(Object.keys(cfg.channels)).toEqual(["preview", "production"]);
    expect(cfg.channels.preview).toEqual(["1.0.0", "1.0.1"]);
    expect(() => renameChannel(cfg, "preview", "production")).toThrow("already exists");
    expect(Object.keys(removeChannel(cfg, "preview").channels)).toEqual(["production"]);
  });

  it("only assigns versions that exist", () => {
    expect(() => assignVersions(sample(), "staging", ["9.9.9"])).toThrow("Unknown version");
    expect(() => assignVersions(sample(), "nope", [])).toThrow("does not exist");
  });
});

describe("file", () => {
  it("round-trips through .ota.json and returns null when missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ota-"));
    expect(loadConfig(dir)).toBeNull();
    saveConfig(dir, sample());
    expect(loadConfig(dir)).toEqual(sample());
    expect(fs.readdirSync(dir)).toEqual([CONFIG_FILE]);
  });

  it("rejects invalid files with a clear message", () => {
    expect(() => parseConfig("{")).toThrow("not valid JSON");
    expect(() => parseConfig('{"versions":["1.0.0"],"channels":{"s":["2.0.0"]}}')).toThrow(
      "Unknown version",
    );
    expect(parseConfig("{}")).toEqual(emptyConfig());
  });
});
