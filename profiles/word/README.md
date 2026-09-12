# Microsoft Word — Stream Deck XL

32 keys for Word on macOS: saving and finding, text formatting, paragraphs and styles, and review. The tiles are the near-black blue of Word's icon. Each row takes one of the icon's page layers: cyan, sky, violet and royal blue. A small ¶ (pilcrow) sits in the corner of every key.

![Word deck](sheet.png)

Mockup: [live](https://claude.ai/code/artifact/8188ebce-238d-437d-b4ac-860b02ad2787) · [local](index.html)

## Install

```bash
open -a "Elgato Stream Deck" profiles/word/Word.streamDeckProfile
```

- **Word key.** This key opens Word or brings it to the front. A long press quits it. If the key does nothing, edit it in the Stream Deck app and pick Microsoft Word again under **App / File**.
- **Link the profile** to Microsoft Word under **Preferences → Profiles**, so the deck switches to it when Word is in front.

## Where the shortcuts come from

Every binding was read from **Word 16.112.4** itself.

- **Word's nibs have no key equivalents.** Word builds its menus at runtime, so `tools/nib-shortcuts.py` finds nothing.
- **Word's own key table, through AppleScript.** Word's scripting dictionary (`Contents/Resources/Word.sdef`) has `build key code` and `find key`. `find key` returns the key binding for any key combination, including its command name, like `Bold` or `ApplyHeading1`.
  - A key code is the Windows virtual-key number plus modifier bits: ⌘ 256, ⇧ 512, ⌥ 2048, ⌃ 4096. For example, ⌘B is 66 + 256 = 322.
  - Sweeping every letter, digit, punctuation, navigation and F-key under 12 modifier combinations returned **264 bindings**.
- **The live menu bar** was read with System Events while a blank document was open. Where a key is also in a menu, the menu item is listed too, and the two agree.
- **No customisations.** `Normal.dotm` has no `customizations.xml`, which is where custom key bindings would be stored, and there are no `NSUserKeyEquivalents` for `com.microsoft.Word`.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Document** | Word *(open app)* | Save ⌘S | Save as ⇧⌘S | Print ⌘P | Undo ⌘Z | Redo ⇧⌘Z | Find ⌘F | Go to ⌥⌘G |
| **Format text** | Bold ⌘B | Italic ⌘I | Underline ⌘U | Strikethrough ⇧⌘X | Smaller ⌘[ | Bigger ⌘] | Copy format ⌥⌘C | Paste format ⌥⌘V |
| **Paragraph & styles** | Heading 1 ⌥⌘1 | Heading 2 ⌥⌘2 | Heading 3 ⌥⌘3 | Normal ⇧⌘N | Bullets ⇧⌘L | Align left ⌘L | Center ⌘E | Page break ⌘↩ |
| **Review & view** | Track changes ⇧⌘E | Comment ⌥⌘A | Footnote ⌥⌘F | Spelling ⌥⌘L | Thesaurus ⌃⌥⌘R | Focus ⌃⇧⌘F | Styles pane ⌥⇧⌘S | Copilot ⌃⌘I |

## Notes

- **Word's ⌘ keys differ from other apps.** ⌘E centres the paragraph and ⌘L left-aligns it. ⌘[ and ⌘] change the font size by one point.
- **Copy format and Paste format** work like the format painter, but from the keyboard: copy from one selection, then paste onto another.
- **Copilot** needs a Microsoft 365 Copilot plan.
- **Focus** hides everything but the page. Press it again to leave.

## Left out

- **Clear formatting (⌃Space):** macOS uses ⌃Space to switch input sources by default, so it reaches macOS before Word.
- **⌃↑ and ⌃↓** (start and end of line): these are Mission Control's defaults.
- **F-keys** (F7 spelling, F5 Go to and so on): the ⌘ shortcuts do the same things, and F11 is macOS's Show Desktop.
- **Justify ⌘J, Align right ⌘R, Hanging indent ⌘T, Font ⌘D, Paragraph ⌥⌘M, Hyperlink ⌘K, Endnote ⌥⌘E, Superscript ⇧⌘=, Subscript ⇧⌘-, All caps ⇧⌘A, Small caps ⇧⌘K, and the view switches** (⌥⌘P Print Layout, ⌥⌘O Outline, ⌥⌘N Draft): there's no room for them on 32 keys.
- **Word count** has no default shortcut.
