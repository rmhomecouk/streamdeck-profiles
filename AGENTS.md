# Building Stream Deck profiles in this repo

This is the playbook for AI agents (and people) who add or change profiles here. Read it before touching anything. Most of the rules below exist because skipping them once produced a broken or misleading key.

Target hardware: **Stream Deck XL** (8 × 4 keys, model `20GAT9901`), Stream Deck app **7.5.x** on macOS.

The repo holds one **app deck** per app (Ghostty, VS Code, Claude, Safari, Slack, Teams, Outlook, Discord, Word, Excel) and a **Main** launcher. Each deck is linked to its app, so it appears when that app is in front. Main appears for every other app, with one key per deck. The top-left key of every deck goes back to Main. Everything reaches the user's Stream Deck through **one backup file** that the user restores.

## The one rule: ground truth over guesses

Every shortcut on a key must come from **the installed app itself**, not from memory, blog posts, or even the vendor's documentation. Docs are only a cross-check, and when they disagree with the app, the app wins. Microsoft's Teams page, for example, mixes web-app bindings into the Mac list.

The same goes for the Stream Deck file format. Copy structures from real files the Stream Deck app wrote, and never invent field names. A guessed field name was silently blanked on import, and the key did nothing. When you need an action type nobody has used yet, ask the user to make one such key by hand in the Stream Deck app, then read what it saved in `ProfilesV3`.

## How the user works

- **"Mockup a profile for X"** means build the mockup only: `gen.mjs`, the icons and `sheet.png`, `index.html`, the profile README, and a published artifact. Then **stop and wait for approval**. Don't write `profile.mjs`, deploy or commit.
- **"Build it and push"** (or "do it", "all good") means finish the job: write `profile.mjs`, wire the deck into the repo and the launcher, build, verify, rebuild the backup, commit and push, then hand the restore to the user.
- **Change requests on a mockup** ("remove the text", "move it to row 2") mean updating the mockup and republishing the same artifact. Don't build until approved.
- Keep the **tile layout consistent across decks**: the glyph, then the key's name as large as it fits (`fitLabel` in `tools/tile.mjs`). **No shortcut text on the keys**: the user asked for them off so the names can be bigger. The shortcuts live in the README table and the mockup page. Per-app flavour belongs in the palette, glyphs and one small edge mark, not in the tile structure.
- **The top-left key and the launcher show the same icon**: the app's mark filling the key, with no text.
- Say what you're doing in short updates. Summarise results in plain language: what changed, what the user needs to do, what's still unverified.

## Safety rules

- **The repo is public.** Never commit secrets, device serials, personal paths (`/Users/<name>`) or email addresses. Before every push, scan the staged diff (see *Commit and push*).
- **Never edit `ProfilesV3` directly, and never delete the user's profiles.** Changes reach the Stream Deck only through a backup restore or an import, and **the user** performs the restore, which deletes their current profiles. Reading `ProfilesV3` is fine.
- **Scratch work in other apps** (a test document or workbook) must be yours, unsaved, and closed with `saving no`. Send test keystrokes only to the app's process (`CGEventPostToPid`), never to whatever is frontmost. Check what's open before closing anything.

## Repo layout

```
profiles/<deck>/
  gen.mjs                  renders svg/, icons/, keymap.json, sheet.png
  profile.mjs              packages icons/ + keymap.json into <Name>.streamDeckProfile
  <Name>.streamDeckProfile the importable file (committed)
  icons/NN-<id>.png        288 × 288 key images
  svg/NN-<id>.svg          editable sources; svg/01-<id>.svg is the top-left tile the launcher reuses
  keymap.json              position, label, keys, source action, category per key
  sheet.png                8 × 4 contact sheet of the real PNGs
  index.html               interactive mockup (uses icons/ relative paths)
  README.md                where the shortcuts come from, layout table, setup notes
profiles/main/             the Main launcher: gen.mjs (APPS list), profile.mjs (Multi Action keys), mockup, README
tools/backup.mjs           builds build/streamdeck-profiles.streamDeckProfilesBackup with every profile
tools/nib-shortcuts.py     dumps a native macOS app's menu shortcuts from its nibs
build/                     backup output; git-ignored because a backup carries the device serial
package.json               <deck>:icons, <deck>:profile, <deck>, main, backup scripts
README.md                  profile table (with mockup links), install steps, format notes
```

