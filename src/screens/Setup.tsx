import { Box, Text } from "ink";
import { useState } from "react";
import { AddVersion } from "../components/AddVersion";
import { AssignVersions } from "../components/AssignVersions";
import { TextPrompt } from "../components/TextPrompt";
import { addChannel } from "../store";
import type { ScreenProps } from "../types";

type Step = { kind: "versions" } | { kind: "channels" } | { kind: "assign"; index: number };

const NEXT_HINT = "enter = add · empty enter = next step · esc = skip setup";

/** First-run walkthrough: versions → channels → versions per channel. */
export function Setup({ cfg, update, onBack }: ScreenProps) {
  const [step, setStep] = useState<Step>({ kind: "versions" });
  const [promptKey, setPromptKey] = useState(0);
  const channels = Object.keys(cfg.channels);
  const remount = () => setPromptKey(promptKey + 1);

  if (step.kind === "versions") {
    return (
      <Box flexDirection="column">
        <Text bold>Step 1/3 · Versions</Text>
        <Text dimColor>added: {cfg.versions.join(", ") || "(none)"}</Text>
        <AddVersion
          key={promptKey}
          update={update}
          hint={NEXT_HINT}
          onAdded={remount}
          onEmpty={() => {
            if (cfg.versions.length === 0) return "Add at least one version";
            setStep({ kind: "channels" });
          }}
          onCancel={onBack}
        />
      </Box>
    );
  }

  if (step.kind === "channels") {
    return (
      <Box flexDirection="column">
        <Text bold>Step 2/3 · Channels</Text>
        <Text dimColor>added: {channels.join(", ") || "(none)"}</Text>
        <TextPrompt
          key={promptKey}
          label="Create a channel"
          hint={NEXT_HINT}
          onSubmit={(name) => {
            if (!name.trim()) {
              if (channels.length === 0) return "Create at least one channel";
              setStep({ kind: "assign", index: 0 });
              return;
            }
            const err = update((c) => addChannel(c, name));
            if (err) return err;
            remount();
          }}
          onCancel={onBack}
        />
      </Box>
    );
  }

  const next = () =>
    step.index + 1 < channels.length ? setStep({ kind: "assign", index: step.index + 1 }) : onBack();

  return (
    <Box flexDirection="column">
      <Text bold>
        Step 3/3 · Assign ({step.index + 1}/{channels.length})
      </Text>
      <AssignVersions
        key={channels[step.index]}
        cfg={cfg}
        update={update}
        channel={channels[step.index]}
        onDone={next}
        onCancel={onBack}
      />
    </Box>
  );
}
