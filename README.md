# Focus Font Size

`Cmd +` / `Cmd -` (`Ctrl +` / `Ctrl -` on Windows and Linux) change the font size of the area you are working in, instead of zooming the whole window. `Cmd 0` resets it.

| Focus | Setting changed |
|---|---|
| Editor (and anywhere else) | `editor.fontSize` |
| Chat (Copilot Chat, Claude Code) | `chat.fontSize` |
| Terminal | `terminal.integrated.fontSize` |

Add `Alt` (`Cmd+Alt +`, `Cmd+Alt -`, `Cmd+Alt 0`) to change all three at once.

Sizes are saved to your settings, so they persist across windows and restarts. If a workspace overrides a size, the workspace value is changed, so the change is always visible.

## Status bar

The status bar shows the font size with an icon for its area: `−  [editor icon] 14  +` for the editor, a chat bubble for chat, a terminal icon for the terminal.

- Minus and plus change the size of the area shown.
- Click the size to choose another area.
- Hover over the size to see all three sizes, switch area, or reset one to its default.

The status bar follows focus: clicking or typing in an editor, switching tabs (including a chat or terminal opened as a tab), and running a command in the terminal all switch it. VS Code reports no focus events for sidebar and panel views, so for chat in the sidebar the status bar switches when you first press `Cmd +` or `Cmd -` there.

Hide any of the three items by right-clicking the status bar.

## Commands

| Command | Default key (macOS) |
|---|---|
| Font Size: Increase | `Cmd =`, `Cmd Shift =`, `Cmd Numpad+` |
| Font Size: Decrease | `Cmd -`, `Cmd Shift -`, `Cmd Numpad-` |
| Font Size: Reset to Default | `Cmd 0`, `Cmd Numpad0` |
| Font Size: Choose Status Bar Area | |

Each command accepts an optional `{ "area": "editor" | "chat" | "terminal.integrated" | "*" }` argument, so you can bind your own keys:

```json
{ "key": "cmd+alt+up", "command": "focusFontSize.increase", "args": { "area": "chat" } }
```

Without `area`, a command acts on the area shown in the status bar.

Sizes are kept between 6 and 100.

## Remote development

The extension runs on your local machine, so it also works in Remote-SSH, WSL and Dev Container windows without being installed on the remote.

## Known issues

- If `Cmd +` does nothing while the terminal has focus, add this to your settings:

  ```json
  "terminal.integrated.commandsToSkipShell": ["focusFontSize.increase", "focusFontSize.decrease", "focusFontSize.reset"]
  ```

- `chat.fontSize` requires a recent VS Code version. On older versions, chat is left unchanged.
