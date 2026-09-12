# Building Stream Deck profiles in this repo

This is the playbook for AI agents (and people) adding a profile. It captures how the existing profiles were made: `ghostty`, `claude`, `safari` and `teams`. Follow it end to end. Most of the rules below exist because skipping them once produced a broken or misleading key.

Target hardware: **Stream Deck XL** (8 × 4 keys, model `20GAT9901`), Stream Deck app **7.5.x** on macOS.

## The one rule: ground truth over guesses

Every shortcut on a key must come from **the installed app itself**, not from memory, blog posts, or even the vendor's documentation. Docs are only a cross-check, and when they disagree with the app, the app wins. Microsoft's Teams page, for example, mixes web-app bindings into the Mac list.

The same goes for the Stream Deck file format. Copy structures from real files the Stream Deck app wrote, and never invent field names. A guessed field name was silently blanked on import, and the key did nothing.

## Repo layout

```
profiles/<name>/
  gen.mjs                  renders svg/, icons/, keymap.json, sheet.png
  profile.mjs              packages icons/ + keymap.json into <Name>.streamDeckProfile
  <Name>.streamDeckProfile the importable file (committed)
  icons/NN-<id>.png        288 × 288 key images
  svg/NN-<id>.svg          editable sources
  keymap.json              position, label, keys, source action, category per key
  sheet.png                8 × 4 contact sheet of the real PNGs
  index.html               interactive mockup (uses icons/ relative paths)
  README.md                where the shortcuts come from, layout table, setup notes
tools/nib-shortcuts.py     dumps a native macOS app's menu shortcuts from MainMenu.nib
package.json               <name>:icons, <name>:profile, <name> scripts
README.md                  profile table (with mockup links) + format notes
```

The only dependency is `@resvg/resvg-js`, installed with `npm install`. Start a new profile by copying the closest existing one: `safari` for native apps, `claude` for Electron apps, `teams` for web-client apps.

## Workflow

1. **Get the shortcuts** from the app, using one of the extraction techniques below. Record where each one came from.
2. **Plan the layout**: 32 keys in four rows of eight, one category per row. Key `0,0` is the top-left key: the app's mark, name and "main", as a Switch Profile back to the Main launcher.
3. **Design the icons** from the app's own visual identity, following the icon system below.
4. **Write `gen.mjs`, render, and look at `sheet.png`.** Fix anything that's off before going further.
5. **Write `profile.mjs`, build, and verify the zip** (see Verify).
6. **Write `index.html`** (the mockup) and the profile `README.md`.
7. **Import** with `open -a "Elgato Stream Deck" profiles/<name>/<Name>.streamDeckProfile`. The user has to click the confirmation dialog.
8. **Verify the import** in `ProfilesV3` and the Stream Deck log.
9. **Wire it into the repo**: `package.json` scripts, plus a row in the root README's table.
10. **Commit.**

If the user asks only for a *mockup*, stop after step 6 and get approval before you build, import or commit.

## Getting the shortcuts

Start by checking for user customisations, which override the defaults:
- `defaults read <bundle-id> NSUserKeyEquivalents` and `defaults read -g NSUserKeyEquivalents`
- the app's own config file (for example `~/.config/ghostty/config`)

Then pick the technique that fits the app.

### Apps with a keybind listing command

Ghostty, for example: run `ghostty +list-keybinds --default`. Then diff that against `+list-keybinds`, which includes the user's config, to find any overrides.

### Native AppKit apps (Safari)

Menu shortcuts live in `Contents/Resources/Base.lproj/MainMenu.nib`. That file is **NIBArchive**, not a property list, so `plistlib` can't read it. Use the parser in this repo:

```bash
python3 tools/nib-shortcuts.py "/Applications/Safari.app/Contents/Resources/Base.lproj/MainMenu.nib"
```

It handles two AppKit rules for you:
- An **uppercase key equivalent means ⇧**: `'N'` with a ⌘ mask is ⇧⌘N.
- `NSKeyEquivModMask` bits are ⇧ `1<<17`, ⌃ `1<<18`, ⌥ `1<<19`, ⌘ `1<<20`. A missing mask means ⌘.

