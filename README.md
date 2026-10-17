# ota

Interactive terminal app for pushing EAS OTA updates. It remembers your versions and channels, lets you assign several versions to each channel, and pushes them all in one go. Works on macOS, Linux and Windows.

## Install

```bash
npm i -g github:PaviSF/ota
```

Requires Node 18+ and the [EAS CLI](https://docs.expo.dev/eas-update/getting-started/) (`eas`) on your PATH.

## Usage

Run it anywhere inside an Expo project:

```bash
ota          # home screen
ota push     # jump straight to the push screen
```

On first run it walks you through setup: add versions → create channels → pick the versions for each channel. After that the home screen lets you:

- **🚀 Push update**: pick channels and a message (defaults to the last commit). The last step lists every channel · version · platform, all ticked. Untick anything you want to leave out this time (e.g. android for `1.3.3`). Then confirm, and the updates run one after another with live output. Nothing from that step is saved.
- **📦 Versions**: add or delete versions. Deleting one also removes it from every channel.
- **📡 Channels**: create, rename or delete channels, and assign their versions.
- **🔗 Assign versions to channels**: change which versions each channel gets.

Keys: ↑/↓ move · space toggle · `a` toggle all · enter confirm · esc back.

A version left ticked on both android and ios gets a **single** `eas update` call (no `-p`). One with only one platform ticked gets `-p android` or `-p ios`.

### Without the UI (scripts / CI)

```bash
ota push <channel...> [-p android|ios] [-m "message"] [-y]

ota push staging -y
ota push staging production -p ios -m "fix: crash on login" -y
```

It uses the saved assignments. Without `-p` each version goes to both platforms in one call. Without `-y` it asks for confirmation.

## Data

Everything is stored in `.ota.json` in the project root (next to `app.json` / `app.config.*`). Commit it to share the setup with your team.

```json
{
  "versions": ["1.0.0", "1.0.1"],
  "channels": {
    "staging": ["1.0.0", "1.0.1"],
    "production": ["1.0.0"]
  }
}
```

## Requirements for your app

Each update runs with `APP_VERSION=<version>` in the environment. Your app config must read it:

```ts
// app.config.ts
export default {
  expo: {
    version: process.env.APP_VERSION || "1.0.0",
    // ...
  },
};
```

## Development

`dist/` is committed so installing from GitHub needs no build step. After changing `src/`, run `npm run build` and commit `dist/` too (CI checks it's in sync).

```bash
npm install
npm run dev        # rebuild on change; run with node dist/cli.js
npm test
npm run typecheck
```
