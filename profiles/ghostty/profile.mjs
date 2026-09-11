// Builds Ghostty.streamDeckProfile (Stream Deck 7.x, ProfilesV3 layout) for the Stream Deck XL.
// Action/manifest shapes mirror the user's own profiles in ~/Library/Application Support/com.elgato.StreamDeck/ProfilesV3.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.resolve(process.argv[2] || path.join(HERE, 'icons'));                         // dir with NN-id.png
const OUTFILE = path.resolve(process.argv[3] || path.join(HERE, 'Ghostty.streamDeckProfile'));
const keymap = JSON.parse(fs.readFileSync(path.join(ICONS, '..', 'keymap.json'), 'utf8'));

// macOS virtual keycode (kVK_*) and Qt::Key value for each key we send
const KEY = {
  N: [45, 78], T: [17, 84], W: [13, 87], Z: [6, 90], P: [35, 80], D: [2, 68], F: [3, 70], G: [5, 71], K: [40, 75],
  C: [8, 67], V: [9, 86], '0': [29, 48], '[': [33, 91], ']': [30, 93], '`': [50, 96], '-': [27, 45], '=': [24, 61], ',': [43, 44],
  left: [123, 0x01000012], up: [126, 0x01000013], right: [124, 0x01000014], down: [125, 0x01000015],
  return: [36, 0x01000004], home: [115, 0x01000010], end: [119, 0x01000011],
};
// id -> [key, ...modifiers]
const SEND = {
  'quick-terminal': ['`', 'cmd'], 'new-window': ['N', 'cmd'], 'new-tab': ['T', 'cmd'],
  'prev-tab': ['[', 'cmd', 'shift'], 'next-tab': [']', 'cmd', 'shift'], close: ['W', 'cmd'], reopen: ['Z', 'cmd'],
  palette: ['P', 'cmd', 'shift'],
  'split-right': ['D', 'cmd'], 'split-down': ['D', 'cmd', 'shift'],
  'focus-left': ['left', 'cmd', 'opt'], 'focus-up': ['up', 'cmd', 'opt'], 'focus-down': ['down', 'cmd', 'opt'], 'focus-right': ['right', 'cmd', 'opt'],
  'zoom-split': ['return', 'cmd', 'shift'], equalize: ['=', 'cmd', 'ctrl'],
  'prompt-up': ['up', 'cmd'], 'prompt-down': ['down', 'cmd'], 'scroll-top': ['home', 'cmd'], 'scroll-bottom': ['end', 'cmd'],
  find: ['F', 'cmd'], 'find-prev': ['G', 'cmd', 'shift'], 'find-next': ['G', 'cmd'], clear: ['K', 'cmd'],
  copy: ['C', 'cmd'], paste: ['V', 'cmd'], 'font-smaller': ['-', 'cmd'], 'font-reset': ['0', 'cmd'], 'font-bigger': ['=', 'cmd'],
  fullscreen: ['return', 'cmd'], 'open-config': [',', 'cmd'], 'reload-config': [',', 'cmd', 'shift'],
};
const BIT = { shift: 1, ctrl: 2, opt: 4, cmd: 8 };

const EMPTY = { KeyCmd: false, KeyCtrl: false, KeyModifiers: 0, KeyOption: false, KeyShift: false, NativeCode: -1, QTKeyCode: 33554431, VKeyCode: -1 };
function hotkey([k, ...mods]) {
  const [vk, qt] = KEY[k];
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

const stage = fs.mkdtempSync(path.join(path.dirname(OUTFILE), '.build-'));
const profileId = U(), pageId = U(), defaultPageId = U();
const sd = path.join(stage, 'Profiles', `${profileId}.sdProfile`);
const page = path.join(sd, 'Profiles', pageId);
fs.mkdirSync(path.join(page, 'Images'), { recursive: true });
fs.mkdirSync(path.join(sd, 'Profiles', defaultPageId, 'Images'), { recursive: true });
fs.mkdirSync(path.join(stage, 'Resources'), { recursive: true });

const actions = {};
for (const k of keymap) {
  const send = SEND[k.id];
  if (!send) throw new Error(`no hotkey for ${k.id}`);
  const img = `${imageId()}.png`;
  fs.copyFileSync(path.join(ICONS, k.file), path.join(page, 'Images', img));
  actions[`${k.pos.col},${k.pos.row}`] = {
    ActionID: crypto.randomUUID(),
    LinkedTitle: true,
    Name: 'Hotkey',
    Plugin: { Name: 'Activate a Key Command', UUID: 'com.elgato.streamdeck.system.hotkey', Version: '1.0' },
    Resources: null,
    Settings: { Coalesce: true, Hotkeys: [hotkey(send), EMPTY, EMPTY, EMPTY] },
    State: 0,
    States: [{
      FontFamily: '', FontSize: 12, FontStyle: '', FontUnderline: false,
      Image: `Images/${img}`, OutlineThickness: 2, ShowTitle: false, Title: '',
      TitleAlignment: 'bottom', TitleColor: '#ffffff',
    }],
    UUID: 'com.elgato.streamdeck.system.hotkey',
  };
}

const w = (p, o) => fs.writeFileSync(p, JSON.stringify(o));
w(path.join(page, 'manifest.json'), { Controllers: [{ Actions: actions, Type: 'Keypad' }], Icon: '', Name: '' });
w(path.join(sd, 'Profiles', defaultPageId, 'manifest.json'), { Controllers: [{ Actions: null, Type: 'Keypad' }], Icon: '', Name: '' });
w(path.join(sd, 'manifest.json'), {
  Device: { Model: '20GAT9901', UUID: '' }, // 20GAT9901 = Stream Deck XL (matches the user's device)
  Name: 'Ghostty',
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
  RequiredPlugins: ['com.elgato.streamdeck.system.hotkey'],
});

fs.rmSync(OUTFILE, { force: true });
execSync(`cd "${stage}" && zip -qr -X "${OUTFILE}" package.json Profiles Resources`);
fs.rmSync(stage, { recursive: true, force: true });
console.log(`wrote ${OUTFILE} with ${Object.keys(actions).length} keys (app ${appVersion}, macOS ${osVersion})`);
