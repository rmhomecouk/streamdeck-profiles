# Main — Stream Deck XL launcher

A home screen for the app decks. It has one key per profile, showing that app's mark edge to edge with no text. Pressing a key switches the Stream Deck to that app's profile and brings the app to the front. On every app deck, the top-left key is a **Switch Profile** back to Main.

![Main launcher](sheet.png)

Mockup: [live](https://claude.ai/code/artifact/7af261fc-6cdb-472a-bc91-6e06f6e4eb08) · [local](index.html)

## Install

Use the full backup, which is described in the [repo README](../../README.md#everything-at-once-recommended):

```bash
npm run backup
```

It restores Main together with every deck. Main is linked to *other applications*, and all the keys between profiles already point at the right profiles.

`Main.streamDeckProfile` can also be imported on its own. Its keys then have no target deck, so select each one in the Stream Deck app and pick that app's profile under its Switch Profile step.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Row 1** | | | | | | | | |
| **Row 2** | Ghostty | VS Code | Claude | Safari | Slack | Teams | Outlook | Discord |
| **Row 3** | | | | Word | Excel | | | |
| **Row 4** | | | | | | | | |

The apps start on row 2 and fill it, then continue from the middle of row 3. The empty keys leave room for new decks.

## Icons

Each tile is its deck's top-left tile (`svg/01-*.svg`), copied as is, so a deck and the launcher always show the same icon. That tile has no text: the app's mark is scaled to fill the key (`HERO_GLYPH` in `tools/tile.mjs`), with no edge mark. Ghostty shows its app icon: a solid ghost with its prompt, in the upper left of the blue dot-matrix screen.

## How each key works

Each key is a **Multi Action** that runs two steps, in this order:

1. **Switch Profile** to the app's profile.
2. **Open Application** for the app, with `bring_to_front` on.

Both steps are needed:
- **Switch Profile alone** would show the right keys, but the shortcuts would go to whatever app is in front.
- **Open Application alone** fails when the app is already in front. Say you go back to Main from Excel's deck, then press Excel. macOS reports no app change, so Stream Deck's automatic profile switch never runs, and you'd stay on Main.

## Settings, taken from keys the Stream Deck app wrote

These settings shapes come from keys made by hand in the Stream Deck app, not guessed:

- **Switch Profile** (`com.elgato.streamdeck.profile.rotate`): `{"DeviceUUID": "", "PageIndex": 1, "ProfileUUID": "<profile id, lowercase>"}`.
- **Multi Action Switch** (`com.elgato.streamdeck.multiactions.routine2`) holds two action lists, one per state, and alternates between them on each press. The launcher puts the same two steps in both lists, so every press does the same thing.
- **Open Application**: when Stream Deck writes this action itself, it fills in `exec` (`<bundle>/Contents/MacOS/<CFBundleExecutable>`) and `source` (the bundle path). The launcher does the same.

**Profile ids.** `tools/backup.mjs` gives every profile a stable id derived from its folder name, and passes the deck ids to `profile.mjs` as `DECK_PROFILE_UUIDS`. The repo's `Main.streamDeckProfile` is built without them.
