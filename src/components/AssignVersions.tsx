import { Box, Text } from "ink";
import { useState } from "react";
import { assignVersions } from "../store";
import type { ScreenProps } from "../types";
import { AddVersion } from "./AddVersion";
import { MultiSelect } from "./MultiSelect";

interface Props extends Pick<ScreenProps, "cfg" | "update"> {
  channel: string;
  onDone: (versions: string[]) => void;
  onCancel: () => void;
}

/** Picks the versions for one channel, offering to add a version first when there are none. */
export function AssignVersions({ cfg, update, channel, onDone, onCancel }: Props) {
  const [addKey, setAddKey] = useState(0);

  if (cfg.versions.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No versions yet. Add one to assign it to {channel}.</Text>
        <AddVersion
          key={addKey}
          update={update}
          onAdded={() => setAddKey(addKey + 1)}
          onCancel={onCancel}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Versions for {channel}</Text>
      <MultiSelect
        items={cfg.versions.map((v) => ({ label: v, value: v }))}
        initial={cfg.channels[channel] ?? []}
        onSubmit={(versions) => {
          const err = update((c) => assignVersions(c, channel, versions));
          if (err) return err;
          onDone(versions);
        }}
        onCancel={onCancel}
      />
    </Box>
  );
}
