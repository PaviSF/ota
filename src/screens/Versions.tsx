import { Box, Text } from "ink";
import { useState } from "react";
import { AddVersion } from "../components/AddVersion";
import { Confirm } from "../components/Confirm";
import { Select } from "../components/Select";
import { removeVersion } from "../store";
import type { ScreenProps } from "../types";

type Mode = { kind: "list" } | { kind: "add" } | { kind: "delete"; version: string };
type Choice = { kind: "add" } | { kind: "back" } | { kind: "version"; version: string };

export function Versions({ cfg, update, onBack }: ScreenProps) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [notice, setNotice] = useState<string>();

  const usedBy = (version: string) =>
    Object.keys(cfg.channels).filter((name) => cfg.channels[name].includes(version));

  const toList = (message?: string) => {
    setNotice(message);
    setMode({ kind: "list" });
  };

  if (mode.kind === "add") {
    return <AddVersion update={update} onAdded={(v) => toList(`Added ${v}`)} onCancel={() => toList()} />;
  }

  if (mode.kind === "delete") {
    const channels = usedBy(mode.version);
    const where = channels.length ? ` It is assigned to ${channels.join(", ")}.` : "";
    return (
      <Confirm
        message={`Delete ${mode.version}?${where}`}
        defaultYes={false}
        onAnswer={(yes) => {
          if (!yes) return toList();
          const err = update((c) => removeVersion(c, mode.version));
          toList(err ?? `Deleted ${mode.version}`);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Versions</Text>
      {notice && <Text color="green">{notice}</Text>}
      <Select<Choice>
        items={[
          { label: "+ Add version", value: { kind: "add" } },
          ...cfg.versions.map((version) => {
            const channels = usedBy(version);
            return {
              label: version,
              value: { kind: "version" as const, version },
              hint: channels.length ? `in ${channels.join(", ")}` : "unassigned",
            };
          }),
          { label: "← Back", value: { kind: "back" } },
        ]}
        onSelect={(choice) => {
          if (choice.kind === "back") onBack();
          else if (choice.kind === "add") setMode({ kind: "add" });
          else setMode({ kind: "delete", version: choice.version });
        }}
        onCancel={onBack}
      />
      {cfg.versions.length > 0 && <Text dimColor>select a version to delete it</Text>}
    </Box>
  );
}