The only dependency is `@resvg/resvg-js`, installed with `npm install`. Start a new deck by copying the closest existing one: `safari` or `outlook` for native apps, `claude` for Electron apps, `teams`, `slack` or `discord` for web-client apps, `word` or `excel` for Office.

## Recipes

### Add a new app deck

**Mockup phase** (stop at the end and wait for approval):
1. **Get the shortcuts** from the installed app (see *Getting the shortcuts*). Record where each one came from.
2. **Plan the layout:** 32 keys in four rows of eight, one category per row. Key `0,0` is the **top-left key**: the app's mark filling the key, with no text. It goes back to Main. In `gen.mjs` it has `hero: true` and `keys: 'main'` (the keymap and the mockup page use that; the key doesn't print it).
3. **Design the icons** from the app's own icon and palette (see *Icon system*). The top-left tile must follow the rules in *Top-left tile*, so the launcher can reuse it.
4. **Write `gen.mjs`, render, and look at `sheet.png`.** Fix anything that's off before going further.
5. **Write `index.html`** (the mockup) and the profile `README.md`, with Status set to "Mockup only".
6. **Publish the mockup** as an artifact (see *Mockup page*), and put the live link in the profile README.

**Build phase** (after "build it and push"):
1. **Write `profile.mjs`** by copying the closest deck's. Update `KEY`, `SEND`, the output filename, the profile `Name`, and the `isMain` id of the top-left key. The top-left key is a Switch Profile that reads `MAIN_PROFILE_UUID`, so leave that code as it is.
2. **Wire it in:**
   - `package.json`: add `<deck>:icons`, `<deck>:profile` and `<deck>`.
   - Root README: add a table row.
   - Profile README: replace Status with the Install section (see *Profile README*).
3. **Add it to the launcher:**
   - `APPS` in `profiles/main/gen.mjs`: id, label, profile Name, `svg/01-*.svg` path, row, column and bundle path. The keys are a centred block in columns 2–7 of rows 2 and 3, arranged by the user. The block is full, so ask the user where a new key goes. If the user rearranges Main in the Stream Deck app, read the positions (`"col,row"` keys of `Controllers[0].Actions`) from that profile's page manifest in ProfilesV3, without editing anything, and copy them into `APPS` and the mockup's `K`.
   - `DECKS` in `tools/backup.mjs`: dir, profile Name and app path. The Name must match the deck's `profile.mjs` and the launcher's `APPS` entry.
   - Update `profiles/main/index.html` (the `K` array) and the launcher README's layout table.
