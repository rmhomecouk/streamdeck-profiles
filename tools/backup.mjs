// Builds one Stream Deck backup (.streamDeckProfilesBackup) holding every profile in this repo: the Main launcher
// plus each app deck, already linked to its app and pointing at each other.
//
// Why a backup: importing a .streamDeckProfile gives it a new profile id, so keys that point at other profiles
// (the launcher's keys, each deck's top-left key) can't be set before import. A restore keeps the ids it's given.
//
// Restore it in the Stream Deck app. That REPLACES ALL PROFILES on every device and can't be undone there.
// A backup must carry the Stream Deck's serial number (read here from the installed profiles), so the output
// goes to build/, which is git-ignored.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTFILE = path.resolve(process.argv[2] || path.join(ROOT, 'build', 'streamdeck-profiles.streamDeckProfilesBackup'));
const PROFILES_V3 = path.join(os.homedir(), 'Library/Application Support/com.elgato.StreamDeck/ProfilesV3');
const MODEL = '20GAT9901'; // Stream Deck XL

// Safari lives in the system cryptex; the Stream Deck app links profiles to that path
const CRYPTEX_SAFARI = '/System/Volumes/Preboot/Cryptexes/App/System/Applications/Safari.app';
const DECKS = [
  { dir: 'ghostty', name: 'Ghostty', app: '/Applications/Ghostty.app' },
  { dir: 'vscode', name: 'VS Code', app: '/Applications/Visual Studio Code.app' },
  { dir: 'claude', name: 'Claude', app: '/Applications/Claude.app' },
  { dir: 'safari', name: 'Safari', app: fs.existsSync(CRYPTEX_SAFARI) ? CRYPTEX_SAFARI : '/Applications/Safari.app' },
  { dir: 'slack', name: 'Slack', app: '/Applications/Slack.app' },
  { dir: 'teams', name: 'Teams', app: '/Applications/Microsoft Teams.app' },
  { dir: 'outlook', name: 'Outlook', app: '/Applications/Microsoft Outlook.app' },
  { dir: 'discord', name: 'Discord', app: '/Applications/Discord.app' },
  { dir: 'word', name: 'Word', app: '/Applications/Microsoft Word.app' },
  { dir: 'excel', name: 'Excel', app: '/Applications/Microsoft Excel.app' },
  { dir: 'mail', name: 'Mail', app: '/System/Applications/Mail.app' },
  { dir: 'powerpoint', name: 'PowerPoint', app: '/Applications/Microsoft PowerPoint.app' },
  { dir: 'finder', name: 'Finder', app: '/System/Library/CoreServices/Finder.app' },
];

// stable profile ids, derived from each profile's folder name, so rebuilds keep pointing at the same profiles
function stableId(dir) {
  const h = crypto.createHash('sha1').update(`streamdeck-profiles/${dir}`).digest('hex');
  const variant = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`.toUpperCase();
}
const MAIN_ID = stableId('main');

// the device serial, as the Stream Deck app records it in every installed profile for this device
function deviceSerial() {
  for (const f of fs.existsSync(PROFILES_V3) ? fs.readdirSync(PROFILES_V3) : []) {
    const m = path.join(PROFILES_V3, f, 'manifest.json');
    if (!fs.existsSync(m)) continue;
    const d = JSON.parse(fs.readFileSync(m, 'utf8')).Device || {};
    if (d.Model === MODEL && d.UUID) return d.UUID;
  }
  throw new Error(`no installed ${MODEL} profile to read the device serial from — import any one profile first`);
}
const serial = deviceSerial();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-backup-'));
const stage = path.join(tmp, 'backup');
fs.mkdirSync(path.join(stage, 'Profiles'), { recursive: true });
fs.mkdirSync(path.join(stage, 'Resources'), { recursive: true });

// run a profile's own builder, then move its profile folder into the backup under a stable id
function add(dir, id, appIdentifier, env) {
  const pkg = path.join(tmp, `${dir}.streamDeckProfile`), x = path.join(tmp, dir);
  execSync(`node "${path.join(ROOT, 'profiles', dir, 'profile.mjs')}" "${path.join(ROOT, 'profiles', dir, 'icons')}" "${pkg}"`,
    { env: { ...process.env, ...env }, stdio: 'ignore' });
  execSync(`unzip -q "${pkg}" -d "${x}"`);
  const [src] = fs.readdirSync(path.join(x, 'Profiles')).filter((f) => f.endsWith('.sdProfile'));
  const dest = path.join(stage, 'Profiles', `${id}.sdProfile`);
  fs.renameSync(path.join(x, 'Profiles', src), dest);
  fs.mkdirSync(path.join(dest, 'Images'), { recursive: true });
  const man = JSON.parse(fs.readFileSync(path.join(dest, 'manifest.json'), 'utf8'));
  fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify({
    AppIdentifier: appIdentifier, Device: { Model: MODEL, UUID: serial }, Name: man.Name, Pages: man.Pages, Version: man.Version,
  }));
  return man.Name;
}

const names = DECKS.map((d) => add(d.dir, stableId(d.dir), d.app, { MAIN_PROFILE_UUID: MAIN_ID }));
const targets = Object.fromEntries(DECKS.map((d) => [d.name, stableId(d.dir)]));
names.unshift(add('main', MAIN_ID, '*', { DECK_PROFILE_UUIDS: JSON.stringify(targets) }));
fs.writeFileSync(path.join(stage, 'Resources', 'manifest.json'), JSON.stringify({ resources: null }, null, 2));

fs.mkdirSync(path.dirname(OUTFILE), { recursive: true });
fs.rmSync(OUTFILE, { force: true });
execSync(`cd "${stage}" && zip -qr -X -0 "${OUTFILE}" Resources Profiles`); // the app's own backups are stored uncompressed
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`wrote ${OUTFILE}\n${names.length} profiles: ${names.join(', ')}\nMain = ${MAIN_ID.toLowerCase()}`);
