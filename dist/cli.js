#!/usr/bin/env node

// src/cli.tsx
import { createRequire } from "module";
import { render } from "ink";

// src/app.tsx
import os from "os";
import path2 from "path";
import { Box as Box12, Text as Text13, useApp } from "ink";
import { useCallback, useRef, useState as useState11 } from "react";

// src/components/Confirm.tsx
import { Text, useInput } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
function Confirm({ message, defaultYes = true, onAnswer, onCancel }) {
  useInput((input, key) => {
    const k = input.toLowerCase();
    if (k === "y") onAnswer(true);
    else if (k === "n") onAnswer(false);
    else if (key.return) onAnswer(defaultYes);
    else if (key.escape) (onCancel ?? (() => onAnswer(false)))();
  });
  return /* @__PURE__ */ jsxs(Text, { children: [
    message,
    " ",
    /* @__PURE__ */ jsx(Text, { dimColor: true, children: defaultYes ? "(Y/n)" : "(y/N)" })
  ] });
}

// src/screens/Assign.tsx
import { Box as Box5, Text as Text6 } from "ink";
import { useState as useState5 } from "react";

// src/components/AssignVersions.tsx
import { Box as Box3, Text as Text4 } from "ink";
import { useState as useState3 } from "react";

// src/store.ts
import fs from "fs";
import path from "path";
var CONFIG_FILE = ".ota.json";
var emptyConfig = () => ({ versions: [], channels: {} });
var isEmptyConfig = (cfg) => cfg.versions.length === 0 && Object.keys(cfg.channels).length === 0;
var VERSION_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
var CHANNEL_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function validateVersion(version) {
  if (!VERSION_RE.test(version)) return `"${version}" is not a version like 1.0.0`;
}
function validateChannelName(name) {
  if (!CHANNEL_RE.test(name)) {
    return `"${name}" is not a valid channel name (letters, digits, . _ -)`;
  }
}
function parseVersion(version) {
  const dash = version.indexOf("-");
  const core = dash < 0 ? version : version.slice(0, dash);
  return { nums: core.split(".").map(Number), pre: dash < 0 ? "" : version.slice(dash + 1) };
}
function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (x.nums[i] !== y.nums[i]) return x.nums[i] - y.nums[i];
  }
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre.localeCompare(y.pre, void 0, { numeric: true });
}
var hasChannel = (cfg, name) => Object.hasOwn(cfg.channels, name);
function fail(message) {
  if (message) throw new Error(message);
}
function addVersion(cfg, raw) {
  const version = raw.trim();
  fail(validateVersion(version));
  if (cfg.versions.includes(version)) throw new Error(`Version ${version} already exists`);
  return { ...cfg, versions: [...cfg.versions, version].sort(compareVersions) };
}
function removeVersion(cfg, version) {
  return {
    versions: cfg.versions.filter((v) => v !== version),
    channels: Object.fromEntries(
      Object.entries(cfg.channels).map(([name, vs]) => [name, vs.filter((v) => v !== version)])
    )
  };
}
function addChannel(cfg, raw) {
  const name = raw.trim();
  fail(validateChannelName(name));
  if (hasChannel(cfg, name)) throw new Error(`Channel ${name} already exists`);
  return { ...cfg, channels: { ...cfg.channels, [name]: [] } };
}
function renameChannel(cfg, from, raw) {
  const to = raw.trim();
  fail(validateChannelName(to));
  if (!hasChannel(cfg, from)) throw new Error(`Channel ${from} does not exist`);
  if (to === from) return cfg;
  if (hasChannel(cfg, to)) throw new Error(`Channel ${to} already exists`);
  return {
    ...cfg,
    channels: Object.fromEntries(
      Object.entries(cfg.channels).map(([name, vs]) => [name === from ? to : name, vs])
    )
  };
}
function removeChannel(cfg, name) {
  const { [name]: _removed, ...rest } = cfg.channels;
  return { ...cfg, channels: rest };
}
function assignVersions(cfg, channel, versions) {
  if (!hasChannel(cfg, channel)) throw new Error(`Channel ${channel} does not exist`);
  const unknown = versions.filter((v) => !cfg.versions.includes(v));
  if (unknown.length) throw new Error(`Unknown version(s): ${unknown.join(", ")}`);
  return {
    ...cfg,
    channels: { ...cfg.channels, [channel]: [...new Set(versions)].sort(compareVersions) }
  };
}
var isStringArray = (value) => Array.isArray(value) && value.every((v) => typeof v === "string");
var isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function parseConfig(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${CONFIG_FILE} is not valid JSON`);
  }
  const bad = (why) => new Error(`${CONFIG_FILE}: ${why}`);
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
    throw bad(err.message);
  }
  return cfg;
}
function loadConfig(root) {
  let text;
  try {
    text = fs.readFileSync(path.join(root, CONFIG_FILE), "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  return parseConfig(text);
}
function saveConfig(root, cfg) {
  const file = path.join(root, CONFIG_FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

// src/components/TextPrompt.tsx
import { Box, Text as Text2, useInput as useInput2 } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function TextPrompt({ label, initial = "", hint, onSubmit, onCancel }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState();
  useInput2((_, key) => {
    if (key.escape) onCancel?.();
  });
  return /* @__PURE__ */ jsxs2(Box, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs2(Box, { children: [
      /* @__PURE__ */ jsxs2(Text2, { children: [
        label,
        ": "
      ] }),
      /* @__PURE__ */ jsx2(
        TextInput,
        {
          value,
          onChange: setValue,
          onSubmit: (v) => setError(onSubmit(v) || void 0)
        }
      )
    ] }),
    error && /* @__PURE__ */ jsx2(Text2, { color: "red", children: error }),
    /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: hint ?? "enter confirm \xB7 esc back" })
  ] });
}

// src/components/AddVersion.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function AddVersion({ update, hint, onAdded, onEmpty, onCancel }) {
  return /* @__PURE__ */ jsx3(
    TextPrompt,
    {
      label: "Add a version",
      hint: hint ?? "e.g. 1.2.0 \xB7 enter add \xB7 esc back",
      onSubmit: (raw) => {
        const version = raw.trim();
        if (!version) return (onEmpty ?? onCancel)();
        const err = update((c) => addVersion(c, version));
        if (err) return err;
        onAdded(version);
      },
      onCancel
    }
  );
}

// src/components/MultiSelect.tsx
import { Box as Box2, Text as Text3, useInput as useInput3 } from "ink";
import { useState as useState2 } from "react";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function MultiSelect({ items, initial = [], onSubmit, onCancel }) {
  const [index, setIndex] = useState2(0);
  const [selected, setSelected] = useState2(() => new Set(initial));
  const [error, setError] = useState2();
  const toggle = (value) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
  };
  useInput3((input, key) => {
    if (key.upArrow || input === "k") setIndex((index - 1 + items.length) % items.length);
    else if (key.downArrow || input === "j") setIndex((index + 1) % items.length);
    else if (input === " ") toggle(items[index].value);
    else if (input === "a") {
      const all = items.every((i) => selected.has(i.value));
      setSelected(new Set(all ? [] : items.map((i) => i.value)));
    } else if (key.return) {
      const err = onSubmit(items.filter((i) => selected.has(i.value)).map((i) => i.value));
      setError(err || void 0);
    } else if (key.escape) onCancel?.();
  });
  return /* @__PURE__ */ jsxs3(Box2, { flexDirection: "column", children: [
    items.map((item, i) => /* @__PURE__ */ jsxs3(Text3, { color: i === index ? "cyan" : void 0, children: [
      i === index ? "\u276F " : "  ",
      selected.has(item.value) ? "[x] " : "[ ] ",
      item.label,
      item.hint && /* @__PURE__ */ jsx4(Text3, { dimColor: true, children: `  ${item.hint}` })
    ] }, i)),
    error && /* @__PURE__ */ jsx4(Text3, { color: "red", children: error }),
    /* @__PURE__ */ jsx4(Text3, { dimColor: true, children: "space toggle \xB7 a all \xB7 enter confirm \xB7 esc back" })
  ] });
}

// src/components/AssignVersions.tsx
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function AssignVersions({ cfg, update, channel, onDone, onCancel }) {
  const [addKey, setAddKey] = useState3(0);
  if (cfg.versions.length === 0) {
    return /* @__PURE__ */ jsxs4(Box3, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs4(Text4, { color: "yellow", children: [
        "No versions yet. Add one to assign it to ",
        channel,
        "."
      ] }),
      /* @__PURE__ */ jsx5(
        AddVersion,
        {
          update,
          onAdded: () => setAddKey(addKey + 1),
          onCancel
        },
        addKey
      )
    ] });
  }
  return /* @__PURE__ */ jsxs4(Box3, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs4(Text4, { bold: true, children: [
      "Versions for ",
      channel
    ] }),
    /* @__PURE__ */ jsx5(
      MultiSelect,
      {
        items: cfg.versions.map((v) => ({ label: v, value: v })),
        initial: cfg.channels[channel] ?? [],
        onSubmit: (versions) => {
          const err = update((c) => assignVersions(c, channel, versions));
          if (err) return err;
          onDone(versions);
        },
        onCancel
      }
    )
  ] });
}

// src/components/Select.tsx
import { Box as Box4, Text as Text5, useInput as useInput4 } from "ink";
import { useState as useState4 } from "react";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function Select({ items, onSelect, onCancel }) {
  const [cursor, setCursor] = useState4(0);
  const index = Math.min(cursor, items.length - 1);
  useInput4((input, key) => {
    if (key.upArrow || input === "k") setCursor((index - 1 + items.length) % items.length);
    else if (key.downArrow || input === "j") setCursor((index + 1) % items.length);
    else if (key.return) onSelect(items[index].value);
    else if (key.escape) onCancel?.();
  });
  return /* @__PURE__ */ jsx6(Box4, { flexDirection: "column", children: items.map((item, i) => /* @__PURE__ */ jsxs5(Text5, { color: i === index ? "cyan" : void 0, children: [
    i === index ? "\u276F " : "  ",
    item.label,
    item.hint && /* @__PURE__ */ jsx6(Text5, { dimColor: true, children: `  ${item.hint}` })
  ] }, i)) });
}

// src/types.ts
function versionsHint(cfg, channel) {
  const versions = cfg.channels[channel];
  return versions?.length ? `\u2192 ${versions.join(", ")}` : "(no versions)";
}

// src/screens/Assign.tsx
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
var BACK = /* @__PURE__ */ Symbol("back");
function Assign({ cfg, update, onBack }) {
  const [channel, setChannel] = useState5();
  const [notice, setNotice] = useState5();
  const channels = Object.keys(cfg.channels);
  if (channels.length === 0) {
    return /* @__PURE__ */ jsxs6(Box5, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx7(Text6, { color: "yellow", children: "No channels yet. Create one to assign versions to it." }),
      /* @__PURE__ */ jsx7(
        TextPrompt,
        {
          label: "Create a channel",
          onSubmit: (name) => {
            const err = update((c) => addChannel(c, name));
            if (err) return err;
            setChannel(name.trim());
          },
          onCancel: onBack
        }
      )
    ] });
  }
  if (channel) {
    const back = (message) => {
      setNotice(message);
      setChannel(void 0);
    };
    return /* @__PURE__ */ jsx7(
      AssignVersions,
      {
        cfg,
        update,
        channel,
        onDone: () => back(`Saved versions for ${channel}`),
        onCancel: () => back()
      }
    );
  }
  return /* @__PURE__ */ jsxs6(Box5, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx7(Text6, { bold: true, children: "Pick a channel to assign versions to" }),
    notice && /* @__PURE__ */ jsx7(Text6, { color: "green", children: notice }),
    /* @__PURE__ */ jsx7(
      Select,
      {
        items: [
          ...channels.map((name) => ({ label: name, value: name, hint: versionsHint(cfg, name) })),
          { label: "\u2190 Back", value: BACK }
        ],
        onSelect: (value) => value === BACK ? onBack() : setChannel(value),
        onCancel: onBack
      }
    )
  ] });
}

// src/screens/Channels.tsx
import { Box as Box6, Text as Text7 } from "ink";
import { useState as useState6 } from "react";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
function Channels({ cfg, update, onBack }) {
  const [mode, setMode] = useState6({ kind: "list" });
  const [notice, setNotice] = useState6();
  const toList = (message) => {
    setNotice(message);
    setMode({ kind: "list" });
  };
  switch (mode.kind) {
    case "create":
      return /* @__PURE__ */ jsx8(
        TextPrompt,
        {
          label: "Create a channel",
          hint: "e.g. staging \xB7 enter create \xB7 esc back",
          onSubmit: (name) => {
            if (!name.trim()) return toList();
            const err = update((c) => addChannel(c, name));
            if (err) return err;
            setMode({ kind: "assign", channel: name.trim() });
          },
          onCancel: () => toList()
        }
      );
    case "assign":
      return /* @__PURE__ */ jsx8(
        AssignVersions,
        {
          cfg,
          update,
          channel: mode.channel,
          onDone: () => toList(`Saved versions for ${mode.channel}`),
          onCancel: () => toList()
        }
      );
    case "rename":
      return /* @__PURE__ */ jsx8(
        TextPrompt,
        {
          label: `Rename ${mode.channel} to`,
          initial: mode.channel,
          onSubmit: (name) => {
            const err = update((c) => renameChannel(c, mode.channel, name));
            if (err) return err;
            toList(`Renamed ${mode.channel} to ${name.trim()}`);
          },
          onCancel: () => toList()
        }
      );
    case "delete":
      return /* @__PURE__ */ jsx8(
        Confirm,
        {
          message: `Delete channel ${mode.channel}?`,
          defaultYes: false,
          onAnswer: (yes) => {
            if (!yes) return toList();
            const err = update((c) => removeChannel(c, mode.channel));
            toList(err ?? `Deleted ${mode.channel}`);
          }
        }
      );
    case "menu":
      return /* @__PURE__ */ jsxs7(Box6, { flexDirection: "column", children: [
        /* @__PURE__ */ jsxs7(Text7, { bold: true, children: [
          mode.channel,
          " ",
          /* @__PURE__ */ jsx8(Text7, { dimColor: true, children: versionsHint(cfg, mode.channel) })
        ] }),
        /* @__PURE__ */ jsx8(
          Select,
          {
            items: [
              { label: "\u{1F517} Assign versions", value: "assign" },
              { label: "\u270E  Rename", value: "rename" },
              { label: "\u{1F5D1}  Delete", value: "delete" },
              { label: "\u2190 Back", value: "back" }
            ],
            onSelect: (action) => action === "back" ? toList() : setMode({ kind: action, channel: mode.channel }),
            onCancel: () => toList()
          }
        )
      ] });
  }
  return /* @__PURE__ */ jsxs7(Box6, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx8(Text7, { bold: true, children: "Channels" }),
    notice && /* @__PURE__ */ jsx8(Text7, { color: "green", children: notice }),
    /* @__PURE__ */ jsx8(
      Select,
      {
        items: [
          { label: "+ Create channel", value: { kind: "create" } },
          ...Object.keys(cfg.channels).map((channel) => ({
            label: channel,
            value: { kind: "channel", channel },
            hint: versionsHint(cfg, channel)
          })),
          { label: "\u2190 Back", value: { kind: "back" } }
        ],
        onSelect: (choice) => {
          if (choice.kind === "back") onBack();
          else if (choice.kind === "create") setMode({ kind: "create" });
          else setMode({ kind: "menu", channel: choice.channel });
        },
        onCancel: onBack
      }
    )
  ] });
}

// src/screens/Home.tsx
import { Box as Box7, Text as Text8 } from "ink";
import { jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
function Home({ cfg, onSelect }) {
  const channels = Object.keys(cfg.channels);
  const width = Math.max(0, ...channels.map((name) => name.length));
  return /* @__PURE__ */ jsxs8(Box7, { flexDirection: "column", gap: 1, children: [
    /* @__PURE__ */ jsx9(Box7, { flexDirection: "column", children: channels.length === 0 ? /* @__PURE__ */ jsx9(Text8, { dimColor: true, children: "No channels yet." }) : channels.map((name) => /* @__PURE__ */ jsxs8(Text8, { children: [
      name.padEnd(width),
      " ",
      /* @__PURE__ */ jsx9(Text8, { dimColor: true, children: versionsHint(cfg, name) })
    ] }, name)) }),
    /* @__PURE__ */ jsx9(
      Select,
      {
        items: [
          { label: "\u{1F680} Push update", value: "push" },
          { label: "\u{1F4E6} Versions", value: "versions" },
          { label: "\u{1F4E1} Channels", value: "channels" },
          { label: "\u{1F517} Assign versions to channels", value: "assign" },
          { label: "\u2715  Quit", value: "quit" }
        ],
        onSelect,
        onCancel: () => onSelect("quit")
      }
    )
  ] });
}

// src/screens/Push.tsx
import { Box as Box9, Text as Text10 } from "ink";
import { useEffect as useEffect2, useState as useState8 } from "react";

// src/runner.ts
import spawn from "cross-spawn";
var PLATFORMS = ["android", "ios"];
function buildTargets(cfg, channels, platforms = PLATFORMS) {
  return channels.flatMap(
    (channel) => (cfg.channels[channel] ?? []).flatMap(
      (version) => platforms.map((platform) => ({ channel, version, platform }))
    )
  );
}
var targetKey = (t) => `${t.channel}\0${t.version}\0${t.platform}`;
function groupTargets(targets) {
  const jobs = /* @__PURE__ */ new Map();
  for (const { channel, version, platform } of targets) {
    const key = `${channel}\0${version}`;
    const job = jobs.get(key) ?? { channel, version, platforms: [] };
    if (!job.platforms.includes(platform)) job.platforms.push(platform);
    jobs.set(key, job);
  }
  for (const job of jobs.values()) job.platforms = PLATFORMS.filter((p) => job.platforms.includes(p));
  return [...jobs.values()];
}
var buildJobs = (cfg, channels, platforms = PLATFORMS) => groupTargets(buildTargets(cfg, channels, platforms));
var jobLabel = (job) => `${job.channel} \xB7 ${job.version} \xB7 ${job.platforms.join("+")}`;
function easArgs(job, message) {
  if (job.platforms.length === 0) throw new Error("No platform selected");
  const args = ["update", "--channel", job.channel];
  if (job.platforms.length < PLATFORMS.length) args.push("-p", job.platforms[0]);
  args.push("-m", message, "--non-interactive");
  return args;
}
var ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
function lineReader(emit) {
  let buffer = "";
  const out = (raw) => {
    const line = raw.replace(ANSI_RE, "").trimEnd();
    if (line) emit(line);
  };
  return {
    push(chunk) {
      const parts = (buffer + chunk.toString()).split(/\r\n|\r|\n/);
      buffer = parts.pop() ?? "";
      parts.forEach(out);
    },
    flush() {
      out(buffer);
      buffer = "";
    }
  };
}
var current;
function killCurrent() {
  current?.kill();
}
function runJob(job, message, opts) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (code) => {
      if (settled) return;
      settled = true;
      current = void 0;
      stdout.flush();
      stderr.flush();
      resolve(code);
    };
    const emit = (line) => opts.onOutput?.(line);
    const stdout = lineReader(emit);
    const stderr = lineReader(emit);
    const child = (opts.spawnFn ?? spawn)("eas", easArgs(job, message), {
      cwd: opts.cwd,
      env: { ...process.env, APP_VERSION: job.version },
      stdio: opts.inherit ? "inherit" : ["ignore", "pipe", "pipe"]
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
async function runJobs(jobs, message, opts) {
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

// src/screens/Progress.tsx
import { Box as Box8, Text as Text9, useInput as useInput5 } from "ink";
import { useEffect, useState as useState7 } from "react";
import { jsx as jsx10, jsxs as jsxs9 } from "react/jsx-runtime";
var LOG_LINES = 8;
var ICONS = {
  pending: "\xB7 ",
  running: "\u23F3",
  done: "\u2705",
  failed: "\u274C"
};
function Progress({ jobs, message, cwd, onDone }) {
  const [statuses, setStatuses] = useState7(() => jobs.map(() => "pending"));
  const [log, setLog] = useState7([]);
  const [result, setResult] = useState7();
  useEffect(() => {
    let alive = true;
    runJobs(jobs, message, {
      cwd,
      onStatus: (i, status) => alive && setStatuses((prev) => prev.map((s, j) => j === i ? status : s)),
      onOutput: (line) => alive && setLog((prev) => [...prev.slice(1 - LOG_LINES), line])
    }).then((ok) => alive && setResult(ok));
    return () => {
      alive = false;
      killCurrent();
    };
  }, []);
  useInput5(
    (_, key) => {
      if (key.return || key.escape) onDone();
    },
    { isActive: result !== void 0 }
  );
  const done = statuses.filter((s) => s === "done").length;
  return /* @__PURE__ */ jsxs9(Box8, { flexDirection: "column", gap: 1, children: [
    /* @__PURE__ */ jsx10(Box8, { flexDirection: "column", children: jobs.map((job, i) => /* @__PURE__ */ jsxs9(Text9, { dimColor: statuses[i] === "pending", children: [
      ICONS[statuses[i]],
      " ",
      jobLabel(job)
    ] }, i)) }),
    log.length > 0 && /* @__PURE__ */ jsx10(Box8, { flexDirection: "column", borderStyle: "single", borderDimColor: true, paddingX: 1, children: log.map((line, i) => /* @__PURE__ */ jsx10(Text9, { dimColor: true, wrap: "truncate-end", children: line }, i)) }),
    result === true && /* @__PURE__ */ jsxs9(Text9, { color: "green", children: [
      "\u{1F389} All ",
      jobs.length,
      " updates completed"
    ] }),
    result === false && /* @__PURE__ */ jsxs9(Text9, { color: "red", children: [
      "Stopped after a failure: ",
      done,
      " done, ",
      jobs.length - done - 1,
      " not run"
    ] }),
    result !== void 0 && /* @__PURE__ */ jsx10(Text9, { dimColor: true, children: "enter to go back" })
  ] });
}

// src/screens/Push.tsx
import { jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
function Push({ cfg, update, onBack, root, defaultMessage }) {
  const [step, setStep] = useState8("channels");
  const [selected, setSelected] = useState8([]);
  const [assigning, setAssigning] = useState8(false);
  const [message, setMessage] = useState8(defaultMessage);
  const [picked, setPicked] = useState8();
  const [error, setError] = useState8();
  const channels = Object.keys(cfg.channels);
  const empty = selected.filter((c) => !cfg.channels[c]?.length);
  const targets = buildTargets(cfg, selected);
  const jobs = groupTargets(targets.filter((t) => !picked || picked.includes(targetKey(t))));
  useEffect2(() => {
    if (step !== "resolve" || empty.length > 0) return;
    if (selected.length === 0) {
      setError("No channels with versions selected");
      setStep("channels");
    } else {
      setStep("message");
    }
  }, [step, empty.length, selected.length]);
  if (channels.length === 0) {
    return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx11(Text10, { color: "yellow", children: "No channels yet. Create one from Channels first." }),
      /* @__PURE__ */ jsx11(Select, { items: [{ label: "\u2190 Back", value: "back" }], onSelect: onBack, onCancel: onBack })
    ] });
  }
  switch (step) {
    case "channels":
      return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx11(Text10, { bold: true, children: "Select channels" }),
        error && /* @__PURE__ */ jsx11(Text10, { color: "red", children: error }),
        /* @__PURE__ */ jsx11(
          MultiSelect,
          {
            items: channels.map((c) => ({ label: c, value: c, hint: versionsHint(cfg, c) })),
            initial: selected,
            onSubmit: (values) => {
              if (values.length === 0) return "Pick at least one channel";
              setError(void 0);
              setSelected(values);
              setPicked(void 0);
              setStep("resolve");
            },
            onCancel: onBack
          }
        )
      ] });
    case "resolve": {
      const channel = empty[0];
      if (!channel) return null;
      if (assigning) {
        return /* @__PURE__ */ jsx11(
          AssignVersions,
          {
            cfg,
            update,
            channel,
            onDone: (versions) => {
              setAssigning(false);
              if (versions.length === 0) setSelected((prev) => prev.filter((c) => c !== channel));
            },
            onCancel: () => setAssigning(false)
          },
          channel
        );
      }
      return /* @__PURE__ */ jsx11(
        Confirm,
        {
          message: `${channel} has no versions. Assign versions now?`,
          onAnswer: (yes) => yes ? setAssigning(true) : setSelected((prev) => prev.filter((c) => c !== channel)),
          onCancel: () => setStep("channels")
        }
      );
    }
    case "message":
      return /* @__PURE__ */ jsx11(
        TextPrompt,
        {
          label: "Message",
          initial: message,
          onSubmit: (value) => {
            if (!value.trim()) return "Message can't be empty";
            setMessage(value.trim());
            setStep("pick");
          },
          onCancel: () => setStep("channels")
        }
      );
    case "pick":
      return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx11(Text10, { bold: true, children: "Pick what to push" }),
        /* @__PURE__ */ jsx11(Text10, { dimColor: true, children: "untick anything you want to leave out this time" }),
        /* @__PURE__ */ jsx11(
          MultiSelect,
          {
            items: targets.map((t) => ({
              label: `${t.channel} \xB7 ${t.version} \xB7 ${t.platform}`,
              value: targetKey(t)
            })),
            initial: picked ?? targets.map(targetKey),
            onSubmit: (values) => {
              if (values.length === 0) return "Pick at least one";
              setPicked(values);
              setStep("confirm");
            },
            onCancel: () => setStep("message")
          }
        )
      ] });
    case "confirm":
      return /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", gap: 1, children: [
        /* @__PURE__ */ jsxs10(Box9, { flexDirection: "column", children: [
          /* @__PURE__ */ jsxs10(Text10, { bold: true, children: [
            jobs.length,
            " update",
            jobs.length === 1 ? "" : "s",
            " will run:"
          ] }),
          jobs.map((job, i) => /* @__PURE__ */ jsxs10(Text10, { children: [
            "  ",
            jobLabel(job)
          ] }, i)),
          /* @__PURE__ */ jsxs10(Text10, { dimColor: true, children: [
            "message: ",
            message
          ] })
        ] }),
        /* @__PURE__ */ jsx11(
          Confirm,
          {
            message: "Proceed?",
            onAnswer: (yes) => setStep(yes ? "run" : "pick"),
            onCancel: () => setStep("pick")
          }
        )
      ] });
    case "run":
      return /* @__PURE__ */ jsx11(Progress, { jobs, message, cwd: root, onDone: onBack });
  }
}

// src/screens/Setup.tsx
import { Box as Box10, Text as Text11 } from "ink";
import { useState as useState9 } from "react";
import { jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
var NEXT_HINT = "enter = add \xB7 empty enter = next step \xB7 esc = skip setup";
function Setup({ cfg, update, onBack }) {
  const [step, setStep] = useState9({ kind: "versions" });
  const [promptKey, setPromptKey] = useState9(0);
  const channels = Object.keys(cfg.channels);
  const remount = () => setPromptKey(promptKey + 1);
  if (step.kind === "versions") {
    return /* @__PURE__ */ jsxs11(Box10, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx12(Text11, { bold: true, children: "Step 1/3 \xB7 Versions" }),
      /* @__PURE__ */ jsxs11(Text11, { dimColor: true, children: [
        "added: ",
        cfg.versions.join(", ") || "(none)"
      ] }),
      /* @__PURE__ */ jsx12(
        AddVersion,
        {
          update,
          hint: NEXT_HINT,
          onAdded: remount,
          onEmpty: () => {
            if (cfg.versions.length === 0) return "Add at least one version";
            setStep({ kind: "channels" });
          },
          onCancel: onBack
        },
        promptKey
      )
    ] });
  }
  if (step.kind === "channels") {
    return /* @__PURE__ */ jsxs11(Box10, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx12(Text11, { bold: true, children: "Step 2/3 \xB7 Channels" }),
      /* @__PURE__ */ jsxs11(Text11, { dimColor: true, children: [
        "added: ",
        channels.join(", ") || "(none)"
      ] }),
      /* @__PURE__ */ jsx12(
        TextPrompt,
        {
          label: "Create a channel",
          hint: NEXT_HINT,
          onSubmit: (name) => {
            if (!name.trim()) {
              if (channels.length === 0) return "Create at least one channel";
              setStep({ kind: "assign", index: 0 });
              return;
            }
            const err = update((c) => addChannel(c, name));
            if (err) return err;
            remount();
          },
          onCancel: onBack
        },
        promptKey
      )
    ] });
  }
  const next = () => step.index + 1 < channels.length ? setStep({ kind: "assign", index: step.index + 1 }) : onBack();
  return /* @__PURE__ */ jsxs11(Box10, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs11(Text11, { bold: true, children: [
      "Step 3/3 \xB7 Assign (",
      step.index + 1,
      "/",
      channels.length,
      ")"
    ] }),
    /* @__PURE__ */ jsx12(
      AssignVersions,
      {
        cfg,
        update,
        channel: channels[step.index],
        onDone: next,
        onCancel: onBack
      },
      channels[step.index]
    )
  ] });
}

// src/screens/Versions.tsx
import { Box as Box11, Text as Text12 } from "ink";
import { useState as useState10 } from "react";
import { jsx as jsx13, jsxs as jsxs12 } from "react/jsx-runtime";
function Versions({ cfg, update, onBack }) {
  const [mode, setMode] = useState10({ kind: "list" });
  const [notice, setNotice] = useState10();
  const usedBy = (version) => Object.keys(cfg.channels).filter((name) => cfg.channels[name].includes(version));
  const toList = (message) => {
    setNotice(message);
    setMode({ kind: "list" });
  };
  if (mode.kind === "add") {
    return /* @__PURE__ */ jsx13(AddVersion, { update, onAdded: (v) => toList(`Added ${v}`), onCancel: () => toList() });
  }
  if (mode.kind === "delete") {
    const channels = usedBy(mode.version);
    const where = channels.length ? ` It is assigned to ${channels.join(", ")}.` : "";
    return /* @__PURE__ */ jsx13(
      Confirm,
      {
        message: `Delete ${mode.version}?${where}`,
        defaultYes: false,
        onAnswer: (yes) => {
          if (!yes) return toList();
          const err = update((c) => removeVersion(c, mode.version));
          toList(err ?? `Deleted ${mode.version}`);
        }
      }
    );
  }
  return /* @__PURE__ */ jsxs12(Box11, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx13(Text12, { bold: true, children: "Versions" }),
    notice && /* @__PURE__ */ jsx13(Text12, { color: "green", children: notice }),
    /* @__PURE__ */ jsx13(
      Select,
      {
        items: [
          { label: "+ Add version", value: { kind: "add" } },
          ...cfg.versions.map((version) => {
            const channels = usedBy(version);
            return {
              label: version,
              value: { kind: "version", version },
              hint: channels.length ? `in ${channels.join(", ")}` : "unassigned"
            };
          }),
          { label: "\u2190 Back", value: { kind: "back" } }
        ],
        onSelect: (choice) => {
          if (choice.kind === "back") onBack();
          else if (choice.kind === "add") setMode({ kind: "add" });
          else setMode({ kind: "delete", version: choice.version });
        },
        onCancel: onBack
      }
    ),
    cfg.versions.length > 0 && /* @__PURE__ */ jsx13(Text12, { dimColor: true, children: "select a version to delete it" })
  ] });
}

// src/app.tsx
import { jsx as jsx14, jsxs as jsxs13 } from "react/jsx-runtime";
var HOME = os.homedir();
function App({ root, initialConfig, defaultMessage, start = "home" }) {
  const { exit } = useApp();
  const [cfg, setCfg] = useState11(initialConfig ?? emptyConfig());
  const cfgRef = useRef(cfg);
  const [screen, setScreen] = useState11(
    initialConfig === null ? "intro" : isEmptyConfig(initialConfig) ? "setup" : start
  );
  const update = useCallback(
    (op) => {
      try {
        const next = op(cfgRef.current);
        saveConfig(root, next);
        cfgRef.current = next;
        setCfg(next);
      } catch (err) {
        return err.message;
      }
    },
    [root]
  );
  const home = () => setScreen("home");
  const props = { cfg, update, onBack: home };
  const body = (() => {
    switch (screen) {
      case "intro":
        return /* @__PURE__ */ jsx14(
          Confirm,
          {
            message: `No ${CONFIG_FILE} found. Set it up now?`,
            onAnswer: (yes) => yes ? setScreen("setup") : exit()
          }
        );
      case "setup":
        return /* @__PURE__ */ jsx14(Setup, { ...props });
      case "home":
        return /* @__PURE__ */ jsx14(Home, { cfg, onSelect: (d) => d === "quit" ? exit() : setScreen(d) });
      case "push":
        return /* @__PURE__ */ jsx14(Push, { ...props, root, defaultMessage });
      case "versions":
        return /* @__PURE__ */ jsx14(Versions, { ...props });
      case "channels":
        return /* @__PURE__ */ jsx14(Channels, { ...props });
      case "assign":
        return /* @__PURE__ */ jsx14(Assign, { ...props });
    }
  })();
  return /* @__PURE__ */ jsxs13(Box12, { flexDirection: "column", paddingX: 1, gap: 1, children: [
    /* @__PURE__ */ jsxs13(Text13, { children: [
      /* @__PURE__ */ jsx14(Text13, { bold: true, color: "cyan", children: "ota" }),
      /* @__PURE__ */ jsxs13(Text13, { children: [
        " \xB7 ",
        path2.basename(root),
        " "
      ] }),
      /* @__PURE__ */ jsxs13(Text13, { dimColor: true, children: [
        "(",
        root.startsWith(HOME) ? "~" + root.slice(HOME.length) : root,
        ")"
      ] })
    ] }),
    body
  ] });
}

// src/git.ts
import { execFileSync } from "child_process";
function lastCommitMessage(cwd) {
  try {
    const out = execFileSync("git", ["log", "-1", "--pretty=%s"], {
      cwd,
      stdio: ["ignore", "pipe", "ignore"]
    });
    return out.toString().trim();
  } catch {
    return "";
  }
}

// src/project.ts
import fs2 from "fs";
import path3 from "path";
var MARKERS = ["app.json", "app.config.ts", "app.config.js", "app.config.mjs", "app.config.cjs"];
function findProjectRoot(start = process.cwd()) {
  let dir = path3.resolve(start);
  for (; ; ) {
    if (MARKERS.some((m) => fs2.existsSync(path3.join(dir, m)))) return dir;
    const parent = path3.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// src/push.ts
import readline from "readline/promises";
import { parseArgs } from "util";
var PUSH_USAGE = "ota push <channel...> [-p android|ios] [-m message] [-y]";
async function pushCommand(root, argv) {
  const fail2 = (message2) => {
    console.error(`\u274C ${message2}`);
    return 1;
  };
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        platform: { type: "string", short: "p" },
        message: { type: "string", short: "m" },
        yes: { type: "boolean", short: "y" }
      }
    });
  } catch (err) {
    return fail2(`${err.message}
Usage: ${PUSH_USAGE}`);
  }
  const { positionals: channels, values } = parsed;
  if (channels.length === 0) return fail2(`Usage: ${PUSH_USAGE}`);
  if (values.platform && !PLATFORMS.includes(values.platform)) {
    return fail2(`Unknown platform "${values.platform}" (use ${PLATFORMS.join(" or ")})`);
  }
  const cfg = loadConfig(root);
  if (!cfg) return fail2(`No ${CONFIG_FILE} found. Run \`ota\` to set it up.`);
  const unknown = channels.filter((c) => !Object.hasOwn(cfg.channels, c));
  if (unknown.length) return fail2(`Unknown channel(s): ${unknown.join(", ")}`);
  const empty = channels.filter((c) => cfg.channels[c].length === 0);
  if (empty.length) return fail2(`No versions assigned to: ${empty.join(", ")}`);
  const message = values.message?.trim() || lastCommitMessage(root);
  if (!message) return fail2("No message given and no git commit to use (pass -m)");
  const platforms = values.platform ? [values.platform] : [...PLATFORMS];
  const jobs = buildJobs(cfg, channels, platforms);
  console.log(`
${jobs.length} update(s) will run:`);
  for (const job of jobs) console.log(`  ${jobLabel(job)}`);
  console.log(`\u{1F4DD} Message: ${message}
`);
  if (!values.yes) {
    if (!process.stdin.isTTY) return fail2("Not a terminal; pass -y to skip confirmation");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question("Proceed? (Y/n): ")).trim().toLowerCase();
    rl.close();
    if (answer && answer !== "y" && answer !== "yes") {
      console.log("Cancelled");
      return 0;
    }
  }
  const ok = await runJobs(jobs, message, {
    cwd: root,
    inherit: true,
    onStatus: (i, status) => {
      if (status === "running") console.log(`
\u{1F680} ${jobLabel(jobs[i])}`);
      else if (status === "done") console.log(`\u2705 ${jobLabel(jobs[i])}`);
      else if (status === "failed") console.error(`\u274C Failed: ${jobLabel(jobs[i])}`);
    }
  });
  if (ok) console.log(`
\u{1F389} All ${jobs.length} updates completed
`);
  return ok ? 0 : 1;
}

