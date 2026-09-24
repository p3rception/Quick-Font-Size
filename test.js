// Run: node test.js. Stubs the vscode API and checks the font size logic.
const assert = require('assert');
const Module = require('module');

const T = { Global: 1, Workspace: 2 };
const store = {
  editor: { defaultValue: 14, globalValue: 14 },
  chat: {}, // setting unknown to this VS Code version
  'terminal.integrated': { defaultValue: 12, workspaceValue: 20 },
};
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
      inspect: () => ({ ...store[area] }),
      get: () => { const s = store[area]; return s.workspaceValue ?? s.globalValue ?? s.defaultValue; },
      // Async like the real API: a read before this resolves sees the old value.
      update: (_, v, t) => new Promise((r) => setTimeout(() => {
        store[area][t === T.Workspace ? 'workspaceValue' : 'globalValue'] = v;
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
  const inc = commands['focusFontSize.increase'];
  const dec = commands['focusFontSize.decrease'];
  const reset = commands['focusFontSize.reset'];

  await Promise.all([1, 2, 3].map(() => inc({ area: 'editor' })));
  assert.strictEqual(store.editor.globalValue, 17, 'fast repeats must not be lost');

  await Promise.all(Array.from({ length: 30 }, () => dec())); // omitted area = status bar area (editor)
  assert.strictEqual(store.editor.globalValue, 6, 'clamped at minimum');

  await inc({ area: 'terminal.integrated' });
  assert.strictEqual(store['terminal.integrated'].workspaceValue, 21, 'writes to the workspace override');
  assert.strictEqual(state.area, 'terminal.integrated', 'status bar follows the changed area');

  await inc({ area: 'chat' });
  assert.deepStrictEqual(store.chat, {}, 'unsupported setting left alone');

  await reset({ area: '*' });
  assert.strictEqual(store.editor.globalValue, undefined);
  assert.strictEqual(store['terminal.integrated'].workspaceValue, undefined);

  console.log('ok');
})();
