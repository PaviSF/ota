import { createRequire } from "node:module";
import { render } from "ink";
import { App } from "./app";
import { lastCommitMessage } from "./git";
import { findProjectRoot } from "./project";
import { pushCommand, PUSH_USAGE } from "./push";
import { killCurrent } from "./runner";
import { loadConfig } from "./store";

const HELP = `ota — push EAS OTA updates to saved channels and versions

Usage:
  ota                 open the interactive app
  ota push            open the app straight on the push screen
  ${PUSH_USAGE}
                      push without the UI using the saved assignments
                      (no -p = android and ios in a single eas call)

Run it inside an Expo project. Data is stored in .ota.json in the project root.`;

async function main(): Promise<number> {
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
    console.error(`Unknown command: ${command}\n\n${HELP}`);
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
    console.error(`❌ ${(err as Error).message}`);
    return 1;
  }

  const app = render(
    <App
      root={root}
      initialConfig={config}
      defaultMessage={lastCommitMessage(root)}
      start={command === "push" ? "push" : "home"}
    />,
  );
  await app.waitUntilExit();
  return 0;
}

process.on("exit", killCurrent);

main().then(
  (code) => {
    // Ctrl+C unmounts the app while eas may still be running; don't leave it behind.
    killCurrent();
    process.exitCode = code;
  },
  (err) => {
    console.error(err);
    process.exitCode = 1;
  },
);
