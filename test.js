// Run: node test.js. Stubs the vscode API and checks the font size logic.
const assert = require('assert');
const Module = require('module');

const T = { Global: 1, Workspace: 2 };
// Setting id -> scope values. Unlisted settings are unknown to this VS Code (e.g. chat.fontSize).
const store = {
  'editor.fontSize': { defaultValue: 14, globalValue: 14 },
  'editor.lineHeight': { defaultValue: 0, globalValue: 22 },
  'terminal.integrated.fontSize': { defaultValue: 12, workspaceValue: 20 },
  'terminal.integrated.lineHeight': { defaultValue: 1 },
  'quickFontSize.step': { defaultValue: 1 },
  'quickFontSize.minimum': { defaultValue: 6 },
  'quickFontSize.maximum': { defaultValue: 100 },
};
const val = (id) => { const s = store[id] ?? {}; return s.workspaceValue ?? s.globalValue ?? s.defaultValue; };

const commands = {};
const noop = () => ({ dispose() {} });
const vscode = {
  ConfigurationTarget: T,
  StatusBarAlignment: { Right: 2 },
  MarkdownString: class { constructor(v) { this.value = v; } },
  TextEditorSelectionChangeKind: { Keyboard: 1, Mouse: 2 },
  window: {
    createStatusBarItem: () => ({ show() {}, dispose() {} }),
    showErrorMessage: (m) => assert.fail(m),
    tabGroups: { onDidChangeTabGroups: noop, onDidChangeTabs: noop },
    onDidChangeTextEditorSelection: noop,
    onDidChangeActiveTerminal: noop,
    onDidStartTerminalShellExecution: noop,
  },
  commands: { registerCommand: (id, fn) => ((commands[id] = fn), noop()) },
  workspace: {
    onDidChangeConfiguration: noop,
    getConfiguration: (area) => ({
      inspect: (key) => store[`${area}.${key}`] && { ...store[`${area}.${key}`] },
      get: (key) => val(`${area}.${key}`),
      // Async like the real API: a read before this resolves sees the old value.
      update: (key, v, t) => new Promise((r) => setTimeout(() => {
        (store[`${area}.${key}`] ??= {})[t === T.Workspace ? 'workspaceValue' : 'globalValue'] = v;
        r();
      }, 5)),
    }),
  },
};
const load = Module._load;
Module._load = (req, ...rest) => (req === 'vscode' ? vscode : load(req, ...rest));

const state = {};
require('./extension').activate({
  subscriptions: [],
  globalState: { get: (k) => state[k], update: (k, v) => (state[k] = v) },
});

(async () => {
  const inc = commands['quickFontSize.increase'];
  const dec = commands['quickFontSize.decrease'];
  const reset = commands['quickFontSize.reset'];

  await Promise.all([1, 2, 3].map(() => inc({ area: 'editor' })));
  assert.strictEqual(val('editor.fontSize'), 17, 'fast repeats must not be lost');
  assert.strictEqual(val('editor.lineHeight'), 28, 'pixel line height scales with the font (rounded each step)');

  await Promise.all([1, 2, 3].map(() => dec())); // omitted area = status bar area (editor)
  assert.strictEqual(val('editor.lineHeight'), 22, 'line height returns to its start without drift');

  store['editor.lineHeight'].globalValue = 9;
  await Promise.all(Array.from({ length: 30 }, () => dec()));
  assert.strictEqual(val('editor.fontSize'), 6, 'clamped at minimum');
  assert.strictEqual(val('editor.lineHeight'), 8, 'pixel line height never drops into multiplier range');

  store['quickFontSize.step'].globalValue = 0.1;
  store['quickFontSize.maximum'].globalValue = 6.2;
  await Promise.all(Array.from({ length: 5 }, () => inc()));
  assert.strictEqual(val('editor.fontSize'), 6.2, 'custom step without float noise, clamped at custom maximum');
  store['quickFontSize.step'].globalValue = -3;
  store['quickFontSize.maximum'].globalValue = undefined;
  await inc();
  assert.strictEqual(val('editor.fontSize'), 7.2, 'invalid step falls back to 1');

  await inc({ area: 'terminal.integrated' });
  assert.strictEqual(store['terminal.integrated.fontSize'].workspaceValue, 21, 'writes to the workspace override');
  assert.strictEqual(store['terminal.integrated.lineHeight'].globalValue, undefined, 'multiplier line height untouched');
  assert.strictEqual(state.area, 'terminal.integrated', 'status bar follows the changed area');

  await inc({ area: 'chat' });
  assert.strictEqual(store['chat.fontSize'], undefined, 'unsupported setting left alone');

  store['editor.fontSize'].globalValue = 28;
  store['editor.lineHeight'].globalValue = 44;
  await reset({ area: '*' });
  assert.strictEqual(store['editor.fontSize'].globalValue, undefined);
  assert.strictEqual(val('editor.lineHeight'), 22, 'reset scales line height to the default font');
  assert.strictEqual(store['terminal.integrated.fontSize'].workspaceValue, undefined);

  console.log('ok');
})();
