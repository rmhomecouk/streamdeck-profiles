# Ghostty

A 32-key Stream Deck XL profile for the [Ghostty](https://github.com/ghostty-org/ghostty) terminal. It uses Ghostty 1.3's default macOS keybinds, plus a global quick-terminal binding.

![Ghostty deck](sheet.png)

The icons follow Ghostty's own app icon: glowing line glyphs on a blue dot-matrix screen, set in JetBrains Mono. Each row is coloured from the Spacedust theme. Labels are part of the images, so the Stream Deck titles are turned off.

Open `index.html` locally for an interactive mockup: click any key to see the matching Ghostty `keybind`.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Windows & tabs** | quick term `` ⌘` `` | new window `⌘N` | new tab `⌘T` | prev tab `⇧⌘[` | next tab `⇧⌘]` | close `⌘W` | reopen `⌘Z` | palette `⇧⌘P` |
| **Splits** | split → `⌘D` | split ↓ `⇧⌘D` | focus ← `⌥⌘←` | focus ↑ `⌥⌘↑` | focus ↓ `⌥⌘↓` | focus → `⌥⌘→` | zoom `⇧⌘↩` | equalize `⌃⌘=` |
| **Navigate & search** | prompt ↑ `⌘↑` | prompt ↓ `⌘↓` | top `⌘Home` | bottom `⌘End` | find `⌘F` | find prev `⇧⌘G` | find next `⌘G` | clear `⌘K` |
| **Clipboard, view, config** | copy `⌘C` | paste `⌘V` | font − `⌘−` | font reset `⌘0` | font + `⌘=` | fullscreen `⌘↩` | config `⌘,` | reload `⇧⌘,` |

`keymap.json` lists the Ghostty action behind every key.

## Setup notes

- **Quick term** needs this line in your Ghostty config, because Ghostty has no default quick-terminal binding:
  ```
  keybind = global:cmd+backquote=toggle_quick_terminal
  ```
  With it, the key works from any app.
- **All other keys** only work while Ghostty has focus. Link the profile to Ghostty.app under **Preferences → Profiles** so the deck switches in automatically.
- **Prompt ↑ / ↓** need Ghostty's shell integration, which is on by default for zsh, bash and fish.

## Files

| File | What it is |
|---|---|
| `Ghostty.streamDeckProfile` | The profile to import |
| `icons/` | 288 × 288 key images |
| `svg/` | Editable icon sources |
| `gen.mjs` | Renders `svg/`, `icons/`, `keymap.json` and `sheet.png` |
| `profile.mjs` | Packages `icons/` into the `.streamDeckProfile` |
| `index.html` | Interactive mockup |