Items that the app adds to its menus at runtime (Safari's Web Inspector, for example) aren't in the nib, so leave them out rather than guess.

### Electron apps (Claude desktop)

1. Extract the app bundle's archive:
   ```bash
   npx -y @electron/asar extract <App>/Contents/Resources/app.asar <dir>
   ```
2. Grep `<dir>/.vite/build/*.js` for `accelerator:` to get the native menu shortcuts. Read the surrounding code to see which menu item each one belongs to.
3. Some accelerators are variables. Search for where each is defined, e.g. `sessionPrev:"Command+Shift+["`.
4. In-app shortcuts often live in a separately bundled web UI. For Claude this is `Resources/ion-dist`, where the table `XP={command_palette:{…bindings:[{key,modifiers,platform:"mac"}]}}` and the Keyboard Shortcuts sheet component live.
5. Note shortcuts that only apply in some contexts. For example, ⇧⌘I opens incognito in Chat but the model menu on the Code tab.

### Web-client apps in a native shell (new Teams)

The native menu is generic. The real keymap is in the web client, cached **uncompressed** in the WebView2 profile:

```
~/Library/Containers/com.microsoft.teams2/Data/Library/Application Support/Microsoft/MSTeams/EBWebView/WV2Profile_tfw/Service Worker/CacheStorage
```

Each cache entry is in Chromium's simple-cache format:
- magic bytes `30 5c 72 a7 1b 6d fb fc`
- the key length as a uint32 at byte 12
- the response body starting at byte `20 + keyLen`

Search the bodies for the registration calls (`addHotKey(["shift+cmd+m"],"ToggleMuteCurrentCall")`). Then find the platform switch (`re.isMac ? new x(...) : new k(...)`) and take only the Mac desktop class's bindings. There were four classes: Windows, Mac, web on Mac, and web on Windows.

### VS Code (keybindings compiled into the workbench bundle)

VS Code's native menu accelerators are derived from its keybinding registry, so read the registry itself:

1. Open `Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`. It's minified and about 19 MB, so use Python, not `grep`.
2. Each command registers `keybinding:{primary:N, mac:{primary:M}, when:…}`. On a Mac, `mac.primary` wins when it's present.
3. Decode the numbers:
   - Modifier bits are ⌘ `2048`, ⇧ `1024`, ⌥ `512` and ⌃ `256`.
   - The low bits are a KeyCode. Take the codes from the bundle's own table of `[…,"KeyA",31,"A",…]` rows, where F1 is `59` and `/` is `90`.
   - `mo(a,b)` is a chord. Leave chords out, because a hotkey key sends one combination.
4. Many ids are constants (`id:s5`, or `static{this.ID="…"}`). Resolve them by searching for `s5="workbench.action.splitEditor"`, or search the other way, from `primary:<N>` to the ids near it.
5. Check `~/Library/Application Support/Code/User/keybindings.json` for user overrides. Also check each `~/.vscode/extensions/*/package.json` under `contributes.keybindings` for extension keys and clashes (Claude Code's ⌘Esc came from there).
6. Check `com.apple.symbolichotkeys` for system shortcuts. A missing entry means the macOS default is on. F11 is macOS's default Show Desktop shortcut, so VS Code's Step into (F11) was left out.

### Discord (web client cached in Chromium's HTTP cache)

Discord's native menu (`discord_desktop_core`'s `core.asar`) only adds Preferences ⌘,. The real keymap is in the web client, which the desktop app caches in `~/Library/Application Support/discord/Cache/Cache_Data`:

1. Walk the simple-cache entries. The header here is **24 bytes**, so the key starts at byte 24 and the body at `24 + keyLen`. The body ends at the first EOF record (`d8 41 0d 97 45 6f fa f4`), and the HTTP headers follow it.
2. Keep the `/assets/` entries with `content-type: text/javascript`. Their bodies are brotli, which Node's `zlib.brotliDecompressSync` handles.
3. Several builds may be cached. Pick the `web.*.js` with the highest `buildNumber`.
4. Read the keybind action table: `{[IWg.TOGGLE_MUTE]: {binds: ["mod+shift+m"], …}}`. Some entries reference another module (`_.GY`), so resolve them through `n.d(t,{GY:()=>L})` and `L={binds:…}`. Watch for `isMac() ? […] : […]` binds.
5. `mod` means ⌘ on a Mac (`isMac() ? "cmd" : "ctrl"`). The Keyboard Shortcuts sheet's labels come from the cached English strings bundle, keyed like `"yYsRlD":["Toggle QuickSwitcher"]`.

### Microsoft Word (ask Word's own key table)

Word's nibs have no key equivalents, because Word builds its menus at runtime. Ask the running app instead:

1. Open a blank document (`tell application "Microsoft Word" to make new document`), then close it with `saving no` when you're done.
2. `find key key code N` returns the key binding for a combination, with `command` (for example `Bold`) and `binding key string`.
3. Pass raw integers, because some `WdKey` names in `Word.sdef` have trailing spaces (`f2_key `, `slash_key `) and can't be referenced. `N` is the Windows virtual-key code plus ⌘ 256, ⇧ 512, ⌥ 2048, ⌃ 4096, so ⌘B = 66 + 256.
4. Sweep every key under each modifier combination. Cross-check against the live menu bar, read with System Events (`AXMenuItemCmdChar` / `AXMenuItemCmdModifiers`).
5. Custom key bindings would be in `Normal.dotm` as `word/customizations.xml`.

The `sdef` command needs full Xcode, so read `Contents/Resources/Word.sdef` directly.

### Microsoft Excel (menu bar plus key tests)

Excel's nibs have no key equivalents, and `Excel.sdef` has no key lookup (only `on key`). The live menu bar has just 61 shortcuts. So:

1. Read the menu bar with System Events while a blank workbook is open.
2. Test the rest. Send each candidate key straight to Excel's process with `CGEventPostToPid` (JXA, `CGEventCreateKeyboardEvent` plus flags), so nothing reaches the user's frontmost app. Send it to a fresh `make new workbook`, then read the result back through AppleScript: `value`, `formula`, `number format`, `autofilter mode`, `row height`, `display formulas of active window`, and so on. Close it with `close active workbook saving no`.
3. Use the macOS key codes Stream Deck will send, under the user's real keyboard layout. On British, `⌃⇧#` doesn't exist as ⌃⇧3.
4. Keep anything you can't confirm off the deck. Tests that open a dialog (Create table, Insert) can leave Excel stuck on a modal. If that happens, list the `AXDialog` window's buttons with System Events before touching it.

### Leave out

- **Keys that depend on how the user has arranged the app.** Teams' app bar `⌘1–9`, for example, opens whatever the user has put in each slot.
- **Hold-to-use keys** like push-to-talk. A Stream Deck hotkey only taps.
- **Shortcuts you couldn't find in the app.**

If two keys share one binding, keep both and say so in the notes. Teams' Captions and Accept audio are both ⇧⌘A, for example.

## Stream Deck file format (7.x, ProfilesV3)

The `profile.mjs` files already implement all of this. The full notes are in the root README. The rules that matter:

- **Zip layout:** `package.json`, `Profiles/<UUID>.sdProfile/{manifest.json, Profiles/<PAGE>/{manifest.json, Images/}}`, `Resources/manifest.json`.
- **`package.json` fields:** `AppVersion` (short version + build number, e.g. `7.5.1.22901`), `DeviceModel`, `DeviceSettings: null`, `FormatVersion: 1`, `OSType`, `OSVersion`, `RequiredPlugins`.
- **Profile manifest:** `Device.UUID: ""` (the app fills it in on import). Page UUIDs are lowercase in `Pages`, uppercase as folder names. Include an empty `Default` page.
- **Actions** are keyed `"col,row"`.
- **Hotkey action:** plugin `com.elgato.streamdeck.system.hotkey`, with 4 `Hotkeys` slots. Unused slots are `NativeCode: -1, QTKeyCode: 33554431`.
- **Modifiers:** `KeyModifiers` is a bitmask: shift 1, ctrl 2, option 4, cmd 8. Also set the `KeyCmd`/`KeyShift`/`KeyOption`/`KeyCtrl` booleans to match.
- **Key codes:** `NativeCode` = `VKeyCode` = the macOS virtual keycode (`kVK_*`). `QTKeyCode` is the Qt key for the **unshifted** character; special keys are `0x010000xx` (Escape `0x01000000`, Tab `0x01000001`, Return `0x01000004`, arrows `0x01000012`–`15`).
- **Shifted characters:** send the physical key plus ⇧. A menu shortcut of ⌘+ is sent as ⇧⌘= (AppKit treats the Shift as implied).
- **Open Application action** (`com.elgato.streamdeck.system.openapp`) uses exactly these settings keys: `app_name`, `args`, `bring_to_front`, `bundle_id`, `bundle_path`, `exec`, `is_bundle`, `long_press` (`"quit"`), `source`. These are what the app writes itself. Any other names (the old guess was `path`/`bundleIdentifier`) are replaced with empty values on import, and the key does nothing.
- **Titles:** set `ShowTitle: false`, because the labels are part of the images.
- **Image files** are named with 26 random base-32 characters plus `Z`, e.g. `2BD3…P4Z.png`.
- **UUIDs** are regenerated on every build, so re-importing adds a second copy of the profile rather than replacing the first.

## Icon system

Each tile is a 144 × 144 SVG viewBox rendered to a **288 px** PNG with resvg.

| Element | Spec |
|---|---|
| Glyph | a 64-unit box at `translate(40 14)` (Teams uses 16); strokes 4.2 wide with round caps and joins |
| Label | `y ≈ 106`, about 17.5 px, bold faked with a same-colour `stroke-width 0.55–0.6`; about 15.5 px when longer than 11 characters |
| Shortcut | `y ≈ 127`, about 15 px, in the row's accent colour |
| Top-left key | position `0,0`: the app's own mark, the app name, and `main` on the shortcut line; a Switch Profile back to Main |

Design rules:
- **Base each profile's look on the app**, extracted with `NSWorkspace iconForFile` through JXA (JavaScript for Automation). Past profiles:
  - Ghostty: blue dot-matrix screen with a neon glyph
  - Claude: warm charcoal, paper grain, New York serif
  - Safari: dark glass with a compass bezel
  - Teams: dark Fluent tiles with a selection pill
  - VS Code: Dark Modern greys, Dark+ syntax colours per row, an activity-bar marker at the left edge; Helvetica Neue labels. Keep the shortcut as plain accent text under the label: a filled status-bar strip was tried and rejected because it didn't match the other decks
- **Colour by row**, one accent per category taken from the app's palette. Individual keys can override the colour for meaning: red to leave or decline, green to accept, presence colours for status.
- **Keep labels short** and use sentence case, in the house style of the app.

### Font gotchas (resvg)

- resvg **cannot render SF Pro** (`/System/Library/Fonts/SFNS.ttf`, family name "System Font"). The text silently disappears.
- Use SF Pro Rounded (`.SF NS Rounded`, from `SFNSRounded.ttf`), SF Mono (`.SF NS Mono`), New York, or JetBrainsMono Nerd Font.
- Use the family name from the font's `name` table, not its marketing name.
- To test a font, render sample text with `loadSystemFonts: false` and only that font file loaded, then count the opaque pixels. With system fonts enabled, unknown names fall back silently and look like they work.
- If any glyph in a `<text>` run needs a fallback font, resvg swaps the font for the **whole run**, and `<tspan>` doesn't help. So keep arrows and math signs (← ↑ − +) out of labels and write words instead ("Prev pane", "Zoom out"). Modifier symbols (⌘⇧⌥⌃) are fine in the shortcut line.

### Review

Look at `sheet.png` after every render. Image viewers may cache by path, so copy the sheet to a new filename before looking at it again.

## Verify before importing

Unzip the built profile and check:
- 32 actions and 32 images, with every `States[0].Image` present
- the action types: 31 hotkeys plus 1 Switch Profile on the top-left key, or whatever the plan calls for
- the top-left key's settings: `{DeviceUUID: "", PageIndex: 1, ProfileUUID}`, with `ProfileUUID` empty in the repo's files and Main's id in the backup
- `KeyModifiers`, `NativeCode` and `QTKeyCode` on the tricky keys (shifted characters, Tab, arrows, ⌥ combinations)

## Import and confirm

- `open -a "Elgato Stream Deck" <file>` opens a confirmation dialog that **the user has to click**.
- In `~/Library/Logs/ElgatoStreamDeck/StreamDeck.log`, look for `run_async() import:` followed by `import finished`. If it stops at `import:`, the dialog is still waiting. System Events queries also time out while it's open.
- Confirm in `~/Library/Application Support/com.elgato.StreamDeck/ProfilesV3/` that a new `.sdProfile` with the right `Name` exists, with 32 actions. Re-check the Open Application settings, because the app may rewrite them.
- Never edit `ProfilesV3` directly, and never delete a user's profiles.
- You can't press keys yourself. Ask the user to test the hero key and a few hotkeys.

## Main launcher and the full backup

**Main** (`profiles/main/`) is the home screen. It has one key per deck, each showing the deck's top-left tile with the text removed and the mark scaled to fill the key. Each key is a **Multi Action Switch** whose two lists are the same two steps: Switch Profile to the deck, then Open Application. Both steps are needed. If the app is already in front, macOS reports no app change, so Stream Deck's automatic profile switch never runs.

The action shapes were copied from keys made by hand in the Stream Deck app, not guessed:
- **Switch Profile:** `{DeviceUUID: "", PageIndex: 1, ProfileUUID}`, with a lowercase id.
- **Open Application,** when the app writes it, fills in `exec` (`<bundle>/Contents/MacOS/<CFBundleExecutable>`) and `source` (the bundle path). `profiles/main/profile.mjs` does the same.

**Imports get new profile ids,** so keys that point at other profiles only work from a backup restore. `tools/backup.mjs`:
1. Gives every profile a stable id, derived from its folder name.
2. Runs each profile's own `profile.mjs`, passing `MAIN_PROFILE_UUID` to the decks and `DECK_PROFILE_UUIDS` to Main.
3. Adds `AppIdentifier` and the device serial (read from the installed profiles) to each profile.
4. Zips everything to `build/`, which is git-ignored because the serial must never be committed.

**Adding a deck:**
1. Add it to `APPS` in `profiles/main/gen.mjs` (its position and top-left SVG) and to `DECKS` in `tools/backup.mjs` (its app path).
2. Make its top-left key a Switch Profile, reading `MAIN_PROFILE_UUID`.
3. Run `npm run main && npm run backup`, and have the user restore.
4. Restoring replaces every profile on every device. Say so, and let the user do it.

## Mockup page (`index.html`)

Each mockup shows the same things:
- the XL device drawn with the real `icons/*.png`
- a detail panel for the selected key, showing the key caps, the shortcut's source (menu path, command id or shortcut id), and a note
- the category list
- the full keymap table

Give each app a header motif from its own world: a terminal prompt (Ghostty), a composer box (Claude), an address bar (Safari), a meeting control bar (Teams). Add a context filter when keys depend on context (Claude: chat or code; Teams: meeting, incoming call, chat, or anywhere). Keep the data as an inline array. Support light and dark themes, unless the design is deliberately single-theme.

When publishing as a Claude artifact:
- publish a **scratchpad copy** of `index.html` + `icons/`, because the tool rejects source roots outside its working directory
- map `icons/NN-<id>.png` in `files`
- add the live link to the profile README and the root README table

## Wiring it into the repo

- `package.json`: add `"<name>:icons": "node profiles/<name>/gen.mjs"`, `"<name>:profile": "node profiles/<name>/profile.mjs"`, and `"<name>": "npm run <name>:icons && npm run <name>:profile"`.
- Root README: add a table row with the device, the key count, `[live](…) · [local](profiles/<name>/index.html)`, and the `sheet.png` preview.
- Profile README: say where the shortcuts came from (be specific), include the 4 × 8 layout table and the mockup link, and add setup notes:
  - what the hero key does and how to re-pick the app if it fails
  - link the profile to the app under Preferences → Profiles
  - which keys depend on context or share a binding
  - what was left out, and why

## Environment gotchas (this Mac)

- `ls` is aliased to `eza`, which adds icon glyphs and quotes to its output. Capturing its output into a path breaks, so use `/bin/ls` or literal paths.
- `grep` is `ugrep`, which rejects complex patterns. Use `/usr/bin/grep` or Python.
- There is **no `timeout` command**. Wrapping a command in `timeout … 2>/dev/null` silently produces empty results.
- In zsh, quote globs inside arguments, e.g. `--include='*.js'`.
- Shell working directory can reset between commands, so use absolute paths.
