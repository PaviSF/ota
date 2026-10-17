import { execFileSync } from "node:child_process";

/** Subject line of the last commit, or "" outside a git repo. */
export function lastCommitMessage(cwd: string): string {
  try {
    const out = execFileSync("git", ["log", "-1", "--pretty=%s"], {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.toString().trim();
  } catch {
    return "";
  }
}
