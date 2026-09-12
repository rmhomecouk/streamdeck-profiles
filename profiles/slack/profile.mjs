// Builds Slack.streamDeckProfile (Stream Deck 7.x, ProfilesV3 layout) for the Stream Deck XL.
// Action/manifest shapes mirror real ProfilesV3 data; see the repo README for format notes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.resolve(process.argv[2] || path.join(HERE, 'icons'));
const OUTFILE = path.resolve(process.argv[3] || path.join(HERE, 'Slack.streamDeckProfile'));
const keymap = JSON.parse(fs.readFileSync(path.join(ICONS, '..', 'keymap.json'), 'utf8'));

// Top-left key: Switch Profile back to the Main launcher (settings shape copied from a key the Stream Deck app wrote).
// tools/backup.mjs passes Main's id in; when this file is imported on its own the target is empty, so pick Main in the Stream Deck app
const MAIN = { DeviceUUID: '', PageIndex: 1, ProfileUUID: (process.env.MAIN_PROFILE_UUID || '').toLowerCase() };

// macOS virtual keycode (kVK_*) and Qt::Key value for each key we send
const KEY = {
  A: [0, 65], D: [2, 68], E: [14, 69], F: [3, 70], G: [5, 71], H: [4, 72], I: [34, 73], J: [38, 74], K: [40, 75],
  L: [37, 76], M: [46, 77], N: [45, 78], O: [31, 79], S: [1, 83], T: [17, 84], Y: [16, 89],
  '[': [33, 91], ']': [30, 93], '\\': [42, 92], '.': [47, 46], ',': [43, 44], '/': [44, 47],
  Esc: [53, 0x01000000], Up: [126, 0x01000013], Down: [125, 0x01000015], Space: [49, 0x20],
};
// id -> [key, ...modifiers], from Slack 4.52's menu template, global shortcut table and shortcuts sheet; the top-left key is Switch Profile → Main
const SEND = {
  'jump-to': ['K', 'cmd'], search: ['G', 'cmd'], back: ['[', 'cmd'], forward: [']', 'cmd'],
  unreads: ['A', 'cmd', 'shift'], threads: ['T', 'cmd', 'shift'], activity: ['M', 'cmd', 'shift'],
  'new-message': ['N', 'cmd'], dms: ['K', 'cmd', 'shift'], channels: ['L', 'cmd', 'shift'], directory: ['E', 'cmd', 'shift'],
  'channel-info': ['I', 'cmd', 'shift'], react: ['\\', 'cmd', 'shift'], find: ['F', 'cmd'], 'add-file': ['O', 'cmd'],
  'mark-read': ['Esc'], 'mark-all-read': ['Esc', 'shift'], 'prev-unread': ['Up', 'opt', 'shift'], 'next-unread': ['Down', 'opt', 'shift'],
  'prev-channel': ['Up', 'opt'], 'next-channel': ['Down', 'opt'], 'close-pane': ['.', 'cmd'], sidebar: ['D', 'cmd', 'shift'],
  huddle: ['H', 'cmd', 'shift'], mute: ['Space', 'cmd', 'shift'], status: ['Y', 'cmd', 'shift'], canvas: ['N', 'cmd', 'shift'],
  downloads: ['J', 'cmd', 'shift'], workspaces: ['S', 'cmd', 'shift'], preferences: [',', 'cmd'], shortcuts: ['/', 'cmd'],
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
  const isMain = k.id === 'slack';
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
  Name: 'Slack',
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