// src/cli.tsx
import { jsx as jsx15 } from "react/jsx-runtime";
var HELP = `ota \u2014 push EAS OTA updates to saved channels and versions

Usage:
  ota                 open the interactive app
  ota push            open the app straight on the push screen
  ${PUSH_USAGE}
                      push without the UI using the saved assignments
                      (no -p = android and ios in a single eas call)

Run it inside an Expo project. Data is stored in .ota.json in the project root.`;
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "-h" || command === "--help" || command === "help") {
    console.log(HELP);
    return 0;
  }
  if (command === "-V" || command === "--version") {
    console.log(createRequire(import.meta.url)("../package.json").version);
    return 0;
  }
  if (command && command !== "push") {
    console.error(`Unknown command: ${command}

${HELP}`);
    return 1;
  }
  const root = findProjectRoot();
  if (!root) {
    console.error("No app.json / app.config found. Run ota inside an Expo project.");
    return 1;
  }
  if (command === "push" && rest.length > 0) return pushCommand(root, rest);
  if (!process.stdin.isTTY) {
    console.error("ota needs an interactive terminal. In scripts use: " + PUSH_USAGE);
    return 1;
  }
  let config;
  try {
    config = loadConfig(root);
  } catch (err) {
    console.error(`\u274C ${err.message}`);
    return 1;
  }
  const app = render(
    /* @__PURE__ */ jsx15(
      App,
      {
        root,
        initialConfig: config,
        defaultMessage: lastCommitMessage(root),
        start: command === "push" ? "push" : "home"
      }
    )
  );
  await app.waitUntilExit();
  return 0;
}
process.on("exit", killCurrent);
main().then(
  (code) => {
    killCurrent();
    process.exitCode = code;
  },
  (err) => {
    console.error(err);
    process.exitCode = 1;
  }
);
