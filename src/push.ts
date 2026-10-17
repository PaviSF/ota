import readline from "node:readline/promises";
import { parseArgs } from "node:util";
import { lastCommitMessage } from "./git";
import { buildJobs, jobLabel, PLATFORMS, runJobs, type Platform } from "./runner";
import { CONFIG_FILE, loadConfig } from "./store";

export const PUSH_USAGE = "ota push <channel...> [-p android|ios] [-m message] [-y]";

/** Non-interactive push using the saved assignments. Returns the process exit code. */
export async function pushCommand(root: string, argv: string[]): Promise<number> {
  const fail = (message: string) => {
    console.error(`❌ ${message}`);
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
        yes: { type: "boolean", short: "y" },
      },
    });
  } catch (err) {
    return fail(`${(err as Error).message}\nUsage: ${PUSH_USAGE}`);
  }
  const { positionals: channels, values } = parsed;

  if (channels.length === 0) return fail(`Usage: ${PUSH_USAGE}`);
  if (values.platform && !PLATFORMS.includes(values.platform as Platform)) {
    return fail(`Unknown platform "${values.platform}" (use ${PLATFORMS.join(" or ")})`);
  }

  const cfg = loadConfig(root);
  if (!cfg) return fail(`No ${CONFIG_FILE} found. Run \`ota\` to set it up.`);

  const unknown = channels.filter((c) => !Object.hasOwn(cfg.channels, c));
  if (unknown.length) return fail(`Unknown channel(s): ${unknown.join(", ")}`);
  const empty = channels.filter((c) => cfg.channels[c].length === 0);
  if (empty.length) return fail(`No versions assigned to: ${empty.join(", ")}`);

  const message = values.message?.trim() || lastCommitMessage(root);
  if (!message) return fail("No message given and no git commit to use (pass -m)");

  const platforms = values.platform ? [values.platform as Platform] : [...PLATFORMS];
  const jobs = buildJobs(cfg, channels, platforms);

  console.log(`\n${jobs.length} update(s) will run:`);
  for (const job of jobs) console.log(`  ${jobLabel(job)}`);
  console.log(`📝 Message: ${message}\n`);

  if (!values.yes) {
    if (!process.stdin.isTTY) return fail("Not a terminal; pass -y to skip confirmation");
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
      if (status === "running") console.log(`\n🚀 ${jobLabel(jobs[i])}`);
      else if (status === "done") console.log(`✅ ${jobLabel(jobs[i])}`);
      else if (status === "failed") console.error(`❌ Failed: ${jobLabel(jobs[i])}`);
    },
  });
  if (ok) console.log(`\n🎉 All ${jobs.length} updates completed\n`);
  return ok ? 0 : 1;
}
