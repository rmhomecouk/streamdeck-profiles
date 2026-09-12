// Builds Discord.streamDeckProfile (Stream Deck 7.x, ProfilesV3 layout) for the Stream Deck XL.
// Action/manifest shapes mirror real ProfilesV3 data; see the repo README for format notes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.resolve(process.argv[2] || path.join(HERE, 'icons'));
const OUTFILE = path.resolve(process.argv[3] || path.join(HERE, 'Discord.streamDeckProfile'));
const keymap = JSON.parse(fs.readFileSync(path.join(ICONS, '..', 'keymap.json'), 'utf8'));

// Top-left key: Switch Profile back to the Main launcher (settings shape copied from a key the Stream Deck app wrote).
// tools/backup.mjs passes Main's id in; when this file is imported on its own the target is empty, so pick Main in the Stream Deck app
const MAIN = { DeviceUUID: '', PageIndex: 1, ProfileUUID: (process.env.MAIN_PROFILE_UUID || '').toLowerCase() };

// macOS virtual keycode (kVK_*) and Qt::Key value for each key we send
const KEY = {
  B: [11, 66], D: [2, 68], E: [14, 69], F: [3, 70], G: [5, 71], I: [34, 73], K: [40, 75], L: [37, 76], M: [46, 77], P: [35, 80],
  T: [17, 84], U: [32, 85], V: [9, 86], '[': [33, 91], ']': [30, 93], "'": [39, 39], ',': [43, 44], '/': [44, 47],
  Return: [36, 0x01000004], Esc: [53, 0x01000000], Right: [124, 0x01000014], Up: [126, 0x01000013], Down: [125, 0x01000015],
};
// id -> [key, ...modifiers], from Discord's web client keybind table (build 609489; mod = cmd, alt = opt on a Mac); the top-left key is Switch Profile → Main
const SEND = {
  'quick-switcher': ['K', 'cmd'], search: ['F', 'cmd'], back: ['[', 'cmd'], forward: [']', 'cmd'],
  'prev-server': ['Up', 'opt', 'cmd'], 'next-server': ['Down', 'opt', 'cmd'], 'dms-toggle': ['Right', 'opt', 'cmd'],
  'prev-channel': ['Up', 'opt'], 'next-channel': ['Down', 'opt'], 'prev-unread': ['Up', 'opt', 'shift'], 'next-unread': ['Down', 'opt', 'shift'],
  'prev-mention': ['Up', 'opt', 'shift', 'cmd'], 'next-mention': ['Down', 'opt', 'shift', 'cmd'], 'mark-read': ['Esc'], 'mark-server-read': ['Esc', 'shift'],
  inbox: ['I', 'cmd'], pins: ['P', 'cmd'], members: ['U', 'cmd'], emoji: ['E', 'cmd'], gifs: ['G', 'cmd'],
  upload: ['U', 'shift', 'cmd'], 'copy-link': ['L', 'shift', 'cmd'], 'new-group': ['T', 'shift', 'cmd'],
  mute: ['M', 'shift', 'cmd'], deafen: ['D', 'shift', 'cmd'], answer: ['Return', 'cmd'], 'start-call': ["'", 'ctrl'],
  'go-to-call': ['V', 'opt', 'shift', 'cmd'], soundboard: ['B', 'shift', 'cmd'], settings: [',', 'cmd'], shortcuts: ['/', 'cmd'],
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
  main: { Name: 'Switch Profile', UUID: 'com.elgato.streamdeck.profile.rotate', Version: '1.0', action: 'Switch Profile' },
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
  const isMain = k.id === 'discord';
  if (!isMain && !SEND[k.id]) throw new Error(`no hotkey for ${k.id}`);
  const p = isMain ? PLUGIN.main : PLUGIN.hotkey;
  const img = `${imageId()}.png`;
  fs.copyFileSync(path.join(ICONS, k.file), path.join(page, 'Images', img));
  actions[`${k.pos.col},${k.pos.row}`] = {
    ActionID: crypto.randomUUID(),
    LinkedTitle: true,
    Name: p.action,
    Plugin: { Name: p.Name, UUID: p.UUID, Version: p.Version },
    Resources: null,
    Settings: isMain ? { ...MAIN } : { Coalesce: true, Hotkeys: [hotkey(SEND[k.id]), EMPTY, EMPTY, EMPTY] },
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
  Name: 'Discord',
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
  RequiredPlugins: [PLUGIN.hotkey.UUID, PLUGIN.main.UUID],
});

fs.rmSync(OUTFILE, { force: true });
execSync(`cd "${stage}" && zip -qr -X "${OUTFILE}" package.json Profiles Resources`);
fs.rmSync(stage, { recursive: true, force: true });
console.log(`wrote ${OUTFILE} with ${Object.keys(actions).length} keys (app ${appVersion}, macOS ${osVersion})`);
