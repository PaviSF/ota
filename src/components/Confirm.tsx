import { Text, useInput } from "ink";

interface Props {
  message: string;
  defaultYes?: boolean;
  onAnswer: (yes: boolean) => void;
  /** Esc falls back to answering "no" when not given. */
  onCancel?: () => void;
}

export function Confirm({ message, defaultYes = true, onAnswer, onCancel }: Props) {
  useInput((input, key) => {
    const k = input.toLowerCase();
    if (k === "y") onAnswer(true);
    else if (k === "n") onAnswer(false);
    else if (key.return) onAnswer(defaultYes);
    else if (key.escape) (onCancel ?? (() => onAnswer(false)))();
  });

  return (
    <Text>
      {message} <Text dimColor>{defaultYes ? "(Y/n)" : "(y/N)"}</Text>
    </Text>
  );
}
