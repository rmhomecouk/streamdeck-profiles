// Builds Main.streamDeckProfile (Stream Deck 7.x, ProfilesV3 layout): the launcher, one key per app deck.
// Each key is a Multi Action that switches to the app's profile and then brings the app to the front.
// Action shapes are copied from keys the Stream Deck app wrote (Switch Profile, Multi Action Switch, Open Application).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.resolve(process.argv[2] || path.join(HERE, 'icons'));
const OUTFILE = path.resolve(process.argv[3] || path.join(HERE, 'Main.streamDeckProfile'));
const keymap = JSON.parse(fs.readFileSync(path.join(ICONS, '..', 'keymap.json'), 'utf8'));

// installed profile id for each deck, by profile Name. tools/backup.mjs passes these in; when this file is
// imported on its own they're empty, so pick each key's profile in the Stream Deck app
const TARGETS = JSON.parse(process.env.DECK_PROFILE_UUIDS || '{}');

const PLUGIN = {
  multi: { Name: 'Multi Action', UUID: 'com.elgato.streamdeck.multiactions', Version: '1.0' },
  rotate: { Name: 'Switch Profile', UUID: 'com.elgato.streamdeck.profile.rotate', Version: '1.0' },
  openapp: { Name: 'Open Application', UUID: 'com.elgato.streamdeck.system.openapp', Version: '1.0' },
};

// Open Application settings as the Stream Deck app writes them, including exec and source
const plist = (file, key) => execSync(`defaults read "${file}" ${key}`).toString().trim();
function openApp(bundle) {
  const info = path.join(bundle, 'Contents', 'Info.plist');
  return {
    app_name: path.basename(bundle, '.app'), args: '', bring_to_front: true, bundle_id: plist(info, 'CFBundleIdentifier'),
    bundle_path: bundle, exec: path.join(bundle, 'Contents', 'MacOS', plist(info, 'CFBundleExecutable')),
    is_bundle: true, long_press: 'quit', source: bundle,
  };
}
const step = (plugin, name, settings) => ({
  ActionID: crypto.randomUUID(), LinkedTitle: true, Name: name, Plugin: plugin, Resources: null,
  Settings: settings, State: 0, States: [{}], UUID: plugin.UUID,
});
const steps = (k) => [
  step(PLUGIN.rotate, 'Switch Profile', { DeviceUUID: '', PageIndex: 1, ProfileUUID: (TARGETS[k.profile] || '').toLowerCase() }),
  step(PLUGIN.openapp, 'Open Application', openApp(k.bundle)),
];

const B32 = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
const imageId = () => Array.from(crypto.randomBytes(26), (b) => B32[b & 31]).join('') + 'Z';
const U = () => crypto.randomUUID().toUpperCase();
const state = (img) => ({
  FontFamily: '', FontSize: 12, FontStyle: '', FontUnderline: false,
  Image: `Images/${img}`, OutlineThickness: 2, ShowTitle: false, Title: '',
  TitleAlignment: 'bottom', TitleColor: '#ffffff',
});

const stage = fs.mkdtempSync(path.join(path.dirname(OUTFILE), '.build-'));
const profileId = U(), pageId = U(), defaultPageId = U();
const sd = path.join(stage, 'Profiles', `${profileId}.sdProfile`);
const page = path.join(sd, 'Profiles', pageId);
fs.mkdirSync(path.join(page, 'Images'), { recursive: true });
fs.mkdirSync(path.join(sd, 'Profiles', defaultPageId, 'Images'), { recursive: true });
fs.mkdirSync(path.join(stage, 'Resources'), { recursive: true });

const actions = {};
for (const k of keymap) {
  const img = `${imageId()}.png`;
  fs.copyFileSync(path.join(ICONS, k.file), path.join(page, 'Images', img));
  // A Multi Action Switch alternates between its two lists on each press; both lists are the same, so every press does the same thing
  actions[`${k.pos.col},${k.pos.row}`] = {
    ActionID: crypto.randomUUID(),
    Actions: [{ Actions: steps(k) }, { Actions: steps(k) }],
    LinkedTitle: true,
    Name: 'Multi Action Switch',
    Plugin: PLUGIN.multi,
    Resources: null,
    Settings: {},
    State: 0,
    States: [state(img), state(img)],
    UUID: 'com.elgato.streamdeck.multiactions.routine2',
  };
}

const w = (p, o) => fs.writeFileSync(p, JSON.stringify(o));
w(path.join(page, 'manifest.json'), { Controllers: [{ Actions: actions, Type: 'Keypad' }], Icon: '', Name: '' });
w(path.join(sd, 'Profiles', defaultPageId, 'manifest.json'), { Controllers: [{ Actions: null, Type: 'Keypad' }], Icon: '', Name: '' });
w(path.join(sd, 'manifest.json'), {
  Device: { Model: '20GAT9901', UUID: '' }, // 20GAT9901 = Stream Deck XL
  Name: 'Main',
  Pages: { Current: pageId.toLowerCase(), Default: defaultPageId.toLowerCase(), Pages: [pageId.toLowerCase()] },
  Version: '3.0',
});
w(path.join(stage, 'Resources', 'manifest.json'), { resources: null });

const sdPlist = (k) => plist('/Applications/Elgato Stream Deck.app/Contents/Info.plist', k);
const appVersion = `${sdPlist('CFBundleShortVersionString')}.${sdPlist('CFBundleVersion')}`;
const osVersion = execSync('sw_vers -productVersion').toString().trim();
w(path.join(stage, 'package.json'), {
  AppVersion: appVersion,
  DeviceModel: '20GAT9901',
  DeviceSettings: null,
  FormatVersion: 1,
  OSType: 'macOS',
  OSVersion: osVersion,
  RequiredPlugins: [PLUGIN.multi.UUID, PLUGIN.rotate.UUID, PLUGIN.openapp.UUID],
});

fs.rmSync(OUTFILE, { force: true });
execSync(`cd "${stage}" && zip -qr -X "${OUTFILE}" package.json Profiles Resources`);
fs.rmSync(stage, { recursive: true, force: true });
const pointed = keymap.filter((k) => TARGETS[k.profile]).length;
console.log(`wrote ${OUTFILE} with ${Object.keys(actions).length} keys (${pointed} pointed at installed profiles; app ${appVersion}, macOS ${osVersion})`);
