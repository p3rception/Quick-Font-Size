const vscode = require('vscode');

// Config section -> status bar label and icon. chat.fontSize drives the Copilot and Claude Code chat panels.
const AREAS = {
  editor: { label: 'Editor', icon: 'file-code' },
  chat: { label: 'Chat', icon: 'comment-discussion' },
  'terminal.integrated': { label: 'Terminal', icon: 'terminal' },
};
const MIN = 6;
const MAX = 100;

const cfg = (area) => vscode.workspace.getConfiguration(area);
const get = (area) => cfg(area).get('fontSize');

// Write to the scope the value comes from, so a workspace override does not hide the change.
const scope = (area) =>
  cfg(area).inspect('fontSize')?.workspaceValue !== undefined
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;

// Serialize read-modify-write so fast key repeats are not lost to a stale read.
let queue = Promise.resolve();
const run = (fn) =>
  (queue = queue.then(fn).catch((e) => vscode.window.showErrorMessage(`Focus Font Size: ${e.message}`)));

const change = (area, delta) =>
  run(async () => {
    const size = get(area);
    if (typeof size !== 'number') return; // e.g. chat.fontSize on older VS Code
    const next = Math.min(MAX, Math.max(MIN, size + delta));
    if (next !== size) await cfg(area).update('fontSize', next, scope(area));
  });

const reset = (area) =>
  run(async () => {
    const { globalValue, workspaceValue } = cfg(area).inspect('fontSize') ?? {};
    if (workspaceValue !== undefined) await cfg(area).update('fontSize', undefined, vscode.ConfigurationTarget.Workspace);
    if (globalValue !== undefined) await cfg(area).update('fontSize', undefined, vscode.ConfigurationTarget.Global);
  });

exports.activate = (ctx) => {
  // The status bar shows the last area focused (as far as the API reports it), changed or picked.
  let target = ctx.globalState.get('area');
  if (!AREAS[target]) target = 'editor';

  const setTarget = (area) => {
    if (area === target) return;
    target = area;
    ctx.globalState.update('area', area);
    render();
  };

  // area: a key of AREAS, '*' for all, or omitted for the status bar area.
  const areas = (area = target) => (area === '*' ? Object.keys(AREAS) : AREAS[area] ? [area] : []);
  const act = (fn) => ({ area } = {}) => {
    const list = areas(area);
    if (list.length === 1) setTarget(list[0]);
    return Promise.all(list.map(fn));
  };

  const item = (id, name, priority, command) => {
    const i = vscode.window.createStatusBarItem(`focusFontSize.${id}`, vscode.StatusBarAlignment.Right, priority);
    Object.assign(i, { name, command });
    return i;
  };
  // Right-aligned: higher priority sits further left. Odd fractional values so
  // no other extension's item lands between the three.
  const dec = item('decrease', 'Font Size: Decrease', 9999.1103, 'focusFontSize.decrease');
  const size = item('size', 'Font Size', 9999.1102, 'focusFontSize.chooseArea');
  const inc = item('increase', 'Font Size: Increase', 9999.1101, 'focusFontSize.increase');
  dec.text = '\u2212'; // text glyphs render smaller than codicons, the API has no size option
  inc.text = '+';

  const cmd = (id, arg) => `command:focusFontSize.${id}?${encodeURIComponent(JSON.stringify([arg]))}`;

  function render() {
    const { label, icon } = AREAS[target];
    const value = get(target) ?? '-';
    size.text = `$(${icon}) ${value}`;
    size.accessibilityInformation = { label: `${label} font size ${value}. Click to choose area.`, role: 'button' };
    dec.tooltip = `Decrease ${label.toLowerCase()} font size`;
    inc.tooltip = `Increase ${label.toLowerCase()} font size`;
    dec.accessibilityInformation = { label: dec.tooltip, role: 'button' };
    inc.accessibilityInformation = { label: inc.tooltip, role: 'button' };

    const rows = Object.entries(AREAS).map(([area, a]) => {
      const name = area === target ? `**${a.label}**` : `[${a.label}](${cmd('chooseArea', { area })} "Show in status bar")`;
      return `| $(${a.icon}) ${name} | ${get(area) ?? '-'} | [Reset](${cmd('reset', { area })} "Reset to default") |`;
    });
    const tip = new vscode.MarkdownString(['| Font size | | |', '|:--|--:|:--|', ...rows].join('\n'), true);
    tip.isTrusted = { enabledCommands: ['focusFontSize.chooseArea', 'focusFontSize.reset'] };
    size.tooltip = tip;
  }

  const chooseArea = async ({ area } = {}) => {
    if (AREAS[area]) return setTarget(area);
    const choice = await vscode.window.showQuickPick(
      Object.entries(AREAS).map(([key, a]) => ({
        label: `$(${a.icon}) ${a.label}`,
        description: `${get(key) ?? 'not supported'}${key === target ? '  (shown)' : ''}`,
        key,
      })),
      { title: 'Font Size', placeHolder: 'Area to show and adjust in the status bar' },
    );
    if (choice) setTarget(choice.key);
  };

  // Follow focus through the signals the API offers.
  // ponytail: sidebar views (e.g. chat in the sidebar) report no focus event, so they update on key press only.
  const followActiveTab = () => {
    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    if (input instanceof vscode.TabInputTerminal) setTarget('terminal.integrated');
    else if (input instanceof vscode.TabInputWebview) /claudeVSCodePanel|chat/i.test(input.viewType) && setTarget('chat');
    else if (input) setTarget('editor');
  };
  const { Keyboard, Mouse } = vscode.TextEditorSelectionChangeKind;

  render();
  [dec, size, inc].forEach((i) => i.show());

  ctx.subscriptions.push(
    dec,
    size,
    inc,
    vscode.commands.registerCommand('focusFontSize.increase', act((a) => change(a, 1))),
    vscode.commands.registerCommand('focusFontSize.decrease', act((a) => change(a, -1))),
    vscode.commands.registerCommand('focusFontSize.reset', act(reset)),
    vscode.commands.registerCommand('focusFontSize.chooseArea', chooseArea),
    vscode.window.tabGroups.onDidChangeTabGroups(followActiveTab),
    // Only the active tab: background tabs change too, e.g. when files are edited by another tool.
    vscode.window.tabGroups.onDidChangeTabs((e) => e.changed.some((t) => t.isActive && t.group.isActive) && followActiveTab()),
    vscode.window.onDidChangeTextEditorSelection((e) => (e.kind === Keyboard || e.kind === Mouse) && setTarget('editor')),
    vscode.window.onDidChangeActiveTerminal((t) => t && setTarget('terminal.integrated')),
    vscode.window.onDidStartTerminalShellExecution(() => setTarget('terminal.integrated')),
    vscode.workspace.onDidChangeConfiguration(
      (e) => Object.keys(AREAS).some((a) => e.affectsConfiguration(`${a}.fontSize`)) && render(),
    ),
  );
};
