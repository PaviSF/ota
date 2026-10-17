import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { jobLabel, killCurrent, runJobs, type Job, type JobStatus } from "../runner";

const LOG_LINES = 8;

const ICONS: Record<JobStatus, string> = {
  pending: "· ",
  running: "⏳",
  done: "✅",
  failed: "❌",
};

interface Props {
  jobs: Job[];
  message: string;
  cwd: string;
  onDone: () => void;
}

export function Progress({ jobs, message, cwd, onDone }: Props) {
  const [statuses, setStatuses] = useState<JobStatus[]>(() => jobs.map(() => "pending"));
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<boolean>();

  useEffect(() => {
    let alive = true;
    runJobs(jobs, message, {
      cwd,
      onStatus: (i, status) =>
        alive && setStatuses((prev) => prev.map((s, j) => (j === i ? status : s))),
      onOutput: (line) => alive && setLog((prev) => [...prev.slice(1 - LOG_LINES), line]),
    }).then((ok) => alive && setResult(ok));
    return () => {
      alive = false;
      killCurrent();
    };
  }, []);

  useInput(
    (_, key) => {
      if (key.return || key.escape) onDone();
    },
    { isActive: result !== undefined },
  );

  const done = statuses.filter((s) => s === "done").length;

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        {jobs.map((job, i) => (
          <Text key={i} dimColor={statuses[i] === "pending"}>
            {ICONS[statuses[i]]} {jobLabel(job)}
          </Text>
        ))}
      </Box>
      {log.length > 0 && (
        <Box flexDirection="column" borderStyle="single" borderDimColor paddingX={1}>
          {log.map((line, i) => (
            <Text key={i} dimColor wrap="truncate-end">
              {line}
            </Text>
          ))}
        </Box>
      )}
      {result === true && <Text color="green">🎉 All {jobs.length} updates completed</Text>}
      {result === false && (
        <Text color="red">
          Stopped after a failure: {done} done, {jobs.length - done - 1} not run
        </Text>
      )}
      {result !== undefined && <Text dimColor>enter to go back</Text>}
    </Box>
  );
}
