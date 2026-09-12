// Generates the Main launcher's key icons (one per app profile) plus a contact sheet.
// Each key is its app deck's top-left tile with the text removed and the app's mark scaled to fill the key.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILES = path.join(HERE, '..');
const OUT = process.argv[2] || HERE;
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });

// profile = the Name of the app profile to switch to; svg = that deck's top-left tile source
const APPS = [
  // row 2 — every deck, left to right
  { id: 'ghostty', label: 'Ghostty', profile: 'Ghostty', svg: 'ghostty/svg/01-ghostty.svg', row: 1, col: 0, bundle: '/Applications/Ghostty.app' },
  { id: 'vscode', label: 'VS Code', profile: 'VS Code', svg: 'vscode/svg/01-code.svg', row: 1, col: 1, bundle: '/Applications/Visual Studio Code.app' },
  { id: 'claude', label: 'Claude', profile: 'Claude', svg: 'claude/svg/01-claude.svg', row: 1, col: 2, bundle: '/Applications/Claude.app' },
  { id: 'safari', label: 'Safari', profile: 'Safari', svg: 'safari/svg/01-safari.svg', row: 1, col: 3, bundle: '/Applications/Safari.app' },
  { id: 'slack', label: 'Slack', profile: 'Slack', svg: 'slack/svg/01-slack.svg', row: 1, col: 4, bundle: '/Applications/Slack.app' },
  { id: 'teams', label: 'Teams', profile: 'Teams', svg: 'teams/svg/01-teams.svg', row: 1, col: 5, bundle: '/Applications/Microsoft Teams.app' },
  { id: 'outlook', label: 'Outlook', profile: 'Outlook', svg: 'outlook/svg/01-outlook.svg', row: 1, col: 6, bundle: '/Applications/Microsoft Outlook.app' },
  { id: 'discord', label: 'Discord', profile: 'Discord', svg: 'discord/svg/01-discord.svg', row: 1, col: 7, bundle: '/Applications/Discord.app' },
  // row 3 — continues from the middle
  { id: 'word', label: 'Word', profile: 'Word', svg: 'word/svg/01-word.svg', row: 2, col: 3, bundle: '/Applications/Microsoft Word.app' },
  { id: 'excel', label: 'Excel', profile: 'Excel', svg: 'excel/svg/01-excel.svg', row: 2, col: 4, bundle: '/Applications/Microsoft Excel.app' },
];

// Ghostty's main app icon: a solid ghost with its prompt in the upper left of the blue dot-matrix screen.
// The tile's own dotted blue background is the screen, so no bezel is drawn.
function ghosttyApp() {
  let d = 'M12 54 V32 A20 20 0 0 1 52 32 V54';
  let x = 52;
  for (let i = 0; i < 4; i++) { d += ` Q${x - 2.5} 60 ${x - 5} 55 Q${x - 7.5} 50 ${x - 10} 55`; x -= 10; }
  d += ' Z';
  return `<g transform="translate(-6 -10) scale(0.95)">
  <path d="${d}" fill="#dfe3ff" stroke="#f4f6ff" stroke-width="1.6" stroke-linejoin="round"/>
  <polyline points="21,27 28,32 21,37" fill="none" stroke="#1d2bb5" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="32" y1="37" x2="43" y2="37" stroke="#1d2bb5" stroke-width="4.4" stroke-linecap="round"/>
</g>`;
}

// drop the name and shortcut lines (y ≈ 105–128) and the per-deck edge marks (VS Code's activity bar, Teams' top pill),
// then scale the 64-unit mark group up to fill the tile
function fullBleed(svg, id) {
  svg = svg.replace(/<text x="72" y="1(0[0-9]|1[0-9]|2[0-9])"[^>]*>[^<]*<\/text>/g, '')
    .replace(/<rect x="0" y="30" width="4\.5" height="52"[^>]*\/>/, '')
    .replace(/<rect x="60" y="6" width="24" height="4" rx="2"[^>]*\/>/, '');
  if (id === 'ghostty') svg = svg.replace(/(<g transform="translate\(40 14\)" filter="url\(#glow\)">)[\s\S]*?(<\/g>)/, `<g transform="translate(40 14)">${ghosttyApp()}</g>`);
  return svg.replace(/<g transform="translate\(40 1[46]\)"/, '<g transform="translate(12 12) scale(1.875)"');
}

const fontDir = path.join(os.homedir(), 'Library/Fonts');
const FONT = {
  fontFiles: [
    ...['Excel', 'Word'].flatMap((a) => ['Aptos.ttf', 'Aptos-Bold.ttf'].map((f) => `/Applications/Microsoft ${a}.app/Contents/Resources/DFonts/${f}`)),
    '/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSMono.ttf',
    ...['JetBrainsMonoNerdFont-Bold.ttf', 'JetBrainsMonoNerdFont-ExtraBold.ttf'].map((f) => path.join(fontDir, f)),
  ].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
};

const pngs = {};
for (const a of APPS) {
  const n = String(a.row * 8 + a.col + 1).padStart(2, '0');
  a.file = `${n}-${a.id}.png`;
  const svg = fullBleed(fs.readFileSync(path.join(PROFILES, a.svg), 'utf8'), a.id);
  fs.writeFileSync(path.join(OUT, 'svg', `${n}-${a.id}.svg`), svg);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 288 }, font: FONT }).render().asPng();
  fs.writeFileSync(path.join(OUT, 'icons', a.file), png);
  pngs[`${a.col},${a.row}`] = png;
}

fs.writeFileSync(path.join(OUT, 'keymap.json'), JSON.stringify(APPS.map((a) => ({
  pos: { col: a.col, row: a.row }, file: a.file, id: a.id, label: a.label, profile: a.profile, bundle: a.bundle,
})), null, 2));

// contact sheet: 8 x 4 grid; unused keys are drawn as dark, empty keys
const S = 144, G = 22, P = 40;
const sheetW = P * 2 + 8 * S + 7 * G, sheetH = P * 2 + 4 * S + 3 * G;
let body = '';
for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
  const x = P + col * (S + G), y = P + row * (S + G), png = pngs[`${col},${row}`];
  body += png
    ? `<clipPath id="c${col}${row}"><rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18"/></clipPath><image x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#c${col}${row})" href="data:image/png;base64,${png.toString('base64')}"/>`
    : `<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18" fill="#141416" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1.5"/>`;
}
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0a0a0b"/>${body}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${APPS.length} launcher keys to ${OUT}`);
