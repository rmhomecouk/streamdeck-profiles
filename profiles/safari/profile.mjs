// Builds Safari.streamDeckProfile (Stream Deck 7.x, ProfilesV3 layout) for the Stream Deck XL.
// Action/manifest shapes mirror real ProfilesV3 data; see the repo README for format notes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.resolve(process.argv[2] || path.join(HERE, 'icons'));
const OUTFILE = path.resolve(process.argv[3] || path.join(HERE, 'Safari.streamDeckProfile'));
const keymap = JSON.parse(fs.readFileSync(path.join(ICONS, '..', 'keymap.json'), 'utf8'));

const APP = { path: '/Applications/Safari.app', bundleIdentifier: 'com.apple.Safari' };

// macOS virtual keycode (kVK_*) and Qt::Key value for each key we send
const KEY = {
  B: [11, 66], D: [2, 68], F: [3, 70], G: [5, 71], H: [4, 72], L: [37, 76], N: [45, 78], R: [15, 82],
  T: [17, 84], W: [13, 87], Y: [16, 89], Z: [6, 90], '0': [29, 48],
  '[': [33, 91], ']': [30, 93], '.': [47, 46], '\\': [42, 92], '-': [27, 45], '=': [24, 61],
  tab: [48, 0x01000001], up: [126, 0x01000013], down: [125, 0x01000015],
};
// id -> [key, ...modifiers], from Safari 27's MainMenu.nib; 'safari' is an Open Application action
const SEND = {
  'new-tab': ['T', 'cmd'], 'new-window': ['N', 'cmd'], private: ['N', 'cmd', 'shift'],
  'prev-tab': ['tab', 'ctrl', 'shift'], 'next-tab': ['tab', 'ctrl'], 'close-tab': ['W', 'cmd'], 'tab-overview': ['\\', 'cmd', 'shift'],
  back: ['[', 'cmd'], forward: [']', 'cmd'], reload: ['R', 'cmd'], stop: ['.', 'cmd'],
  address: ['L', 'cmd'], home: ['H', 'cmd', 'shift'], history: ['Y', 'cmd'], reopen: ['Z', 'cmd'],
  find: ['F', 'cmd'], 'find-prev': ['G', 'cmd', 'shift'], 'find-next': ['G', 'cmd'], reader: ['R', 'cmd', 'shift'],
  'zoom-out': ['-', 'cmd'], 'actual-size': ['0', 'cmd'],
  'zoom-in': ['=', 'cmd', 'shift'], // menu says ⌘+; '+' is shift-= and AppKit treats the shift as implied
  'full-screen': ['F', 'cmd', 'ctrl'],
  sidebar: ['L', 'cmd', 'shift'], 'add-bookmark': ['D', 'cmd'], 'reading-list': ['D', 'cmd', 'shift'],
  bookmarks: ['B', 'cmd', 'opt'], favorites: ['B', 'cmd', 'shift'], downloads: ['L', 'cmd', 'opt'],
  'group-prev': ['up', 'cmd', 'shift'], 'group-next': ['down', 'cmd', 'shift'],
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
  const isApp = k.id === 'safari';
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
  Name: 'Safari',
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
