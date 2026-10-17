import { addVersion } from "../store";
import type { ScreenProps } from "../types";
import { TextPrompt } from "./TextPrompt";

interface Props extends Pick<ScreenProps, "update"> {
  hint?: string;
  onAdded: (version: string) => void;
  /** Called on an empty enter; may return an error message. Defaults to onCancel. */
  onEmpty?: () => string | void;
  onCancel: () => void;
}

export function AddVersion({ update, hint, onAdded, onEmpty, onCancel }: Props) {
  return (
    <TextPrompt
      label="Add a version"
      hint={hint ?? "e.g. 1.2.0 · enter add · esc back"}
      onSubmit={(raw) => {
        const version = raw.trim();
        if (!version) return (onEmpty ?? onCancel)();
        const err = update((c) => addVersion(c, version));
        if (err) return err;
        onAdded(version);
      }}
      onCancel={onCancel}
    />
  );
}
