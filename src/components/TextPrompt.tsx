import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";

interface Props {
  label: string;
  initial?: string;
  hint?: string;
  /** Return an error message to keep the prompt open. */
  onSubmit: (value: string) => string | void;
  onCancel?: () => void;
}

export function TextPrompt({ label, initial = "", hint, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();

  useInput((_, key) => {
    if (key.escape) onCancel?.();
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{label}: </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={(v) => setError(onSubmit(v) || undefined)}
        />
      </Box>
      {error && <Text color="red">{error}</Text>}
      <Text dimColor>{hint ?? "enter confirm · esc back"}</Text>
    </Box>
  );
}
