# Visual Studio Code — Stream Deck XL

32 keys for VS Code on macOS: navigation, editing, the workbench views, and run & debug plus AI chat. The tiles use VS Code's Dark Modern greys. Each row is coloured with a Dark+ syntax colour: focus blue, keyword purple, type teal and function yellow. The row colour also appears on an activity-bar marker at the left edge and on the shortcut under each label.

![VS Code deck](sheet.png)

Mockup: [live](https://claude.ai/code/artifact/212e3cf5-5667-4046-bbb9-e25a485e9352) · [local](index.html)

## Where the shortcuts come from

Every binding was read from **VS Code 1.136.2** itself. There are no `keybindings.json` overrides on this Mac.

- **Workbench defaults** come from `Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`.
  - Each command registers a `keybinding:{primary, mac:{primary}}` pair. Where there's a `mac` value, it's the one used.
  - The numbers encode keys and modifiers. Modifiers are ⌘ `2048`, ⇧ `1024`, ⌥ `512` and ⌃ `256`, added to a key code. The key codes come from the bundle's own KeyCode table, where A is `31`, F1 is `59` and `/` is `90`.
  - For example, `3118` is ⌘ + ⇧ + `46` (P), which is ⇧⌘P for `workbench.action.showCommands`.
- **Claude Code** comes from the installed extension's `package.json` (`anthropic.claude-code` 2.1.251).
  - ⌘Esc runs `claude-vscode.focus` when the editor has focus, and `claude-vscode.blur` otherwise.
  - Both apply only while `claudeCode.useTerminal` is off, which is the default.
- **Installed extensions** were checked for conflicts. GitLens rebinds ⌃⇧G to the same `workbench.view.scm`. No other extension claims any of these keys globally.

## Layout

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| **Navigate** | VS Code *(open app)* | Commands ⇧⌘P | Quick open ⌘P | Go to symbol ⇧⌘O | Go to line ⌃G | Definition F12 | Back ⌃- | Forward ⌃⇧- |
| **Edit** | Rename F2 | Format ⇧⌥F | Quick fix ⌘. | Comment ⌘/ | Line up ⌥↑ | Line down ⌥↓ | Duplicate ⇧⌥↓ | Next match ⌘D |
| **Workbench** | Explorer ⇧⌘E | Search ⇧⌘F | Source control ⌃⇧G | Extensions ⇧⌘X | Sidebar ⌘B | Terminal ⌃` | Split editor ⌘\ | Problems ⇧⌘M |
| **Run & AI** | Debug F5 | Step over F10 | Restart ⇧⌘F5 | Stop ⇧F5 | Breakpoint F9 | Chat ⌃⌘I | Inline chat ⌘I | Claude Code ⌘Esc |

| Key | Command id |
|---|---|
| Commands | `workbench.action.showCommands` |
| Quick open | `workbench.action.quickOpen` |
| Go to symbol | `workbench.action.gotoSymbol` |
| Go to line | `workbench.action.gotoLine` |
| Definition | `editor.action.revealDefinition` |
| Back / Forward | `workbench.action.navigateBack` / `navigateForward` |
| Rename | `editor.action.rename` |
| Format | `editor.action.formatDocument` |
| Quick fix | `editor.action.quickFix` |
| Comment | `editor.action.commentLine` |
| Line up / down | `editor.action.moveLinesUpAction` / `moveLinesDownAction` |
| Duplicate | `editor.action.copyLinesDownAction` |
| Next match | `editor.action.addSelectionToNextFindMatch` |
| Explorer | `workbench.view.explorer` |
| Search | `workbench.action.findInFiles` |
| Source control | `workbench.view.scm` |
| Extensions | `workbench.view.extensions` |
| Sidebar | `workbench.action.toggleSidebarVisibility` |
| Terminal | `workbench.action.terminal.toggleTerminal` |
| Split editor | `workbench.action.splitEditor` |
| Problems | `workbench.actions.view.problems` |
| Debug | `workbench.action.debug.start` |
| Step over | `workbench.action.debug.stepOver` |
| Restart | `workbench.action.debug.restart` |
| Stop | `workbench.action.debug.stop` |
| Breakpoint | `editor.debug.action.toggleBreakpoint` |
| Chat | `workbench.action.chat.open` |
| Inline chat | `inlineChat.start` |
| Claude Code | `claude-vscode.focus` / `claude-vscode.blur` |

## Setup notes

- **VS Code key.** This key opens VS Code or brings it to the front. A long press quits it. If the key does nothing, edit it in the Stream Deck app and pick Visual Studio Code again under **App / File**.
- **Link the profile** to Visual Studio Code under **Preferences → Profiles**, so the deck switches to it when VS Code is in front.
- **Keys that depend on context:**
  - **Editor focus.** Go to symbol, Go to line, Definition, the whole Edit row, Breakpoint and Inline chat act on the text editor.
  - **Debugging.** Step over, Restart and Stop only work while a debug session is running. While paused, Debug (F5) becomes Continue.
  - **Terminal focus.** With the terminal focused, ⌘\ splits the terminal instead of the editor.
  - **Claude Code.** ⌘Esc moves focus into the Claude Code panel. Pressing it again from inside the panel moves focus back.
  - **Chat.** Chat (⌃⌘I) needs `chat.agent.enabled`, which is on here.
- **Function keys.** Stream Deck sends real F-key codes, so F2, F5, F9, F10 and F12 work whether or not *Use F1, F2, etc. keys as standard function keys* is turned on.

## Left out

- **Step into (F11).** F11 is macOS's default *Show Desktop* shortcut, so the key would show the desktop instead. Restart takes its place. To use Step into anyway, first turn off Show Desktop under **System Settings → Keyboard → Keyboard Shortcuts → Mission Control**.
- **Chords** (for example ⌘K Z for Zen mode). A hotkey key sends a single combination.
- **Notebook and extension-specific keys** from Jupyter, Bicep, CMake and similar. They only work inside those file types.
