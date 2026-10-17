import { Box, Text } from "ink";
import { useState } from "react";
import { AssignVersions } from "../components/AssignVersions";
import { Confirm } from "../components/Confirm";
import { Select } from "../components/Select";
import { TextPrompt } from "../components/TextPrompt";
import { addChannel, removeChannel, renameChannel } from "../store";
import { versionsHint, type ScreenProps } from "../types";

type Mode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "menu"; channel: string }
  | { kind: "assign"; channel: string }
  | { kind: "rename"; channel: string }
  | { kind: "delete"; channel: string };

type Choice = { kind: "create" } | { kind: "back" } | { kind: "channel"; channel: string };
type Action = "assign" | "rename" | "delete" | "back";

export function Channels({ cfg, update, onBack }: ScreenProps) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [notice, setNotice] = useState<string>();

  const toList = (message?: string) => {
    setNotice(message);
    setMode({ kind: "list" });
  };

  switch (mode.kind) {
    case "create":
      return (
        <TextPrompt
          label="Create a channel"
          hint="e.g. staging · enter create · esc back"
          onSubmit={(name) => {
            if (!name.trim()) return toList();
            const err = update((c) => addChannel(c, name));
            if (err) return err;
            setMode({ kind: "assign", channel: name.trim() });
          }}
          onCancel={() => toList()}
        />
      );

    case "assign":
      return (
        <AssignVersions
          cfg={cfg}
          update={update}
          channel={mode.channel}
          onDone={() => toList(`Saved versions for ${mode.channel}`)}
          onCancel={() => toList()}
        />
      );

    case "rename":
      return (
        <TextPrompt
          label={`Rename ${mode.channel} to`}
          initial={mode.channel}
          onSubmit={(name) => {
            const err = update((c) => renameChannel(c, mode.channel, name));
            if (err) return err;
            toList(`Renamed ${mode.channel} to ${name.trim()}`);
          }}
          onCancel={() => toList()}
        />
      );

    case "delete":
      return (
        <Confirm
          message={`Delete channel ${mode.channel}?`}
          defaultYes={false}
          onAnswer={(yes) => {
            if (!yes) return toList();
            const err = update((c) => removeChannel(c, mode.channel));
            toList(err ?? `Deleted ${mode.channel}`);
          }}
        />
      );

    case "menu":
      return (
        <Box flexDirection="column">
          <Text bold>
            {mode.channel} <Text dimColor>{versionsHint(cfg, mode.channel)}</Text>
          </Text>
          <Select<Action>
            items={[
              { label: "🔗 Assign versions", value: "assign" },
              { label: "✎  Rename", value: "rename" },
              { label: "🗑  Delete", value: "delete" },
              { label: "← Back", value: "back" },
            ]}
            onSelect={(action) =>
              action === "back" ? toList() : setMode({ kind: action, channel: mode.channel })
            }
            onCancel={() => toList()}
          />
        </Box>
      );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Channels</Text>
      {notice && <Text color="green">{notice}</Text>}
      <Select<Choice>
        items={[
          { label: "+ Create channel", value: { kind: "create" } },
          ...Object.keys(cfg.channels).map((channel) => ({
            label: channel,
            value: { kind: "channel" as const, channel },
            hint: versionsHint(cfg, channel),
          })),
          { label: "← Back", value: { kind: "back" } },
        ]}
        onSelect={(choice) => {
          if (choice.kind === "back") onBack();
          else if (choice.kind === "create") setMode({ kind: "create" });
          else setMode({ kind: "menu", channel: choice.channel });
        }}
        onCancel={onBack}
      />
    </Box>
  );
}
