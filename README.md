# streamdeck-profiles

Custom Elgato Stream Deck profiles with generated icon sets. Each profile lives in its own folder under `profiles/`, and contains:

- a ready-to-import `.streamDeckProfile`
- the icons (PNG) and their SVG sources
- the scripts that rebuild both
- an interactive mockup (`index.html`): click a key to see what it sends

## Profiles

| Profile | Device | Keys | Mockup | Preview |
|---|---|---|---|---|
| [Ghostty](profiles/ghostty/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/0b677874-a30c-473f-9104-18c0ce02b17f) · [local](profiles/ghostty/index.html) | <img src="profiles/ghostty/sheet.png" width="360" alt="Ghostty deck"> |
| [Claude](profiles/claude/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/e322b528-abbb-4874-b1f0-8e6d39fe08c3) · [local](profiles/claude/index.html) | <img src="profiles/claude/sheet.png" width="360" alt="Claude deck"> |
| [Safari](profiles/safari/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/589a06e9-d96b-4750-b59f-a9a2613080eb) · [local](profiles/safari/index.html) | <img src="profiles/safari/sheet.png" width="360" alt="Safari deck"> |
| [Microsoft Teams](profiles/teams/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/d6fc463f-ecff-4b2e-b2ad-69d1c72d0579) · [local](profiles/teams/index.html) | <img src="profiles/teams/sheet.png" width="360" alt="Teams deck"> |
| [VS Code](profiles/vscode/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/212e3cf5-5667-4046-bbb9-e25a485e9352) · [local](profiles/vscode/index.html) | <img src="profiles/vscode/sheet.png" width="360" alt="VS Code deck"> |
| [Slack](profiles/slack/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/4877865c-049a-4959-ad8b-acfb9c6b964e) · [local](profiles/slack/index.html) | <img src="profiles/slack/sheet.png" width="360" alt="Slack deck"> |
| [Microsoft Outlook](profiles/outlook/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/c06c47c8-eab6-4ea0-8b83-4f8f52bf87a1) · [local](profiles/outlook/index.html) | <img src="profiles/outlook/sheet.png" width="360" alt="Outlook deck"> |
| [Discord](profiles/discord/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/36be267f-77fe-4bb5-a3e4-572d2e3ef490) · [local](profiles/discord/index.html) | <img src="profiles/discord/sheet.png" width="360" alt="Discord deck"> |
| [Microsoft Word](profiles/word/) | Stream Deck XL | 32 | [live](https://claude.ai/code/artifact/8188ebce-238d-437d-b4ac-860b02ad2787) · [local](profiles/word/index.html) | <img src="profiles/word/sheet.png" width="360" alt="Word deck"> |

The live mockups are private Claude artifacts, so only you can open them unless you share them. The local `index.html` files work offline from a clone.

## Install a profile

Double-click the `.streamDeckProfile` file in a profile's folder, or run:

```bash
open -a "Elgato Stream Deck" profiles/ghostty/Ghostty.streamDeckProfile
```

Then pick the profile in the Stream Deck app's profile dropdown. For app-specific profiles, go to **Preferences → Profiles** and link the profile to its app so it switches in automatically.

## Rebuild

Requirements: Node 18+, and for the Ghostty icons, the [JetBrains Mono Nerd Font](https://www.nerdfonts.com/font-downloads) installed in `~/Library/Fonts`.

```bash
npm install
npm run ghostty
```

`npm run ghostty` regenerates the icons (`gen.mjs`) and then the profile (`profile.mjs`). Each build creates new UUIDs, so re-importing adds a fresh copy of the profile rather than replacing the existing one.

## Adding a profile

AI agents: read [AGENTS.md](AGENTS.md) first. It's the full playbook: where to find an app's real shortcuts, the icon system, how to build and check the profile file, the import steps, and the traps to avoid. `CLAUDE.md` loads it automatically for Claude Code. The short version:

1. Create `profiles/<name>/` with a `gen.mjs` that writes `icons/`, `svg/`, `keymap.json` and `sheet.png`.
2. Copy `profiles/ghostty/profile.mjs`, then update the `KEY`/`SEND` hotkey maps, the profile `Name` and the device model.
3. Add `<name>:icons`, `<name>:profile` and `<name>` scripts to `package.json`, and a row to the table above.

## Profile format notes (Stream Deck 7.x)

Figured out from real ProfilesV3 data and confirmed with a successful import on 7.5.1:

- **Container.** A `.streamDeckProfile` is a zip:
  ```
  package.json
  Profiles/<UUID>.sdProfile/
    manifest.json
    Profiles/<PAGE-UUID>/
      manifest.json
      Images/
  Resources/manifest.json
  ```
- **`package.json`** holds `AppVersion`, `DeviceModel`, `DeviceSettings`, `FormatVersion` (1), `OSType`, `OSVersion` and `RequiredPlugins`.
- **Device models.** Stream Deck XL is `20GAT9901`.
- **Actions.** Keys are addressed as `"col,row"`. Hotkey actions use the plugin `com.elgato.streamdeck.system.hotkey`, with four `Hotkeys` slots (unused slots: `NativeCode: -1`, `QTKeyCode: 33554431`).
- **Modifiers.** `KeyModifiers` is a bitmask: shift = 1, ctrl = 2, option = 4, cmd = 8.
- **Key codes.** `NativeCode` = `VKeyCode` = the macOS virtual keycode. `QTKeyCode` is the Qt key value (the unshifted character).
- **Open Application** (`com.elgato.streamdeck.system.openapp`). Its settings keys are `app_name`, `args`, `bring_to_front`, `bundle_id`, `bundle_path`, `exec`, `is_bundle`, `long_press` and `source`. These are the names Stream Deck 7.5 writes itself. If you use any other names, Stream Deck quietly replaces them with empty values, and the key does nothing.
