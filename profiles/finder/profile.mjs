// Builds Finder.streamDeckProfile (Stream Deck 7.x, ProfilesV3 layout) for the Stream Deck XL.
// Action/manifest shapes mirror real ProfilesV3 data; see the repo README for format notes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.resolve(process.argv[2] || path.join(HERE, 'icons'));
const OUTFILE = path.resolve(process.argv[3] || path.join(HERE, 'Finder.streamDeckProfile'));
const keymap = JSON.parse(fs.readFileSync(path.join(ICONS, '..', 'keymap.json'), 'utf8'));

// Top-left key: Switch Profile back to the Main launcher (settings shape copied from a key the Stream Deck app wrote).
// tools/backup.mjs passes Main's id in; when this file is imported on its own the target is empty, so pick Main in the Stream Deck app
const MAIN = { DeviceUUID: '', PageIndex: 1, ProfileUUID: (process.env.MAIN_PROFILE_UUID || '').toLowerCase() };

// macOS virtual keycode (kVK_*) and Qt::Key value for each key we send
const KEY = {
  A: [0, 65], C: [8, 67], D: [2, 68], F: [3, 70], G: [5, 71], H: [4, 72], I: [34, 73], J: [38, 74],
  L: [37, 76], N: [45, 78], P: [35, 80], S: [1, 83], T: [17, 84], Y: [16, 89],
  '1': [18, 49], '2': [19, 50], '3': [20, 51], '4': [21, 52], '[': [33, 91], ']': [30, 93],
  up: [126, 0x01000013], backspace: [51, 0x01000003],
};
// id -> [key, ...modifiers], from the Finder's MenuBar.nib, each checked in the live menu bar; 'finder' is the Switch Profile to Main
const SEND = {
  back: ['[', 'cmd'], forward: [']', 'cmd'], enclosing: ['up', 'cmd'], home: ['H', 'cmd', 'shift'],
  downloads: ['L', 'cmd', 'opt'], applications: ['A', 'cmd', 'shift'], 'go-to-folder': ['G', 'cmd', 'shift'],
  'new-window': ['N', 'cmd'], 'new-tab': ['T', 'cmd'], 'new-folder': ['N', 'cmd', 'shift'], 'get-info': ['I', 'cmd'],
  duplicate: ['D', 'cmd'], 'copy-path': ['C', 'cmd', 'opt'], search: ['F', 'cmd'], trash: ['backspace', 'cmd'],
  'as-icons': ['1', 'cmd'], 'as-list': ['2', 'cmd'], 'as-columns': ['3', 'cmd'], 'as-gallery': ['4', 'cmd'],
  'quick-look': ['Y', 'cmd'], sidebar: ['S', 'cmd', 'ctrl'], preview: ['P', 'cmd', 'shift'], 'view-options': ['J', 'cmd'],
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
  // third-party plugin action: same shape as File Explorer's keys in the profile that plugin ships (exported by the Stream Deck app)
  tags: { Name: 'Finder Tags', UUID: 'me.hckr.findertags', Version: '1.1.2' },
};
// action names from the Finder Tags plugin's manifest.json
const TAG_ACTION = (uuid) => uuid.endsWith('clear-tags') ? 'Clear All Tags' : `${uuid.split('tag-')[1].replace(/^./, (c) => c.toUpperCase())} Tag`;

const stage = fs.mkdtempSync(path.join(path.dirname(OUTFILE), '.build-'));
const profileId = U(), pageId = U(), defaultPageId = U();
const sd = path.join(stage, 'Profiles', `${profileId}.sdProfile`);
const page = path.join(sd, 'Profiles', pageId);
fs.mkdirSync(path.join(page, 'Images'), { recursive: true });
fs.mkdirSync(path.join(sd, 'Profiles', defaultPageId, 'Images'), { recursive: true });
fs.mkdirSync(path.join(stage, 'Resources'), { recursive: true });

const actions = {};
for (const k of keymap) {
  const isMain = k.id === 'finder';
  const img = `${imageId()}.png`;
  fs.copyFileSync(path.join(ICONS, k.file), path.join(page, 'Images', img));
  const base = { ActionID: crypto.randomUUID(), LinkedTitle: true };
  if (k.plugin) {
    // the tag actions read no settings; the plugin tags whatever is selected in the Finder
    actions[`${k.pos.col},${k.pos.row}`] = {
      ...base, Name: TAG_ACTION(k.plugin),
      Plugin: { Name: PLUGIN.tags.Name, UUID: PLUGIN.tags.UUID, Version: PLUGIN.tags.Version },
      Resources: null, Settings: {}, State: 0, States: [state(img)], UUID: k.plugin,
    };
    continue;
  }
  if (!isMain && !SEND[k.id]) throw new Error(`no hotkey for ${k.id}`);
  const p = isMain ? PLUGIN.main : PLUGIN.hotkey;
  actions[`${k.pos.col},${k.pos.row}`] = {
    ...base,
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
  Name: 'Finder',
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
  RequiredPlugins: [PLUGIN.hotkey.UUID, PLUGIN.main.UUID, PLUGIN.tags.UUID],
});

fs.rmSync(OUTFILE, { force: true });
execSync(`cd "${stage}" && zip -qr -X "${OUTFILE}" package.json Profiles Resources`);
fs.rmSync(stage, { recursive: true, force: true });
console.log(`wrote ${OUTFILE} with ${Object.keys(actions).length} keys (app ${appVersion}, macOS ${osVersion})`);
