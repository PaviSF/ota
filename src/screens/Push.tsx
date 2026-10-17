import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import { AssignVersions } from "../components/AssignVersions";
import { Confirm } from "../components/Confirm";
import { MultiSelect } from "../components/MultiSelect";
import { Select } from "../components/Select";
import { TextPrompt } from "../components/TextPrompt";
import { buildTargets, groupTargets, jobLabel, targetKey } from "../runner";
import { versionsHint, type ScreenProps } from "../types";
import { Progress } from "./Progress";

type Step = "channels" | "resolve" | "message" | "pick" | "confirm" | "run";

interface Props extends ScreenProps {
  root: string;
  defaultMessage: string;
}

export function Push({ cfg, update, onBack, root, defaultMessage }: Props) {
  const [step, setStep] = useState<Step>("channels");
  const [selected, setSelected] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  // Keys of the targets left ticked in the final checklist; undefined means all of them.
  const [picked, setPicked] = useState<string[]>();
  const [error, setError] = useState<string>();

  const channels = Object.keys(cfg.channels);
  // Selected channels that still have no versions; resolved one at a time.
  const empty = selected.filter((c) => !cfg.channels[c]?.length);
  const targets = buildTargets(cfg, selected);
  const jobs = groupTargets(targets.filter((t) => !picked || picked.includes(targetKey(t))));

  useEffect(() => {
    if (step !== "resolve" || empty.length > 0) return;
    if (selected.length === 0) {
      setError("No channels with versions selected");
      setStep("channels");
    } else {
      setStep("message");
    }
  }, [step, empty.length, selected.length]);

  if (channels.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No channels yet. Create one from Channels first.</Text>
        <Select items={[{ label: "← Back", value: "back" }]} onSelect={onBack} onCancel={onBack} />
      </Box>
    );
  }

  switch (step) {
    case "channels":
      return (
        <Box flexDirection="column">
          <Text bold>Select channels</Text>
          {error && <Text color="red">{error}</Text>}
          <MultiSelect
            items={channels.map((c) => ({ label: c, value: c, hint: versionsHint(cfg, c) }))}
            initial={selected}
            onSubmit={(values) => {
              if (values.length === 0) return "Pick at least one channel";
              setError(undefined);
              setSelected(values);
              setPicked(undefined);
              setStep("resolve");
            }}
            onCancel={onBack}
          />
        </Box>
      );

    case "resolve": {
      const channel = empty[0];
      if (!channel) return null;
      if (assigning) {
        return (
          <AssignVersions
            key={channel}
            cfg={cfg}
            update={update}
            channel={channel}
            onDone={(versions) => {
              setAssigning(false);
              // Leaving it empty again skips the channel rather than asking forever.
              if (versions.length === 0) setSelected((prev) => prev.filter((c) => c !== channel));
            }}
            onCancel={() => setAssigning(false)}
          />
        );
      }
      return (
        <Confirm
          message={`${channel} has no versions. Assign versions now?`}
          onAnswer={(yes) =>
            yes ? setAssigning(true) : setSelected((prev) => prev.filter((c) => c !== channel))
          }
          onCancel={() => setStep("channels")}
        />
      );
    }

    case "message":
      return (
        <TextPrompt
          label="Message"
          initial={message}
          onSubmit={(value) => {
            if (!value.trim()) return "Message can't be empty";
            setMessage(value.trim());
            setStep("pick");
          }}
          onCancel={() => setStep("channels")}
        />
      );

    case "pick":
      return (
        <Box flexDirection="column">
          <Text bold>Pick what to push</Text>
          <Text dimColor>untick anything you want to leave out this time</Text>
          <MultiSelect
            items={targets.map((t) => ({
              label: `${t.channel} · ${t.version} · ${t.platform}`,
              value: targetKey(t),
            }))}
            initial={picked ?? targets.map(targetKey)}
            onSubmit={(values) => {
              if (values.length === 0) return "Pick at least one";
              setPicked(values);
              setStep("confirm");
            }}
            onCancel={() => setStep("message")}
          />
        </Box>
      );

    case "confirm":
      return (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            <Text bold>
              {jobs.length} update{jobs.length === 1 ? "" : "s"} will run:
            </Text>
            {jobs.map((job, i) => (
              <Text key={i}>  {jobLabel(job)}</Text>
            ))}
            <Text dimColor>message: {message}</Text>
          </Box>
          <Confirm
            message="Proceed?"
            onAnswer={(yes) => setStep(yes ? "run" : "pick")}
            onCancel={() => setStep("pick")}
          />
        </Box>
      );

    case "run":
      return <Progress jobs={jobs} message={message} cwd={root} onDone={onBack} />;
  }
}
