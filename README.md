# Quick Font Size

`Cmd +` / `Cmd -` (`Ctrl +` / `Ctrl -` on Windows and Linux) change the font size of the area you are working in, instead of zooming the whole window. `Cmd 0` resets it.

| Focus | Setting changed |
|---|---|
| Editor (and anywhere else) | `editor.fontSize` |
| Chat (Copilot Chat, Claude Code) | `chat.fontSize` |
| Terminal | `terminal.integrated.fontSize` |
| Debug Console | `debug.console.fontSize` |
| Markdown Preview | `markdown.preview.fontSize` |

Add `Alt` (`Cmd+Alt +`, `Cmd+Alt -`, `Cmd+Alt 0`) to change all areas at once. On Windows, use `Ctrl+Shift+Alt` instead: Windows reports `AltGr` as `Ctrl+Alt`, and `Ctrl+Alt 0` would catch `AltGr 0`, which types `}` on many keyboard layouts.

To zoom the whole window, run **View: Zoom In** or **View: Zoom Out** from the Command Palette.

Sizes are saved to your settings, so they persist across windows and restarts. If a workspace overrides a size, the workspace value is changed, so the change is always visible.

If `editor.lineHeight` or `debug.console.lineHeight` is set in pixels, it is scaled along with the font so text keeps the same spacing. Line heights set as a multiplier already follow the font and are left alone.

## Status bar

The status bar shows the font size with an icon for its area: `−  [editor icon] 14  +` for the editor, a chat bubble for chat, a terminal icon for the terminal.

- Minus and plus change the size of the area shown.
- Click the size to choose another area.
- Hover over the size to see every area's size, switch area, or reset one to its default.

The status bar follows focus: clicking or typing in an editor, switching tabs (including a chat or terminal opened as a tab), and running a command in the terminal all switch it. VS Code reports no focus events for sidebar and panel views, so for chat in the sidebar and the debug console the status bar switches when you first press `Cmd +` or `Cmd -` there.

Hide any of the three status bar items by right-clicking the status bar.

## Commands

| Command | Default key (macOS) |
|---|---|
| Font Size: Increase | `Cmd =`, `Cmd Shift =`, `Cmd Numpad+` |
| Font Size: Decrease | `Cmd -`, `Cmd Shift -`, `Cmd Numpad-` |
| Font Size: Reset to Default | `Cmd 0`, `Cmd Numpad0` |
| Font Size: Choose Status Bar Area | |

Each command accepts an optional `{ "area": "editor" | "chat" | "terminal.integrated" | "debug.console" | "markdown.preview" | "*" }` argument, so you can bind your own keys:

```json
{ "key": "cmd+alt+up", "command": "quickFontSize.increase", "args": { "area": "chat" } }
```

Without `area`, a command acts on the area shown in the status bar.

## Settings

| Setting | Default | |
|---|---|---|
| `quickFontSize.step` | `1` | Amount each increase or decrease changes the size by, e.g. `0.5` or `2`. |
| `quickFontSize.minimum` | `6` | Smallest size decrease goes to. |
| `quickFontSize.maximum` | `100` | Largest size increase goes to. |

## Remote development

The extension runs on your local machine, so it also works in Remote-SSH, WSL and Dev Container windows without being installed on the remote.

## Known issues

- If `Cmd +` does nothing while the terminal has focus, add this to your settings:

  ```json
  "terminal.integrated.commandsToSkipShell": ["quickFontSize.increase", "quickFontSize.decrease", "quickFontSize.reset"]
  ```

- `chat.fontSize` requires a recent VS Code version. On older versions, chat is left unchanged.
