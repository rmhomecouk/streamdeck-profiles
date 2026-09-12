# Claude

A 32-key Stream Deck XL profile for the Claude desktop app, covering Chat, Cowork tasks and Claude Code.

Every shortcut was read from Claude 1.52386.3 itself, from two sources:
- the native menu accelerators in `app.asar`
- the app's in-app shortcut table, which also drives its **Help ▸ Keyboard Shortcuts** sheet

![Claude deck](sheet.png)

**Interactive mockup:** [live version](https://claude.ai/code/artifact/e322b528-abbb-4874-b1f0-8e6d39fe08c3), or open `index.html` locally. Click any key to see what it sends and where it comes from in Claude, or filter the deck by where each shortcut works.

The keys follow Claude's own look: warm charcoal tiles with a fine paper grain, ivory line glyphs, labels in New York serif and shortcuts in SF Mono. Each row takes an accent from Claude's palette. The hero key is the terracotta spark from the app icon.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Chats** (terracotta) | Claude *(Main)* | New chat `⌘N` | Search `⌘K` | Quick chat `⌃⌘K` | Incognito `⇧⌘I` | Prev chat `⇧⌘[` | Next chat `⇧⌘]` | Sidebar `⌘.` |
| **Composer** (kraft) | Attach `⌘U` | Dictate `⌘D` | Thinking `⇧⌘E` | Model `⇧⌘.` | Stop `esc` | Side chat `⌘;` | Close `⌘W` | Reopen `⇧⌘T` |
| **Claude Code** (blue) | Open folder `⇧⌘O` | Prev pane `⌃[` | Next pane `⌃]` | Close pane `⌘\` | Prompt up `⌥⌘↑` | Prompt down `⌥⌘↓` | Files `⇧⌘F` | Open PR `⌥⌘G` |
| **Sessions & app** (heather) | Fork `⌥⌘O` | Pin `⌥⌘P` | Archive `⌥⌘A` | Find `⌘F` | Zoom out `⌘−` | Zoom in `⌘=` | Shortcuts `⌘/` | Settings `⌘,` |

`keymap.json` records where each shortcut comes from: a menu item or an in-app shortcut id.

## Setup notes

- **Top-left key.** It goes back to the **Main** launcher, which has a key for every deck (a Stream Deck *Switch Profile* action). In the full setup (`npm run backup`, see the [repo README](../../README.md)) it already points at Main. If you import this file on its own, select the key in the Stream Deck app and pick your Main profile.
- **Quick Entry.** Claude's global Quick Entry shortcut defaults to double-tapping ⌥, which a Stream Deck hotkey can't send. To get a Quick Entry key, set a normal key combination as the **Quick Entry keyboard shortcut** in Claude's Settings, then point a Hotkey key at it.
- **Keys depend on the current tab.** A few shortcuts do different things in different places:
  - `⌘N` starts a new chat, a new task or a new Code session.
  - `⇧⌘I` opens incognito in chats, but the model menu on the Code tab.
  - `⇧⌘E` toggles thinking in chats, but opens the effort menu on the Code tab.
  - `esc` stops a response. Pressed twice in chats, it edits your last message.
- **Code-only keys.** Prev/Next pane, Close pane, Prompt up/down, Files, Open PR and Fork only do something on the Code tab.
- **Focus.** Every key except Claude only works while Claude is the active app. Link the profile to Claude.app under **Preferences → Profiles** so the deck switches in automatically.
