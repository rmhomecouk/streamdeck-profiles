# Microsoft Outlook — Stream Deck XL

32 keys for Outlook on macOS (New Outlook): switching views, writing and replying, sorting mail, and the calendar. The tiles are dark navy. Each row takes one layer of Outlook's envelope icon: sky, blue, indigo and lavender. A small envelope-flap chevron sits at the top of every key.

![Outlook deck](sheet.png)

Mockup: [live](https://claude.ai/code/artifact/c06c47c8-eab6-4ea0-8b83-4f8f52bf87a1) · [local](index.html)

## Install

```bash
open -a "Elgato Stream Deck" profiles/outlook/Outlook.streamDeckProfile
```

- **Outlook key.** This key opens Outlook or brings it to the front. A long press quits it. If the key does nothing, edit it in the Stream Deck app and pick Microsoft Outlook again under **App / File**.
- **Link the profile** to Microsoft Outlook under **Preferences → Profiles**, so the deck switches to it when Outlook is in front.

## Where the shortcuts come from

Every binding was read from **Outlook 16.112.3** itself, running as New Outlook (`IsRunningNewOutlook = 1`). There are no `NSUserKeyEquivalents` overrides.

Outlook is a native AppKit app, but its menus aren't in a single `MainMenu.nib`. They're split across compiled nibs in `Contents/Resources/Base.lproj/`, which `tools/nib-shortcuts.py` reads:

| Nib | Shortcuts | Holds |
|---|---|---|
| `OutlookApp.nib` | 59 | the Outlook, File, New, Edit, Find, Folder, Tools and Window menus |
| `DocumentMenus.nib` | 81 | the Message, Draft, Move, Junk Mail, Event and Task menus |
| `ViewMenus.nib` | 72 | the Go To, View and Reading Pane menus, repeated for each module |
| `SetToDoMenu.nib` | 9 | the To Do (flag) menu |

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Go to** | Outlook *(open app)* | Mail ⌘1 | Calendar ⌘2 | People ⌘3 | Tasks ⌘4 | Search ⇧⌘F | Go to folder ⌃G | Sync ⌃⌘K |
| **Compose** | New email ⌘N | Reply ⌘R | Reply all ⇧⌘R | Forward ⌘J | Send ⌘↩ | Discard ⌘Esc | Undo send ⌥⌘↩ | React ⌃⌘R |
| **Triage** | Archive ⌃E | Delete ⌘⌫ | Move ⇧⌘M | Mark read ⌘T | Mark unread ⇧⌘T | Flag ⌃1 | Pin ⌃P | Junk ⇧⌘J |
| **Calendar & view** | Today ⌘T | Day ⌃⌘1 | Work week ⌃⌘2 | Month ⌃⌘4 | Previous ⌥⌘← | Next ⌥⌘→ | Reading pane ⌘\ | Sidebar ⇧⌘[ |

## Notes

- **Shared binding.** **Mark read** and **Today** both send ⌘T. Outlook applies it to whichever view you're in: it marks the email read in Mail, and jumps to today in Calendar. The same goes for ⇧⌘T, which is Mark unread in Mail and HTML format while you're writing an email.
- **Flag (⌃1).** This flags the email for today. If Mission Control's *Switch to Desktop 1* is turned on, macOS takes ⌃1 first. That option is under System Settings → Keyboard → Keyboard Shortcuts → Mission Control.
- **Send and Discard** only work while you're writing an email.
- **Undo send** only works while Outlook's undo-send countdown is still showing.
- **Reading pane (⌘\\)** puts the reading pane on the right. ⇧⌘\ puts it below the list and ⌥⌘\ hides it, but those aren't on the deck.

## Left out

- **Text-formatting keys** (bold, alignment, font size): these only work in the message editor.
- **⌘5 Notes, and the Window ▸ 7–0 items:** they're rarely used.
- **Legacy Outlook menus:** some menu files also include items for classic Outlook. Only items that apply in New Outlook were used.
