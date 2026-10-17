import type { OtaConfig } from "./store";

/** Applies a store operation and saves it; returns an error message if it failed. */
export type Update = (op: (cfg: OtaConfig) => OtaConfig) => string | undefined;

export interface ScreenProps {
  cfg: OtaConfig;
  update: Update;
  onBack: () => void;
}

export function versionsHint(cfg: OtaConfig, channel: string): string {
  const versions = cfg.channels[channel];
  return versions?.length ? `→ ${versions.join(", ")}` : "(no versions)";
}
