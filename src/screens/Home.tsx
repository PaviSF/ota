import { Box, Text } from "ink";
import { Select } from "../components/Select";
import type { OtaConfig } from "../store";
import { versionsHint } from "../types";

export type Destination = "push" | "versions" | "channels" | "assign" | "quit";

interface Props {
  cfg: OtaConfig;
  onSelect: (destination: Destination) => void;
}

export function Home({ cfg, onSelect }: Props) {
  const channels = Object.keys(cfg.channels);
  const width = Math.max(0, ...channels.map((name) => name.length));

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        {channels.length === 0 ? (
          <Text dimColor>No channels yet.</Text>
        ) : (
          channels.map((name) => (
            <Text key={name}>
              {name.padEnd(width)} <Text dimColor>{versionsHint(cfg, name)}</Text>
            </Text>
          ))
        )}
      </Box>
      <Select<Destination>
        items={[
          { label: "🚀 Push update", value: "push" },
          { label: "📦 Versions", value: "versions" },
          { label: "📡 Channels", value: "channels" },
          { label: "🔗 Assign versions to channels", value: "assign" },
          { label: "✕  Quit", value: "quit" },
        ]}
        onSelect={onSelect}
        onCancel={() => onSelect("quit")}
      />
    </Box>
  );
}
