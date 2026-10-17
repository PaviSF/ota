import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { Item } from "./Select";

interface Props<T> {
  items: Item<T>[];
  initial?: T[];
  /** Return an error message to keep the list open. */
  onSubmit: (values: T[]) => string | void;
  onCancel?: () => void;
}

export function MultiSelect<T>({ items, initial = [], onSubmit, onCancel }: Props<T>) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(() => new Set(initial));
  const [error, setError] = useState<string>();

  const toggle = (value: T) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
  };

  useInput((input, key) => {
    if (key.upArrow || input === "k") setIndex((index - 1 + items.length) % items.length);
    else if (key.downArrow || input === "j") setIndex((index + 1) % items.length);
    else if (input === " ") toggle(items[index].value);
    else if (input === "a") {
      const all = items.every((i) => selected.has(i.value));
      setSelected(new Set(all ? [] : items.map((i) => i.value)));
    } else if (key.return) {
      const err = onSubmit(items.filter((i) => selected.has(i.value)).map((i) => i.value));
      setError(err || undefined);
    } else if (key.escape) onCancel?.();
  });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text key={i} color={i === index ? "cyan" : undefined}>
          {i === index ? "❯ " : "  "}
          {selected.has(item.value) ? "[x] " : "[ ] "}
          {item.label}
          {item.hint && <Text dimColor>{`  ${item.hint}`}</Text>}
        </Text>
      ))}
      {error && <Text color="red">{error}</Text>}
      <Text dimColor>space toggle · a all · enter confirm · esc back</Text>
    </Box>
  );
}
