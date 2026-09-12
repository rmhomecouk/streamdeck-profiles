// Builds Word.streamDeckProfile (Stream Deck 7.x, ProfilesV3 layout) for the Stream Deck XL.
// Action/manifest shapes mirror real ProfilesV3 data; see the repo README for format notes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.resolve(process.argv[2] || path.join(HERE, 'icons'));
const OUTFILE = path.resolve(process.argv[3] || path.join(HERE, 'Word.streamDeckProfile'));
const keymap = JSON.parse(fs.readFileSync(path.join(ICONS, '..', 'keymap.json'), 'utf8'));

// Open Application settings, using the key names Stream Deck 7.5 itself writes for this action
const APP = {
  app_name: 'Microsoft Word', args: '', bring_to_front: true, bundle_id: 'com.microsoft.Word',
  bundle_path: '/Applications/Microsoft Word.app', exec: '', is_bundle: true, long_press: 'quit', source: '',
};

// macOS virtual keycode (kVK_*) and Qt::Key value for each key we send
const KEY = {
  A: [0, 65], B: [11, 66], C: [8, 67], E: [14, 69], F: [3, 70], G: [5, 71], I: [34, 73], L: [37, 76], N: [45, 78], P: [35, 80],
  R: [15, 82], S: [1, 83], U: [32, 85], V: [9, 86], X: [7, 88], Z: [6, 90],
  '1': [18, 49], '2': [19, 50], '3': [20, 51], '[': [33, 91], ']': [30, 93], Return: [36, 0x01000004],
};
// id -> [key, ...modifiers], from Word 16.112's own key table (AppleScript find key); 'word' is Open Application
const SEND = {
  save: ['S', 'cmd'], 'save-as': ['S', 'shift', 'cmd'], print: ['P', 'cmd'], undo: ['Z', 'cmd'], redo: ['Z', 'shift', 'cmd'],
  find: ['F', 'cmd'], 'go-to': ['G', 'opt', 'cmd'],
  bold: ['B', 'cmd'], italic: ['I', 'cmd'], underline: ['U', 'cmd'], strikethrough: ['X', 'shift', 'cmd'],
  smaller: ['[', 'cmd'], bigger: [']', 'cmd'], 'copy-format': ['C', 'opt', 'cmd'], 'paste-format': ['V', 'opt', 'cmd'],
  'heading-1': ['1', 'opt', 'cmd'], 'heading-2': ['2', 'opt', 'cmd'], 'heading-3': ['3', 'opt', 'cmd'], normal: ['N', 'shift', 'cmd'],
  bullets: ['L', 'shift', 'cmd'], 'align-left': ['L', 'cmd'], center: ['E', 'cmd'], 'page-break': ['Return', 'cmd'],
  'track-changes': ['E', 'shift', 'cmd'], comment: ['A', 'opt', 'cmd'], footnote: ['F', 'opt', 'cmd'], spelling: ['L', 'opt', 'cmd'],
  thesaurus: ['R', 'ctrl', 'opt', 'cmd'], focus: ['F', 'ctrl', 'shift', 'cmd'], 'styles-pane': ['S', 'opt', 'shift', 'cmd'], copilot: ['I', 'ctrl', 'cmd'],
};
const BIT = { shift: 1, ctrl: 2, opt: 4, cmd: 8 };

const EMPTY = { KeyCmd: false, KeyCtrl: false, KeyModifiers: 0, KeyOption: false, KeyShift: false, NativeCode: -1, QTKeyCode: 33554431, VKeyCode: -1 };
function hotkey([k, ...mods]) {
  const [vk, qt] = KEY[k] ?? [];
  if (vk === undefined) throw new Error(`no keycode for ${k}`);
  return {
    KeyCmd: mods.includes('cmd'), KeyCtrl: mods.includes('ctrl'),
    KeyModifiers: mods.reduce((m, x) => m | BIT[x], 0),
    KeyOption: mods.includes('opt'), KeyShift: mods.includes('shift'),
    NativeCode: vk, QTKeyCode: qt, VKeyCode: vk,
  };
}
const B32 = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
const imageId = () => Array.from(crypto.randomBytes(26), (b) => B32[b & 31]).join('') + 'Z';
const U = () => crypto.randomUUID().toUpperCase();
const state = (img) => ({
  FontFamily: '', FontSize: 12, FontStyle: '', FontUnderline: false,
  Image: `Images/${img}`, OutlineThickness: 2, ShowTitle: false, Title: '',
  TitleAlignment: 'bottom', TitleColor: '#ffffff',
});
const PLUGIN = {
  hotkey: { Name: 'Activate a Key Command', UUID: 'com.elgato.streamdeck.system.hotkey', Version: '1.0', action: 'Hotkey' },
  openapp: { Name: 'Open Application', UUID: 'com.elgato.streamdeck.system.openapp', Version: '1.0', action: 'Open Application' },
};

