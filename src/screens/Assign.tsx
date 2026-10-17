import { Box, Text } from "ink";
import { useState } from "react";
import { AssignVersions } from "../components/AssignVersions";
import { Select } from "../components/Select";
import { TextPrompt } from "../components/TextPrompt";
import { addChannel } from "../store";
import { versionsHint, type ScreenProps } from "../types";

const BACK = Symbol("back");

export function Assign({ cfg, update, onBack }: ScreenProps) {
  const [channel, setChannel] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const channels = Object.keys(cfg.channels);

  if (channels.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No channels yet. Create one to assign versions to it.</Text>
        <TextPrompt
          label="Create a channel"
          onSubmit={(name) => {
            const err = update((c) => addChannel(c, name));
            if (err) return err;
            setChannel(name.trim());
          }}
          onCancel={onBack}
        />
      </Box>
    );
  }

  if (channel) {
    const back = (message?: string) => {
      setNotice(message);
      setChannel(undefined);
    };
    return (
      <AssignVersions
        cfg={cfg}
        update={update}
        channel={channel}
        onDone={() => back(`Saved versions for ${channel}`)}
        onCancel={() => back()}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Pick a channel to assign versions to</Text>
      {notice && <Text color="green">{notice}</Text>}
      <Select<string | typeof BACK>
        items={[
          ...channels.map((name) => ({ label: name, value: name, hint: versionsHint(cfg, name) })),
          { label: "← Back", value: BACK },
        ]}
        onSelect={(value) => (value === BACK ? onBack() : setChannel(value))}
        onCancel={onBack}
      />
    </Box>
  );
}
