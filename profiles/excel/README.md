# Microsoft Excel — Stream Deck XL

32 keys for Excel on macOS: the workbook, editing and data, number formats, and sheets. The tiles are the dark green of Excel's icon. Each row takes one of the icon's greens: yellow-lime, green, emerald and pale sage. A small selected cell with its fill handle sits in the corner of every key.

![Excel deck](sheet.png)

Mockup: [live](https://claude.ai/code/artifact/166dc283-5955-49a2-b354-43fa1356d629) · [local](index.html)

## Install

```bash
open -a "Elgato Stream Deck" profiles/excel/Excel.streamDeckProfile
```

- **Excel key.** This key opens Excel or brings it to the front. A long press quits it. If the key does nothing, edit it in the Stream Deck app and pick Microsoft Excel again under **App / File**.
- **Link the profile** to Microsoft Excel under **Preferences → Profiles**, so the deck switches to it when Excel is in front.

## Where the shortcuts come from

Every binding was confirmed in **Excel 16.112.4** itself. Excel needed a different method from Word:

- **Excel's nibs have no key equivalents**, and unlike Word, Excel's scripting dictionary has no key lookup. It only has `on key`, which assigns keys rather than reading them.
- **The live menu bar** was read with System Events while a blank workbook was open. It has only 61 shortcuts, and most of Excel's cell shortcuts aren't in a menu. The menu gave Save, Save as, Print, Undo, Find, Replace, Go to, Sort, Format cells, Paste special and New sheet.
- **Key tests for the rest.** Each candidate key was sent straight to Excel's process with `CGEventPostToPid`, so it never touched another app. It went to a fresh, unsaved scratch workbook, and the result was read back through AppleScript. For example: A1 = 5 with A1:A3 selected, then ⌘D, gives A3 = 5. The **How it was confirmed** column in the mockup gives each test.
  - The tests ran on a **British** keyboard layout, using the same key codes Stream Deck sends. ⌃⇧$ is ⌃⇧4, ⌃⇧% is ⌃⇧5, and ⌃⇧! is ⌃⇧1.
- **No overrides.** There are no `NSUserKeyEquivalents` set for `com.microsoft.Excel`.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Workbook** | Excel *(open app)* | Save ⌘S | Save as ⇧⌘S | Print ⌘P | Undo ⌘Z | Find ⌃F | Replace ⌃H | Go to ⌃G |
| **Edit & data** | Fill down ⌘D | Fill right ⌘R | AutoSum ⇧⌘T | Today ⌃; | Insert ⌃⇧= | Delete ⌘- | Filter ⇧⌘F | Sort ⇧⌘R |
| **Format** | Format cells ⌘1 | Bold ⌘B | Italic ⌘I | Currency ⌃⇧$ | Percent ⌃⇧% | Number ⌃⇧! | Border ⌥⌘0 | Center ⌘E |
| **Sheets & view** | Prev sheet ⌥← | Next sheet ⌥→ | New sheet ⇧F11 | Hide row ⌃9 | Hide column ⌃0 | Show formulas ⌃` | Current time ⌘; | Paste special ⌃⌘V |

## Notes

- **Find, Replace and Go to use ⌃, not ⌘.** That's how Excel's own menu binds them.
- **⌘R is Fill right.** Excel has no align-right shortcut.
- **Currency** applies Excel's built-in `$#,##0.00` format, whatever your region. Use Format cells (⌘1) for £.
- **Insert** inserts whole rows or columns when they're selected. Otherwise Excel asks which way to shift the cells.
- **AutoSum** drops a SUM formula into the cell. Press Return to accept it.
- **Show formulas** switches back when you press it again.

## Left out

- **Date format ⌃⇧#:** on a British layout # isn't ⇧3, and the key test didn't change the format.
- **Keys that couldn't be confirmed:** Group ⇧⌘K, Ungroup ⇧⌘J, Create table ⌃T, Note ⇧F2, Unhide ⌃⇧9 and ⌃⇧0, Chart F11 and ⌥F1, and Select row ⇧Space. Either the result couldn't be read back, or nothing happened. They're kept off the deck rather than guessed.
- **Select column ⌃Space:** macOS uses ⌃Space to switch input sources.
- **Edit cell, absolute references ⌘T and Insert function ⇧F3:** they work inside the cell editor or open panes, so a simple key test can't confirm them.