const stage = fs.mkdtempSync(path.join(path.dirname(OUTFILE), '.build-'));
const profileId = U(), pageId = U(), defaultPageId = U();
const sd = path.join(stage, 'Profiles', `${profileId}.sdProfile`);
const page = path.join(sd, 'Profiles', pageId);
fs.mkdirSync(path.join(page, 'Images'), { recursive: true });
fs.mkdirSync(path.join(sd, 'Profiles', defaultPageId, 'Images'), { recursive: true });
fs.mkdirSync(path.join(stage, 'Resources'), { recursive: true });

const actions = {};
for (const k of keymap) {
  const isApp = k.id === 'word';
  if (!isApp && !SEND[k.id]) throw new Error(`no hotkey for ${k.id}`);
  const p = isApp ? PLUGIN.openapp : PLUGIN.hotkey;
  const img = `${imageId()}.png`;
  fs.copyFileSync(path.join(ICONS, k.file), path.join(page, 'Images', img));
  actions[`${k.pos.col},${k.pos.row}`] = {
    ActionID: crypto.randomUUID(),
    LinkedTitle: true,
    Name: p.action,
    Plugin: { Name: p.Name, UUID: p.UUID, Version: p.Version },
    Resources: null,
    Settings: isApp ? { ...APP } : { Coalesce: true, Hotkeys: [hotkey(SEND[k.id]), EMPTY, EMPTY, EMPTY] },
    State: 0,
    States: [state(img)],
    UUID: p.UUID,
  };
}

const w = (p, o) => fs.writeFileSync(p, JSON.stringify(o));
w(path.join(page, 'manifest.json'), { Controllers: [{ Actions: actions, Type: 'Keypad' }], Icon: '', Name: '' });
w(path.join(sd, 'Profiles', defaultPageId, 'manifest.json'), { Controllers: [{ Actions: null, Type: 'Keypad' }], Icon: '', Name: '' });
w(path.join(sd, 'manifest.json'), {
  Device: { Model: '20GAT9901', UUID: '' }, // 20GAT9901 = Stream Deck XL
  Name: 'Word',
  Pages: { Current: pageId.toLowerCase(), Default: defaultPageId.toLowerCase(), Pages: [pageId.toLowerCase()] },
  Version: '3.0',
});
w(path.join(stage, 'Resources', 'manifest.json'), { resources: null });

const plist = (k) => execSync(`defaults read "/Applications/Elgato Stream Deck.app/Contents/Info.plist" ${k}`).toString().trim();
const appVersion = `${plist('CFBundleShortVersionString')}.${plist('CFBundleVersion')}`;
const osVersion = execSync('sw_vers -productVersion').toString().trim();
w(path.join(stage, 'package.json'), {
  AppVersion: appVersion,
  DeviceModel: '20GAT9901',
  DeviceSettings: null,
  FormatVersion: 1,
  OSType: 'macOS',
  OSVersion: osVersion,
  RequiredPlugins: [PLUGIN.hotkey.UUID, PLUGIN.openapp.UUID],
});

fs.rmSync(OUTFILE, { force: true });
execSync(`cd "${stage}" && zip -qr -X "${OUTFILE}" package.json Profiles Resources`);
fs.rmSync(stage, { recursive: true, force: true });
console.log(`wrote ${OUTFILE} with ${Object.keys(actions).length} keys (app ${appVersion}, macOS ${osVersion})`);
