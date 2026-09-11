# Safari

A 32-key Stream Deck XL profile for Safari 27. Every shortcut was read from Safari's own menu definitions (`MainMenu.nib`), so each key sends exactly what its menu item uses.

![Safari deck](sheet.png)

**Interactive mockup:** [live version](https://claude.ai/code/artifact/589a06e9-d96b-4750-b59f-a9a2613080eb), or open `index.html` locally. Click any key to see its shortcut and the Safari menu item behind it.

The keys borrow from Safari's icon: dark glass tiles with a faint compass bezel, a bright glass rim, and white glyphs. Labels are set in SF Pro Rounded and shortcuts in SF Mono. Each row has its own colour. The hero key is the compass itself.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Tabs & windows** (cyan) | Safari *(open app)* | New tab `⌘T` | New window `⌘N` | Private `⇧⌘N` | Prev tab `⌃⇧⇥` | Next tab `⌃⇥` | Close tab `⌘W` | Overview `⇧⌘\` |
| **Navigate** (green) | Back `⌘[` | Forward `⌘]` | Reload `⌘R` | Stop `⌘.` | Address `⌘L` | Home `⇧⌘H` | History `⌘Y` | Reopen `⌘Z` |
| **Find & view** (amber) | Find `⌘F` | Find prev `⇧⌘G` | Find next `⌘G` | Reader `⇧⌘R` | Zoom out `⌘−` | Actual size `⌘0` | Zoom in `⌘+` | Full screen `⌃⌘F` |
| **Bookmarks & sidebar** (red) | Sidebar `⇧⌘L` | Add bookmark `⌘D` | Reading list `⇧⌘D` | Bookmarks `⌥⌘B` | Favorites `⇧⌘B` | Downloads `⌥⌘L` | Prev group `⇧⌘↑` | Next group `⇧⌘↓` |

`keymap.json` lists the menu item behind every key.

## Setup notes

- **The Safari key** is an Open Application action. It launches Safari, or brings it to the front, from any app. If it does nothing, select the key in the Stream Deck app and pick Safari.app again.
- **All other keys** only work while Safari is the active app. Link the profile to Safari.app under **Preferences → Profiles** so the deck switches in automatically.
- **Reopen** sends ⌘Z (Edit ▸ Undo). It brings back a tab only if you press it straight after closing one.
- **Zoom in** is ⌘+ in the menu. Because `+` is Shift-`=` on the keyboard, the key sends ⇧⌘=.
- **Not included:** Web Inspector and Reopen Last Closed Window. Safari adds these to its menus at runtime, so they aren't in the menu file these shortcuts came from.
