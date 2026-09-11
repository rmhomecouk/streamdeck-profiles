# Slack — Stream Deck XL

32 keys for the Slack desktop app on macOS: navigating, messaging, catching up on unreads, and huddles and your own settings. The tiles use Slack's aubergine. Each row takes one of the four colours from Slack's mark: blue, green, yellow and red. A small channel `#` sits in the corner of every key.

![Slack deck](sheet.png)

Mockup: [live](https://claude.ai/code/artifact/4877865c-049a-4959-ad8b-acfb9c6b964e) · [local](index.html)

## Install

```bash
open -a "Elgato Stream Deck" profiles/slack/Slack.streamDeckProfile
```

- **Slack key.** This key opens Slack or brings it to the front. A long press quits it. If the key does nothing, edit it in the Stream Deck app and pick Slack again under **App / File**.
- **Link the profile** to Slack under **Preferences → Profiles**, so the deck switches to it when Slack is in front.

## Where the shortcuts come from

Every binding was read from **Slack 4.52.155** itself. Slack has no user-customisable shortcuts, and there are no macOS `NSUserKeyEquivalents` overrides for it.

The desktop shell (`app.asar`) only holds generic menus: Edit, View, Window and the global shortcuts. Slack's real keymap is in the web client, which is cached as **uncompressed** JavaScript in `~/Library/Application Support/Slack/Service Worker/CacheStorage`. It uses Chromium's simple-cache format, with the body at byte `20 + keyLen`. The file `gantry-v2-async-gantry-v2-shared-boot-async.*.js` holds three sources that agree with each other:

- **The native menu template** (`getSlackMenuItems`, `getFileMenuItems`, …): `{id: tA.Wc.SWITCH_TO_CHANNEL, label: "Switch to Channel", accelerator: "CmdOrCtrl+K"}`.
- **The global shortcut table:** `ty = [{id: w.Wc.FIND, keys: ["mod+f","mod+g"], handler, ignoreIf}, …]`. Entries without an id were matched to their handler. For example, `mod+/` runs `toggleKeyboardShortcuts` ("Toggles the Keyboard Shortcuts flexpane").
- **The in-app Keyboard Shortcuts sheet:** `{title: "React to last message (or message with focus)", keys: ["key_Shift","key_Cmd","key_\\"]}`.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Navigate** | Slack *(open app)* | Jump to ⌘K | Search ⌘G | Back ⌘[ | Forward ⌘] | All unreads ⇧⌘A | Threads ⇧⌘T | Activity ⇧⌘M |
| **Messaging** | New message ⌘N | DMs ⇧⌘K | Channels ⇧⌘L | Directory ⇧⌘E | Channel info ⇧⌘I | React ⇧⌘\ | Find ⌘F | Add a file ⌘O |
| **Catch up** | Mark read Esc | Mark all read ⇧Esc | Prev unread ⌥⇧↑ | Next unread ⌥⇧↓ | Prev channel ⌥↑ | Next channel ⌥↓ | Close pane ⌘. | Sidebar ⇧⌘D |
| **Huddles & you** | Huddle ⇧⌘H | Mute ⇧⌘Space | Set status ⇧⌘Y | New canvas ⇧⌘N | Downloads ⇧⌘J | Workspaces ⇧⌘S | Preferences ⌘, | Shortcuts ⌘/ |

## Notes

- **Huddle and Mute.**
  - ⇧⌘H starts a huddle in the conversation you're in, or leaves the one you're in.
  - ⇧⌘Space mutes and unmutes you in a huddle.
  - The desktop shell also registers ⇧⌘Space as a global shortcut, `toggle_mute`, so Mute can work while Slack is in the background.
- **Mark read (Esc).** Esc marks the current conversation read. If a menu or dialog is open, Esc closes that first.
- **Mark all read (⇧Esc).** Marks the whole workspace read. Slack asks you to confirm.
- **Add a file (⌘O).** Needs the message box to be focused.

## Left out

- **Keys that depend on your setup.** ⌘1–9 switch to workspace 1–9, in whatever order your workspaces are listed.
- **Keys that only work in one editor mode.** The canvas and message formatting keys (bold, lists, code) only work while you're editing.
- **Keys that need a click.** For example, ⌥-click marks a message unread.
- **Slack's other global shortcut.** The desktop command centre (⇧⌘K) clashes with DMs inside the app, so it isn't a separate key.
