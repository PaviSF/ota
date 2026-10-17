import { Box, Text, useInput } from "ink";
import { useState } from "react";

export interface Item<T> {
  label: string;
  value: T;
  hint?: string;
}

interface Props<T> {
  items: Item<T>[];
  onSelect: (value: T) => void;
  onCancel?: () => void;
}

export function Select<T>({ items, onSelect, onCancel }: Props<T>) {
  const [cursor, setCursor] = useState(0);
  const index = Math.min(cursor, items.length - 1);

  useInput((input, key) => {
    if (key.upArrow || input === "k") setCursor((index - 1 + items.length) % items.length);
    else if (key.downArrow || input === "j") setCursor((index + 1) % items.length);
    else if (key.return) onSelect(items[index].value);
    else if (key.escape) onCancel?.();
  });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text key={i} color={i === index ? "cyan" : undefined}>
          {i === index ? "❯ " : "  "}
          {item.label}
          {item.hint && <Text dimColor>{`  ${item.hint}`}</Text>}
        </Text>
      ))}
    </Box>
  );
}
