# Microsoft Teams

A 32-key Stream Deck XL profile for Microsoft Teams on the Mac (version 26213.1006.5011.1671). It's built for meetings: mute, camera, hand, share and leave sit along the top row.

![Teams deck](sheet.png)

**Interactive mockup:** [live version](https://claude.ai/code/artifact/d6fc463f-ecff-4b2e-b2ad-69d1c72d0579), or open `index.html` locally. Click any key to see Teams' command name and when it works. You can also filter the deck by context: in a meeting, during an incoming call, in a chat, or anywhere.

## Where the shortcuts come from

Every binding was read from the Teams app itself, not from documentation. New Teams keeps its keymap in its web client, cached inside the app's WebView2 profile. The code has four keymap classes and picks one with `re.isMac ? new x(...) : new k(...)`. This profile uses class `x`, the macOS desktop keymap.

Microsoft's [published list](https://support.microsoft.com/en-us/office/keyboard-shortcuts-for-microsoft-teams-2e8e2a70-e8d8-4a19-949b-4c36dd5292d2) mostly agrees, but it mixes in bindings from the web app in a few places. Where the two differ, the app's own keymap wins.

The keys use a dark Fluent style: neutral tiles with a violet wash, white rounded glyphs, and a small accent pill at the top like Teams' selection indicator. Reactions keep their emoji colours and status keys use Teams' presence colours. The hero key is the Teams mark.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **In the meeting** (violet) | Teams *(Main)* | Mute `⇧⌘M` | Camera `⇧⌘O` | Raise hand `⇧⌘K` | Share `⇧⌘E` | Blur `⇧⌘P` | Captions `⇧⌘A` | Leave `⇧⌘H` |
| **Calls** (green) | Accept video `⇧⌘V` | Accept audio `⇧⌘A` | Decline `⇧⌘D` | Join `⇧⌘J` | Admit `⇧⌘Y` | Speaker `⇧⌘U` | Audio call `⌥⌘S` | Video call `⇧⌘S` |
| **Reactions & status** (amber) | Like `⌥⇧1` | Heart `⌥⇧2` | Applause `⌥⇧3` | Laugh `⌥⇧4` | Surprised `⌥⇧5` | Available `⌥⇧Q` | Busy `⌥⇧Y` | Do not disturb `⌥⇧U` |
| **Chat & app** (blue) | Search `⌘E` | New chat `⌘N` | Go to `⌘G` | Compose `⌘R` | Pop out `⌘O` | On top `⌃⌘T` | Settings `⌘,` | Shortcuts `⌘.` |

`keymap.json` lists Teams' command id for every key, and when each one works.

## Setup notes

- **Top-left key.** It goes back to the **Main** launcher, which has a key for every deck (a Stream Deck *Switch Profile* action). In the full setup (`npm run backup`, see the [repo README](../../README.md)) it already points at Main. If you import this file on its own, select the key in the Stream Deck app and pick your Main profile.
- **Focus.** Every other key only works while Teams is the active app. Link the profile to Microsoft Teams.app under **Preferences → Profiles** so it switches in automatically.
- **Captions and Accept audio are both `⇧⌘A`.** Teams decides by context: in a meeting it toggles captions, and while a call is ringing it answers.
- **Keys that do something else in Calendar.** Busy (`⌥⇧Y`) jumps to the current time there, and Like, Heart and Applause (`⌥⇧1`–`3`) switch calendar views.
- **Custom shortcuts.** If you've customised shortcuts in Teams (**Settings and more ▸ Keyboard shortcuts**), the deck still sends the defaults.
- **Not included:**
  - **The app bar keys (`⌘1`–`9`).** Which app each number opens depends on how your app bar is ordered.
  - **Push-to-talk (`⌥Space`).** It has to be held down, and a Stream Deck hotkey only taps.
