# streamdeck-profiles

Custom Elgato Stream Deck profiles with generated icon sets. Each profile lives in its own folder under `profiles/`, and contains:

- a ready-to-import `.streamDeckProfile`
- the icons (PNG) and their SVG sources
- the scripts that rebuild both

## Profiles

| Profile | Device | Keys | Preview |
|---|---|---|---|
| [Ghostty](profiles/ghostty/) | Stream Deck XL | 32 | <img src="profiles/ghostty/sheet.png" width="360" alt="Ghostty deck"> |
| [Claude](profiles/claude/) | Stream Deck XL | 32 | <img src="profiles/claude/sheet.png" width="360" alt="Claude deck"> |

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
