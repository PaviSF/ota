import os from "node:os";
import path from "node:path";
import { Box, Text, useApp } from "ink";
import { useCallback, useRef, useState } from "react";
import { Confirm } from "./components/Confirm";
import { Assign } from "./screens/Assign";
import { Channels } from "./screens/Channels";
import { Home, type Destination } from "./screens/Home";
import { Push } from "./screens/Push";
import { Setup } from "./screens/Setup";
import { Versions } from "./screens/Versions";
import { CONFIG_FILE, emptyConfig, isEmptyConfig, saveConfig, type OtaConfig } from "./store";
import type { Update } from "./types";

const HOME = os.homedir();

type Screen = "intro" | "setup" | "home" | Exclude<Destination, "quit">;

interface Props {
  root: string;
  /** null when the project has no config file yet. */
  initialConfig: OtaConfig | null;
  defaultMessage: string;
  /** Where to land once the project is set up (`ota push` opens Push directly). */
  start?: "home" | "push";
}

export function App({ root, initialConfig, defaultMessage, start = "home" }: Props) {
  const { exit } = useApp();
  const [cfg, setCfg] = useState(initialConfig ?? emptyConfig());
  const cfgRef = useRef(cfg);
  const [screen, setScreen] = useState<Screen>(
    initialConfig === null ? "intro" : isEmptyConfig(initialConfig) ? "setup" : start,
  );

  const update: Update = useCallback(
    (op) => {
      try {
        const next = op(cfgRef.current);
        saveConfig(root, next);
        cfgRef.current = next;
        setCfg(next);
      } catch (err) {
        return (err as Error).message;
      }
    },
    [root],
  );

  const home = () => setScreen("home");
  const props = { cfg, update, onBack: home };

  const body = (() => {
    switch (screen) {
      case "intro":
        return (
          <Confirm
            message={`No ${CONFIG_FILE} found. Set it up now?`}
            onAnswer={(yes) => (yes ? setScreen("setup") : exit())}
          />
        );
      case "setup":
        return <Setup {...props} />;
      case "home":
        return <Home cfg={cfg} onSelect={(d) => (d === "quit" ? exit() : setScreen(d))} />;
      case "push":
        return <Push {...props} root={root} defaultMessage={defaultMessage} />;
      case "versions":
        return <Versions {...props} />;
      case "channels":
        return <Channels {...props} />;
      case "assign":
        return <Assign {...props} />;
    }
  })();

  return (
    <Box flexDirection="column" paddingX={1} gap={1}>
      <Text>
        <Text bold color="cyan">
          ota
        </Text>
        <Text> · {path.basename(root)} </Text>
        <Text dimColor>({root.startsWith(HOME) ? "~" + root.slice(HOME.length) : root})</Text>
      </Text>
      {body}
    </Box>
  );
}