4. **Build:** run `npm run <deck>`, then `npm run main`. Look at `profiles/main/sheet.png`, and check that `cmp profiles/<deck>/icons/01-*.png profiles/main/icons/NN-<deck>.png` reports no difference.
5. **Verify** the deck's zip (see *Verify a build*).
6. **Deploy** (see *Deploy to the user's Stream Deck*), then **commit and push**.

### Change an existing deck

1. Edit its `gen.mjs` and/or `profile.mjs`. Re-check any changed shortcut against the installed app.
2. Run `npm run <deck>` and look at `sheet.png`.
3. If the top-left tile changed, run `npm run main` and check the launcher sheet.
4. Update the deck's README table, `index.html` and notes to match.
5. If the deck has a live mockup artifact, republish it from a scratchpad copy so it doesn't go stale.
6. Verify, deploy, commit and push.

### Change the launcher

- **Layout or keys:** edit `APPS` in `profiles/main/gen.mjs`, plus the `K` array in `index.html` and the README table. Run `npm run main`.
- **Tile look:** the launcher copies each deck's `svg/01-*.svg` unchanged, so change a launcher icon by changing that deck's top-left tile in its `gen.mjs`, then run the deck and `npm run main`.
- **Behaviour:** `profiles/main/profile.mjs` builds each key as a Multi Action Switch whose two lists are the same two steps: Switch Profile to the deck, then Open Application.
- Then run `npm run backup`, deploy, commit and push. Republish the launcher artifact (same scratchpad path, so the same URL).

## Deploy to the user's Stream Deck

**Always deploy through the backup.** Importing a `.streamDeckProfile` gives the profile a **new id** (verified), which breaks every key that points at another profile, and re-importing leaves "<Name> copy" duplicates. A backup restore **keeps the ids it's given** (verified on 2026-09-12: all 11 profiles came back with their stable ids and app links).

1. Run `npm run backup`. `tools/backup.mjs`:
   - builds every profile with its own `profile.mjs`
   - gives each one a stable id: `sha1("streamdeck-profiles/<folder>")`, formatted as a UUID
   - points each deck's top-left key at Main, and Main's keys at the decks
   - adds `AppIdentifier` (the app path, `*` for Main) and the device serial, read from the installed profiles
   - writes `build/streamdeck-profiles.streamDeckProfilesBackup`
2. **Verify the backup** before handing it over. Unzip it and check:
   - every profile is present, with its stable id, `AppIdentifier` and a serial in `Device.UUID`
   - each deck has 32 actions, and its `0,0` key is a Switch Profile to Main's id
   - each Main key switches to an id that exists in the backup, and its Open Application `exec` path exists on disk
   - no `States[].Image` is missing
3. **Hand the restore to the user.** Reveal the file with `open -R build/streamdeck-profiles.streamDeckProfilesBackup`, then tell them the path in the app: **Preferences → Profiles → Restore from Backup**. Warn them it **replaces every profile on every device** and can't be undone in the app. Stream Deck's own daily backups are in `~/Library/Application Support/com.elgato.StreamDeck/BackupV3`.
4. **Check after the restore.**
   - The log (`~/Library/Logs/ElgatoStreamDeck/StreamDeck.log`) shows `start restoring from backup` followed by `restore finished: success`.
   - `ProfilesV3` contains exactly the backup's profiles, under the stable ids, with the right `AppIdentifier`.
   - You can't press keys yourself, so ask the user to test Main, a deck's top-left key, and a few hotkeys.

**Single-profile import** is only for someone else using one deck, or for debugging. Use `open -a "Elgato Stream Deck" <file>`; the user clicks the confirmation dialog, and the log shows `run_async() import:` then `import finished`. A standalone deck's top-left key has no target, and the user picks Main for it.

## Commit and push

1. Make sure `build/` is still ignored: `git check-ignore -q build/streamdeck-profiles.streamDeckProfilesBackup`.
2. Stage, then scan the staged diff. **Push only if the scan is clean.**
   ```bash
   git add -A
   git diff --cached -U0 | /usr/bin/grep -n -E '/Users/|@\(1\)\[|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[a-z]{2,}' | /usr/bin/grep -v '^[0-9]*:[-+][-+][-+] '
   ```
   The patterns catch personal paths, the device serial (`@(1)[…]` is how it looks in a manifest) and email addresses. Also check for the user's name or email handle if you know them, but never write them into the repo.
3. Commit with a message that says what changed and why, ending with the co-author line from the session's attribution instructions. Then push.

## Getting the shortcuts

Start by checking for user customisations, which override the defaults:
- `defaults read <bundle-id> NSUserKeyEquivalents` and `defaults read -g NSUserKeyEquivalents`
- the app's own config file (for example `~/.config/ghostty/config`)
- the user's keyboard layout (`defaults read com.apple.HIToolbox AppleSelectedInputSources`). This Mac uses **British**, so shifted symbols sit on different keys than on US layouts.

Then pick the technique that fits the app.

### Apps with a keybind listing command

Ghostty, for example: run `ghostty +list-keybinds --default`. Then diff that against `+list-keybinds`, which includes the user's config, to find any overrides.

### Native AppKit apps (Safari, Outlook, Mail)

Menu shortcuts live in compiled nibs in `Contents/Resources/Base.lproj/`: `MainMenu.nib` for Safari, and several nibs (`OutlookApp`, `DocumentMenus`, `ViewMenus`, …) for Outlook. The files are **NIBArchive**, not property lists, so `plistlib` can't read them. Use the parser in this repo:

```bash
python3 tools/nib-shortcuts.py "/Applications/Safari.app/Contents/Resources/Base.lproj/MainMenu.nib"
```

It handles two AppKit rules for you:
- An **uppercase key equivalent means ⇧**: `'N'` with a ⌘ mask is ⇧⌘N.
- `NSKeyEquivModMask` bits are ⇧ `1<<17`, ⌃ `1<<18`, ⌥ `1<<19`, ⌘ `1<<20`. A missing mask means ⌘.

Items that the app adds to its menus at runtime (Safari's Web Inspector, for example) aren't in the nib, so leave them out rather than guess.

Then **confirm every key in the live menu bar** (next section). The nib can be stale: Mail 16's nib still lists Open Quickly `⇧⌘O` and full screen `⌃⌘F`, but the live menus have no Open Quickly, and full screen is 🌐F (modifiers value 24), which a Stream Deck hotkey can't send. Walking every menu through System Events takes minutes, so query one top-level menu at a time in bulk: `menuItems.name()` and `menuItems.attributes.byName('AXMenuItemCmdChar').value()`.

### Apps that build their menus at runtime

Read the live menu bar with System Events while the app is running, with a document open so the document menus fill in. Each menu item has `AXMenuItemCmdChar`, `AXMenuItemCmdVirtualKey` and `AXMenuItemCmdModifiers`. The modifiers value is a bitmask: ⇧ 1, ⌥ 2, ⌃ 4, and 8 means *no* ⌘. Launch the app in the background (`open -g -a`), and quit it afterwards if it wasn't running before.

### Electron apps (Claude desktop)

1. Extract the app bundle's archive:
   ```bash
   npx -y @electron/asar extract <App>/Contents/Resources/app.asar <dir>
   ```
2. Grep `<dir>/.vite/build/*.js` for `accelerator:` to get the native menu shortcuts. Read the surrounding code to see which menu item each one belongs to.
3. Some accelerators are variables. Search for where each is defined, e.g. `sessionPrev:"Command+Shift+["`.
4. In-app shortcuts often live in a separately bundled web UI. For Claude this is `Resources/ion-dist`, where the table `XP={command_palette:{…bindings:[{key,modifiers,platform:"mac"}]}}` and the Keyboard Shortcuts sheet component live.
5. Note shortcuts that only apply in some contexts. For example, ⇧⌘I opens incognito in Chat but the model menu on the Code tab.

### Web-client apps in a native shell (new Teams, Slack)

The native menu is generic. The real keymap is in the web client, cached **uncompressed** in the app's Service Worker cache. For Teams:

```
~/Library/Containers/com.microsoft.teams2/Data/Library/Application Support/Microsoft/MSTeams/EBWebView/WV2Profile_tfw/Service Worker/CacheStorage
```

Each cache entry is in Chromium's simple-cache format:
- magic bytes `30 5c 72 a7 1b 6d fb fc`
- the key length as a uint32 at byte 12
- the key, then the response body. The header before the key was 20 bytes in the Teams cache and **24 bytes** in Discord's. If the first key starts with stray bytes, or bodies won't decompress, try the other offset.

Search the bodies for the registration calls (`addHotKey(["shift+cmd+m"],"ToggleMuteCurrentCall")`). Then find the platform switch (`re.isMac ? new x(...) : new k(...)`) and take only the Mac desktop class's bindings. There were four classes: Windows, Mac, web on Mac, and web on Windows.

Slack's cache is `~/Library/Application Support/Slack/Service Worker/CacheStorage`. The `gantry-v2-shared-boot-async` bundle holds the menu template (`accelerator:"CmdOrCtrl+K"`), the global shortcut table (`{id, keys:["mod+k"]}`) and the Keyboard Shortcuts sheet.

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
4. Sweep every key under each modifier combination. Cross-check against the live menu bar.
5. Custom key bindings would be in `Normal.dotm` as `word/customizations.xml`.

The `sdef` command needs full Xcode, so read `Contents/Resources/Word.sdef` directly.

### Microsoft Excel (menu bar plus key tests)

Excel's nibs have no key equivalents, and `Excel.sdef` has no key lookup (only `on key`). The live menu bar has just 61 shortcuts. So:

1. Read the menu bar with System Events while a blank workbook is open.
2. Test the rest. Send each candidate key straight to Excel's process with `CGEventPostToPid` (JXA, `CGEventCreateKeyboardEvent` plus flags), so nothing reaches the user's frontmost app. Send it to a fresh `make new workbook`, then read the result back through AppleScript: `value`, `formula`, `number format`, `autofilter mode`, `row height`, `display formulas of active window`, and so on. Close it with `close active workbook saving no`.
3. Use the macOS key codes Stream Deck will send, under the user's real keyboard layout. On British, `⌃⇧#` doesn't exist as ⌃⇧3.
4. Keep anything you can't confirm off the deck. Tests that open a dialog (Create table, Insert) can leave Excel stuck on a modal, which then blocks closing and quitting. If that happens, list the `AXDialog` window's buttons with System Events before touching it.

### Microsoft PowerPoint (live menu bar)

PowerPoint's nibs have no key equivalents, and `PowerPoint.sdef` has no key lookup. Its live menu bar is rich (90+ shortcuts), so a whole deck can come from it without key tests:

1. If PowerPoint isn't running, launch it in the background (`open -g -a "Microsoft PowerPoint"`), then `make new presentation`.
2. Read each top-level menu in bulk with System Events, plus one level of submenus.
3. Close the scratch deck with `close active presentation saving no`. Quit PowerPoint if it wasn't running before.

Watch the modifier values: 8 means *no* ⌘, so 10 is ⌥ alone (Presenter View ⌥↩) and 12 is ⌃ alone (Replace ⌃H). Some item titles depend on the selection (⇧⌘V reads "Apply To Defaults" with nothing selected), so leave those out.

### Leave out

- **Keys that depend on how the user has arranged the app.** Teams' app bar `⌘1–9`, for example, opens whatever the user has put in each slot.
- **Hold-to-use keys** like push-to-talk. A Stream Deck hotkey only taps.
- **Keys macOS takes first**: F11 (Show Desktop), ⌃Space (input source), ⌃↑/⌃↓ and ⌃1–4 (Mission Control), unless the user has turned those off.
- **Shortcuts you couldn't find or confirm in the app.**

If two keys share one binding, keep both and say so in the notes. Teams' Captions and Accept audio are both ⇧⌘A, for example.

## Stream Deck file format (7.x, ProfilesV3)

The `profile.mjs` files and `tools/backup.mjs` already implement all of this. The full notes are in the root README. The rules that matter:

- **Profile zip (`.streamDeckProfile`):** `package.json`, `Profiles/<UUID>.sdProfile/{manifest.json, Profiles/<PAGE>/{manifest.json, Images/}}`, `Resources/manifest.json`.
- **`package.json` fields:** `AppVersion` (short version + build number, e.g. `7.5.1.22901`), `DeviceModel`, `DeviceSettings: null`, `FormatVersion: 1`, `OSType`, `OSVersion`, `RequiredPlugins`.
- **Profile manifest:** `Device.UUID: ""` in an import package (the app fills it in on import). Page UUIDs are lowercase in `Pages`, uppercase as folder names. Include an empty `Default` page.
- **Backup zip (`.streamDeckProfilesBackup`):** uncompressed, holding `Resources/manifest.json` plus `Profiles/<ID>.sdProfile/` folders, with no `package.json`. Each profile manifest adds `AppIdentifier` (an app path, or `*` for other applications) and the device serial in `Device.UUID`. Model the output on the app's own backups in `BackupV3`.
- **Actions** are keyed `"col,row"`.
- **Hotkey action:** plugin `com.elgato.streamdeck.system.hotkey`, with 4 `Hotkeys` slots. Unused slots are `NativeCode: -1, QTKeyCode: 33554431`.
- **Modifiers:** `KeyModifiers` is a bitmask: shift 1, ctrl 2, option 4, cmd 8. Also set the `KeyCmd`/`KeyShift`/`KeyOption`/`KeyCtrl` booleans to match.
- **Key codes:** `NativeCode` = `VKeyCode` = the macOS virtual keycode (`kVK_*`). `QTKeyCode` is the Qt key for the **unshifted** character; special keys are `0x010000xx` (Escape `0x01000000`, Tab `0x01000001`, Return `0x01000004`, arrows `0x01000012`–`15`, F11 `0x0100003a`).
- **Shifted characters:** send the physical key plus ⇧. A menu shortcut of ⌘+ is sent as ⇧⌘= (AppKit treats the Shift as implied).
- **Switch Profile** (`com.elgato.streamdeck.profile.rotate`): `{DeviceUUID: "", PageIndex: 1, ProfileUUID: "<target id, lowercase>"}`.
- **Multi Action Switch** (`com.elgato.streamdeck.multiactions.routine2`, plugin `com.elgato.streamdeck.multiactions`): `Actions: [{Actions: [...]}, {Actions: [...]}]`, one list per state, alternating on each press. It has two `States`. Put the same steps in both lists.
- **Open Application** (`com.elgato.streamdeck.system.openapp`) uses exactly these settings keys: `app_name`, `args`, `bring_to_front`, `bundle_id`, `bundle_path`, `exec`, `is_bundle`, `long_press` (`"quit"`), `source`. When the app writes it, `exec` is `<bundle>/Contents/MacOS/<CFBundleExecutable>` and `source` is the bundle path. Any other names (the old guess was `path`/`bundleIdentifier`) are replaced with empty values on import, and the key does nothing.
- **Changing a key's action in the Stream Deck app wipes its image.** Tell the user to drag the PNG from `icons/` back onto the key.
- **Titles:** set `ShowTitle: false`, because the labels are part of the images.
- **Image files** are named with 26 random base-32 characters plus `Z`, e.g. `2BD3…P4Z.png`.

## Icon system

Each tile is a 144 × 144 SVG viewBox rendered to a **288 px** PNG with resvg.

| Element | Spec |
|---|---|
| Glyph | a 64-unit group at `translate(40 14)` (Teams and Outlook use 16); strokes 4.2 wide with round caps and joins |
| Name | `fitLabel(label, { family, weight, font: FONT })` from `tools/tile.mjs` returns one or two `{ text, size, y }` lines, centred in the space under the glyph (y 84–134, 118 wide). Names go up to 24 px on one line. Below 22 px they split onto two lines at the space that keeps them biggest. A single long word just shrinks ("Strikethrough"). Bold is faked with a same-colour `stroke-width 0.25–0.6`. Pass `{ glyphBottom: 80 }` when the glyph sits at `translate(40 16)` |
| Shortcut | **not drawn.** It stays in `keymap.json`, the README table and the mockup page |
| Edge mark | one small per-deck flourish (Teams' top pill, VS Code's activity bar, Slack's `#`, Outlook's chevron, Discord's status dot, Word's ¶, Excel's cell) |

`fitLabel` measures each name with resvg itself (`getBBox`), so the size matches the render. Use it for every deck; don't hand-pick label sizes.

### Top-left tile

Key `0,0` on every deck (`hero: true`):
- shows only the app's own mark, scaled to fill the key: its glyph group uses `HERO_GLYPH` (`translate(12 12) scale(1.875)`) from `tools/tile.mjs`
- has no name, no edge mark, and a slightly brighter background than the other tiles
- is a **Switch Profile to Main** in `profile.mjs` (`isMain`), never an Open Application or a hotkey

The launcher copies `svg/01-<id>.svg` unchanged, so the deck and Main show the same icon. Draw the mark so it reads at full size (Ghostty's is its app icon, the solid ghost with the prompt).

### Design rules

- **Base each deck's look on the app,** using its icon (extracted with `NSWorkspace iconForFile` through JXA) and its UI palette or colour tokens. Past decks:
  - Ghostty: blue dot-matrix screen with a neon glyph
  - Claude: warm charcoal, paper grain, New York serif
  - Safari: dark glass with a compass bezel
  - Teams: dark Fluent tiles with a selection pill
  - VS Code: Dark Modern greys, Dark+ syntax colours per row, an activity-bar mark, Helvetica Neue
  - Slack: aubergine, with the logo's four colours by row
  - Outlook: navy, the envelope's blues and violets by row
  - Discord: its dark greys, blurple plus presence colours by row, a status dot
  - Word, Excel and PowerPoint: the icon's colours by row, Aptos (which ships in the app's `Resources/DFonts`)
  - Mail: the navy of Mail's sidebar, Mail's flag colours by row, a small flag in the corner
- **Colour by row,** one accent per category taken from the app's palette. Individual keys can override the colour for meaning: red to leave or decline, green to accept, presence colours for status.
- **Keep labels short** and use sentence case, in the house style of the app.

### Font gotchas (resvg)

- resvg **cannot render SF Pro** (`/System/Library/Fonts/SFNS.ttf`, family name "System Font"). The text silently disappears.
- Use SF Pro Rounded (`.SF NS Rounded`, from `SFNSRounded.ttf`), SF Mono (`.SF NS Mono`), Helvetica Neue, New York, JetBrainsMono Nerd Font, or an app's bundled font (Aptos).
- Use the family name from the font's `name` table, not its marketing name.
- To test a font, render sample text with `loadSystemFonts: false` and only that font file loaded, then count the opaque pixels. With system fonts enabled, unknown names fall back silently and look like they work.
- If any glyph in a `<text>` run needs a fallback font, resvg swaps the font for the **whole run**, and `<tspan>` doesn't help. So keep arrows and math signs (← ↑ − +) out of labels and write words instead ("Prev pane", "Zoom out").
### Review

Look at `sheet.png` after every render. Image viewers may cache by path, so copy the sheet to a new filename in the scratchpad before looking at it again.

## Verify a build

Unzip the built deck and check:
- 32 actions and 32 images, with every `States[].Image` present
- the action types: 31 hotkeys plus 1 Switch Profile on `0,0`, or whatever the plan calls for
- the top-left key's settings: `{DeviceUUID: "", PageIndex: 1, ProfileUUID}`, with `ProfileUUID` empty in the repo's file (the backup fills in Main's id)
- `KeyModifiers`, `NativeCode` and `QTKeyCode` on the tricky keys: shifted characters, Tab, arrows, F-keys, ⌥ and ⌃ combinations

For the launcher: every key is a `routine2` with both lists identical, and the Open Application `exec` path exists.

## Mockup page (`index.html`)

Each mockup shows the same things:
- the XL device drawn with the real `icons/*.png`
- a detail panel for the selected key, showing the key caps, the shortcut's source (menu path, command id or shortcut id), and a note
- the category list
- the full keymap table

Give each app a header motif from its own world: a terminal prompt (Ghostty), a composer box (Claude), an address bar (Safari), a meeting control bar (Teams), a channel sidebar (Slack, Discord), the ribbon (Word), the formula bar and sheet tabs (Excel), a Dock (Main). Add a context filter when keys depend on context. Keep the data as an inline array. Support light and dark themes.

When publishing as a Claude artifact:
- publish a **scratchpad copy** of `index.html` + `icons/`, because the tool rejects source roots outside its working directory
- map each `icons/NN-<id>.png` in `files`. When icons are renamed, map the old names to `null`
- republish from the same scratchpad path to keep the same URL
- add the live link to the profile README and the root README table

## Profile README

- **Where the shortcuts came from:** the app version, the exact technique and the files read, and any user overrides you checked.
- **Install:** the single-profile import command, plus bullets for:
  - **Top-left key:** it goes back to Main. In the full setup (`npm run backup`) it already points at Main; imported on its own, the user picks Main for it.
  - **Link the profile** to the app under Preferences → Profiles (only needed for a single import; the backup already links it).
- **The 4 × 8 layout table**, with `*(Main)*` on the top-left key, and the mockup link.
- **Notes:** keys that depend on context or share a binding, and system-shortcut clashes.
- **Left out:** what was dropped, and why.

## Environment gotchas (this Mac)

- `ls` is aliased to `eza`, which adds icon glyphs and quotes to its output. Capturing its output into a path breaks, so use `/bin/ls` or literal paths.
- `grep` is `ugrep`, which rejects complex patterns. Use `/usr/bin/grep` or Python.
- There is **no `timeout` command**. Wrapping a command in `timeout … 2>/dev/null` silently produces empty results.
- The `sdef` command needs full Xcode, which isn't installed. Read an app's `.sdef` file directly.
- In zsh, quote globs inside arguments (e.g. `--include='*.js'`), and don't start a command with a bare `=====`, which zsh treats as a filename expansion.
- The shell's working directory can reset between commands, so use absolute paths.
