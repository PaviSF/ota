import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { App } from "../src/app";
import { loadConfig } from "../src/store";

const tick = () => new Promise((r) => setTimeout(r, 30));
const ENTER = "\r";
const DOWN = "\u001B[B";

async function type(stdin: { write: (s: string) => void }, ...keys: string[]) {
  for (const key of keys) {
    stdin.write(key);
    await tick();
  }
}

const tmpProject = () => fs.mkdtempSync(path.join(os.tmpdir(), "ota-app-"));

describe("App", () => {
  it("walks through first-run setup and saves .ota.json", async () => {
    const root = tmpProject();
    const { stdin, lastFrame } = render(<App root={root} initialConfig={null} defaultMessage="" />);
    await tick();
    expect(lastFrame()).toContain("Set it up now?");

    await type(stdin, "y", "1.0.0", ENTER, "1.0.1", ENTER);
    expect(lastFrame()).toContain("added: 1.0.0, 1.0.1");
    await type(stdin, ENTER, "staging", ENTER, ENTER);
    expect(lastFrame()).toContain("Versions for staging");

    await type(stdin, " ", DOWN, " ", ENTER);
    expect(lastFrame()).toContain("Push update");
    expect(lastFrame()).toContain("staging → 1.0.0, 1.0.1");
    expect(loadConfig(root)).toEqual({
      versions: ["1.0.0", "1.0.1"],
      channels: { staging: ["1.0.0", "1.0.1"] },
    });
  });

  it("previews one combined job per version when everything stays ticked", async () => {
    const cfg = { versions: ["1.0.0", "1.0.1"], channels: { staging: ["1.0.0", "1.0.1"] } };
    const { stdin, lastFrame } = render(
      <App root={tmpProject()} initialConfig={cfg} defaultMessage="fix crash" />,
    );
    await tick();

    // Push update → toggle staging → keep message → keep every target ticked
    await type(stdin, ENTER, " ", ENTER, ENTER, ENTER);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("2 updates will run");
    expect(frame).toContain("staging · 1.0.0 · android+ios");
    expect(frame).toContain("staging · 1.0.1 · android+ios");
    expect(frame).toContain("message: fix crash");
  });

  it("opens straight on the push screen for `ota push`", async () => {
    const cfg = { versions: ["1.3.3"], channels: { staging: ["1.3.3"] } };
    const { lastFrame } = render(
      <App root={tmpProject()} initialConfig={cfg} defaultMessage="m" start="push" />,
    );
    await tick();
    expect(lastFrame()).toContain("Select channels");
  });

  it("lets you untick a platform for one version at the last step", async () => {
    const root = tmpProject();
    const cfg = { versions: ["1.3.3", "1.3.4"], channels: { staging: ["1.3.3", "1.3.4"] } };
    const { stdin, lastFrame } = render(
      <App root={root} initialConfig={cfg} defaultMessage="m" start="push" />,
    );
    await tick();
    // toggle staging → keep message → checklist
    await type(stdin, " ", ENTER, ENTER);
    expect(lastFrame()).toContain("Pick what to push");
    expect(lastFrame()).toContain("[x] staging · 1.3.3 · android");
    // untick the first row (1.3.3 · android) and confirm
    await type(stdin, " ", ENTER);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("2 updates will run");
    expect(frame).toContain("staging · 1.3.3 · ios");
    expect(frame).toContain("staging · 1.3.4 · android+ios");
    // nothing about the choice is saved
    expect(fs.existsSync(path.join(root, ".ota.json"))).toBe(false);
  });

  it("offers to assign versions when a selected channel has none", async () => {
    const root = tmpProject();
    const cfg = { versions: ["1.0.0"], channels: { staging: [] } };
    const { stdin, lastFrame } = render(<App root={root} initialConfig={cfg} defaultMessage="m" />);
    await tick();

    await type(stdin, ENTER, " ", ENTER);
    expect(lastFrame()).toContain("staging has no versions. Assign versions now?");
    await type(stdin, "y", " ", ENTER);
    expect(lastFrame()).toContain("Message");
    expect(loadConfig(root)?.channels.staging).toEqual(["1.0.0"]);
  });
});
