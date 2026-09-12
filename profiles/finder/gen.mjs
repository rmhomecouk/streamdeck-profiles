// Generates Stream Deck XL key icons for the Finder as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitLabel, HERO_GLYPH } from '../../tools/tile.mjs';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// The Finder's UI face is SF Pro, which resvg can't render; SF Pro Rounded is the closest it can
const SANS = '.SF NS Rounded';
const FONT = {
  fontFiles: ['/System/Library/Fonts/SFNSRounded.ttf'].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: three blues from the Finder icon's face, from its bright top edge down to the shade
// under the chin. The tags row uses the Finder's own tag colours instead, one per key.
const C = {
  go: '#4cc3ff',   // face highlight — go
  file: '#3a8cff', // face body       — files
  tag: '#ffffff',  // (each tag key sets its own colour)
  view: '#8f95ff', // shadow, pushed to indigo — view
};
// Finder's tag colours (macOS dark-mode system colours, which Finder uses for tag dots)
const TAG = { red: '#ff453a', orange: '#ff9f0a', yellow: '#ffd60a', green: '#32d74b', blue: '#0a84ff', purple: '#bf5af2', gray: '#98989d' };
const W = '#ffffff';
const INK = '#141416';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const dot = (cx, cy, r, c) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`;
const plus = (cx, cy, r, c, w = sw) => line(cx - r, cy, cx + r, cy, c, w) + line(cx, cy - r, cx, cy + r, c, w);
const badge = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="${INK}"/>`;
function arrow(cx, cy, dir, len, c = W, w = sw) {
  const h = len / 2, k = 6;
  const v = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir];
  const tx = cx + v[0] * h, ty = cy + v[1] * h, bx = cx - v[0] * h, by = cy - v[1] * h;
  const px = -v[1], py = v[0];
  return line(bx, by, tx, ty, c, w) + poly(`${tx - v[0] * k + px * k},${ty - v[1] * k + py * k} ${tx},${ty} ${tx - v[0] * k - px * k},${ty - v[1] * k - py * k}`, c, w);
}
const lens = (cx, cy, r, c) => circ(cx, cy, r) + line(cx + r * 0.72, cy + r * 0.72, cx + r * 1.5, cy + r * 1.5, c, 6);
// a Finder folder: back tab plus the front flap
const folder = (x, y, w, h, c = W, fill = 'none', s = sw) => pathS(`M${x} ${y + 5} Q${x} ${y} ${x + 5} ${y} H${x + w * 0.34} L${x + w * 0.44} ${y + 6} H${x + w - 5} Q${x + w} ${y + 6} ${x + w} ${y + 11} V${y + h - 5} Q${x + w} ${y + h} ${x + w - 5} ${y + h} H${x + 5} Q${x} ${y + h} ${x} ${y + h - 5} Z`, c, fill, s) + line(x + 1, y + 13, x + w - 1, y + 13, c, s * 0.8);
// a document with a folded corner
const page = (x, y, w, h, c = W, s = sw) => pathS(`M${x + w - 12} ${y} H${x + 5} Q${x} ${y} ${x} ${y + 5} V${y + h - 5} Q${x} ${y + h} ${x + 5} ${y + h} H${x + w - 5} Q${x + w} ${y + h} ${x + w} ${y + h - 5} V${y + 12} Z`, c, 'none', s) + poly(`${x + w - 12},${y} ${x + w - 12},${y + 12} ${x + w},${y + 12}`, c, s * 0.85);
// a Finder window: title bar with the three lights
const win = (x, y, w, h, c = W, s = sw) => rect(x, y, w, h, 7, c, 'none', s) + line(x, y + 12, x + w, y + 12, c, s * 0.8) + dot(x + 7, y + 6.5, 2, c) + dot(x + 13, y + 6.5, 2, c) + dot(x + 19, y + 6.5, 2, c);
// macOS's tag symbol (tag.fill): a label with a punched hole, pointing down-left
const tagShape = (fill, stroke) => `<path d="M31 6 H52 Q58 6 58 12 V33 Q58 36 56 38 L35 59 Q32 62 29 59 L5 35 Q2 32 5 29 L26 8 Q28 6 31 6 Z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/><circle cx="46" cy="18" r="5" fill="${INK}"/>`;

// the hero: the Finder icon — the dark face with its blue profile half, two eyes and the shared smile
// (traced from the app icon at 1024 px: the square spans 100–920, so 1 unit = 12.8 px)
function finderMark() {
  const face = 'M33 5 H52 Q59 5 59 12 V52 Q59 59 52 59 H40 Q36 59 35 55 L32.5 37 H27.5 Q25.8 37 26 34.5 Q27.5 17 33 5 Z';
  const smile = 'M13.5 43 Q31 57 48.5 43';
  return `<defs><linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#52c2ff"/><stop offset="1" stop-color="#3a8be0"/></linearGradient>
<clipPath id="fc"><path d="${face}"/></clipPath></defs>
<rect x="0" y="0" width="64" height="64" rx="14" fill="#161618" stroke="#ffffff" stroke-opacity="0.08" stroke-width="0.8"/>
<path d="${smile}" fill="none" stroke="#4cb8ff" stroke-width="3.6" stroke-linecap="round"/>
<path d="${face}" fill="url(#fb)" stroke="#0b0b0c" stroke-width="0.6"/>
<path d="${smile}" fill="none" stroke="#0b0b0c" stroke-width="3.6" stroke-linecap="round" clip-path="url(#fc)"/>
<rect x="16.6" y="20" width="2.8" height="6.4" rx="1.4" fill="#4cb8ff"/>
<rect x="42.6" y="20" width="2.8" height="6.4" rx="1.4" fill="#0b0b0c"/>`;
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// menu = where the shortcut lives in the Finder's menu bar (read from MenuBar.nib, every one confirmed in the live menu bar)
// plugin = a Finder Tags plugin action (me.hckr.findertags), which has no shortcut
const tagKey = (id, name) => ({ id: `tag-${id}`, label: name, keys: 'plugin', plugin: `me.hckr.findertags.tag-${id}`, menu: `Finder Tags ▸ ${name} Tag`, cat: 'tag', when: 'selection', c: TAG[id], icon: () => tagShape(TAG[id], '#ffffff55') });
const KEYS = [
  // row 1 — go
  { id: 'finder', label: 'Finder', keys: 'main', menu: 'Switch Profile → Main', cat: 'go', when: 'anywhere', hero: true, icon: () => finderMark() },
  { id: 'back', label: 'Back', keys: '⌘[', menu: 'Go ▸ Back', cat: 'go', when: 'anywhere', icon: (a) => poly('40,10 18,32 40,54', a, 6.5) },
  { id: 'forward', label: 'Forward', keys: '⌘]', menu: 'Go ▸ Forward', cat: 'go', when: 'anywhere', icon: (a) => poly('24,10 46,32 24,54', a, 6.5) },
  { id: 'enclosing', label: 'Enclosing folder', keys: '⌘↑', menu: 'Go ▸ Enclosing Folder', cat: 'go', when: 'anywhere', icon: (a) => folder(4, 22, 56, 38) + arrow(32, 16, 'u', 26, a, 5) },
  { id: 'home', label: 'Home', keys: '⇧⌘H', menu: 'Go ▸ Home', cat: 'go', when: 'anywhere', icon: (a) => pathS('M6 30 L32 8 L58 30') + pathS('M13 25 V54 Q13 57 16 57 H48 Q51 57 51 54 V25') + rect(26, 38, 12, 19, 3, a, `${a}44`, 4) },
  { id: 'downloads', label: 'Downloads', keys: '⌥⌘L', menu: 'Go ▸ Downloads', cat: 'go', when: 'anywhere', icon: (a) => circ(32, 32, 26) + arrow(32, 31, 'd', 26, a, 5) + line(21, 47, 43, 47, a, 4.4) },
  // the Applications folder's own mark: the "A" drawn with a pencil, a brush and a ruler, kept to its three strokes
  { id: 'applications', label: 'Applications', keys: '⇧⌘A', menu: 'Go ▸ Applications', cat: 'go', when: 'anywhere', icon: (a) => rect(4, 4, 56, 56, 14) + line(20, 48, 32, 14, W, 5) + line(44, 48, 32, 14, a, 5) + line(16, 38, 48, 38, a, 4.4) },
  { id: 'go-to-folder', label: 'Go to folder', keys: '⇧⌘G', menu: 'Go ▸ Go to Folder…', cat: 'go', when: 'anywhere', icon: (a) => folder(4, 12, 56, 42) + poly('24,31 32,39 24,47', a, 4.4) + line(35, 47, 44, 47, a, 4.4) },

  // row 2 — files
  { id: 'new-window', label: 'New window', keys: '⌘N', menu: 'File ▸ New Finder Window', cat: 'file', when: 'anywhere', icon: (a) => win(4, 10, 50, 42) + badge(52, 48, 9) + plus(52, 48, 8, a, 4.6) },
  { id: 'new-tab', label: 'New tab', keys: '⌘T', menu: 'File ▸ New Tab', cat: 'file', when: 'anywhere', icon: (a) => rect(4, 10, 56, 44, 7) + line(4, 24, 60, 24, W, 3.4) + line(32, 12, 32, 24, W, 3.4) + `<rect x="33.5" y="12" width="24.5" height="10.5" fill="${a}55"/>` + plus(32, 40, 8, a, 4.6) },
  { id: 'new-folder', label: 'New folder', keys: '⇧⌘N', menu: 'File ▸ New Folder', cat: 'file', when: 'window', icon: (a) => folder(4, 10, 56, 44) + plus(32, 38, 9, a, 5) },
  { id: 'get-info', label: 'Get info', keys: '⌘I', menu: 'File ▸ Get Info', cat: 'file', when: 'selection', icon: (a) => circ(32, 32, 26) + dot(32, 19, 3.6, a) + line(32, 28, 32, 46, a, 5.4) },
  { id: 'duplicate', label: 'Duplicate', keys: '⌘D', menu: 'File ▸ Duplicate', cat: 'file', when: 'selection', icon: (a) => page(6, 4, 34, 42, '#ffffff88', 3.6) + `<rect x="22" y="16" width="36" height="44" rx="5" fill="${INK}"/>` + page(22, 16, 36, 44, a) },
  { id: 'copy-path', label: 'Copy path', keys: '⌥⌘C', menu: 'Edit ▸ Copy as Pathname', cat: 'file', when: 'selection', icon: (a) => pathS('M20 10 H14 Q9 10 9 15 V54 Q9 59 14 59 H50 Q55 59 55 54 V15 Q55 10 50 10 H44') + rect(21, 5, 22, 10, 4, W, INK, 3.8) + line(21, 48, 29, 24, a, 4.6) + line(31, 48, 39, 24, a, 4.6) + line(39, 48, 47, 48, '#ffffff88', 3.6) },
  { id: 'search', label: 'Search', keys: '⌘F', menu: 'Edit ▸ Search', cat: 'file', when: 'anywhere', icon: (a) => lens(27, 27, 17, a) + `<path d="M18 23 A10 10 0 0 1 26 16" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'trash', label: 'Trash', keys: '⌘⌫', menu: 'File ▸ Move to Trash', cat: 'file', when: 'selection', icon: (a) => line(9, 15, 55, 15) + pathS('M24 15 V10 Q24 7 27 7 H37 Q40 7 40 10 V15') + pathS('M14 15 L17 52 Q17.5 57 22 57 H42 Q46.5 57 47 52 L50 15') + line(27, 25, 27, 47, a, 3.6) + line(37, 25, 37, 47, a, 3.6) },

  // row 3 — tags, through the Finder Tags plugin
  tagKey('red', 'Red'), tagKey('orange', 'Orange'), tagKey('yellow', 'Yellow'), tagKey('green', 'Green'),
  tagKey('blue', 'Blue'), tagKey('purple', 'Purple'), tagKey('gray', 'Gray'),
  { id: 'clear-tags', label: 'Clear tags', keys: 'plugin', plugin: 'me.hckr.findertags.clear-tags', menu: 'Finder Tags ▸ Clear All Tags', cat: 'tag', when: 'selection', c: W, icon: () => tagShape('none', '#ffffffcc') + line(8, 56, 56, 8, '#ff453a', 5) },

  // row 4 — view
  { id: 'as-icons', label: 'Icons', keys: '⌘1', menu: 'View ▸ as Icons', cat: 'view', when: 'window', icon: (a) => rect(6, 6, 22, 22, 5) + rect(36, 6, 22, 22, 5, a, `${a}44`) + rect(6, 36, 22, 22, 5) + rect(36, 36, 22, 22, 5) },
  { id: 'as-list', label: 'List', keys: '⌘2', menu: 'View ▸ as List', cat: 'view', when: 'window', icon: (a) => [14, 32, 50].map((y, i) => dot(10, y, 4, i === 0 ? a : W) + line(22, y, 58, y, i === 0 ? a : W, 4.6)).join('') },
  { id: 'as-columns', label: 'Columns', keys: '⌘3', menu: 'View ▸ as Columns', cat: 'view', when: 'window', icon: (a) => rect(4, 8, 56, 48, 7) + line(23, 8, 23, 56) + line(42, 8, 42, 56) + `<rect x="25.5" y="18" width="14" height="7" rx="2" fill="${a}"/>` + line(8, 21, 19, 21, '#ffffff88', 3) + line(46, 21, 56, 21, '#ffffff88', 3) },
  { id: 'as-gallery', label: 'Gallery', keys: '⌘4', menu: 'View ▸ as Gallery', cat: 'view', when: 'window', icon: (a) => rect(8, 4, 48, 36, 6, a, `${a}33`) + [6, 20, 34, 48].map((x) => rect(x, 47, 10, 10, 3, W, 'none', 3.4)).join('') },
  { id: 'quick-look', label: 'Quick Look', keys: '⌘Y', menu: 'File ▸ Quick Look', cat: 'view', when: 'selection', icon: (a) => pathS('M4 32 Q18 12 32 12 Q46 12 60 32 Q46 52 32 52 Q18 52 4 32 Z') + circ(32, 32, 10, a, `${a}44`, 4.2) + dot(32, 32, 3.5, a) },
  { id: 'sidebar', label: 'Sidebar', keys: '⌃⌘S', menu: 'View ▸ Hide / Show Sidebar', cat: 'view', when: 'window', icon: (a) => `<rect x="6" y="10" width="18" height="44" fill="${a}" clip-path="url(#fr)"/>` + rect(6, 10, 52, 44, 7) + line(24, 10, 24, 54) },
  { id: 'preview', label: 'Preview pane', keys: '⇧⌘P', menu: 'View ▸ Hide / Show Preview', cat: 'view', when: 'window', icon: (a) => `<rect x="38" y="10" width="20" height="44" fill="${a}55" clip-path="url(#fr)"/>` + rect(6, 10, 52, 44, 7) + line(38, 10, 38, 54) + rect(42, 16, 12, 12, 2, a, 'none', 3) + line(12, 20, 30, 20, '#ffffff88', 3.2) + line(12, 30, 26, 30, '#ffffff88', 3.2) },
  { id: 'view-options', label: 'View options', keys: '⌘J', menu: 'View ▸ Show View Options', cat: 'view', when: 'window', icon: (a) => line(8, 18, 56, 18) + line(8, 32, 56, 32) + line(8, 46, 56, 46) + circ(40, 18, 6, a, INK, 4.4) + circ(22, 32, 6, a, INK, 4.4) + circ(46, 46, 6, a, INK, 4.4) },
];

// the corner flourish: a tag dot, as the Finder draws one beside a tagged file's name
const cornerDot = (a) => `<circle cx="125" cy="19" r="6" fill="${a}" stroke="#000" stroke-opacity="0.35" stroke-width="1.5" opacity="0.9"/>`;

function tile(k) {
  const a = k.c || C[k.cat];
  // the hero sits on the icon's own near-black; the rest are the Finder's dark window grey
  const bg = k.hero ? ['#2c2c30', '#1b1b1e', '#0f0f11'] : ['#2a2b30', '#1c1d21', '#111215'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#4cb8ff' : a}" stop-opacity="${k.hero ? 0.16 : 0.12}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="${k.hero ? 0.3 : 0.5}"/>
  </filter>
  <clipPath id="fr"><rect x="6" y="10" width="52" height="44" rx="7"/></clipPath>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${k.hero ? '' : cornerDot(a)}
<g transform="${k.hero ? HERO_GLYPH : 'translate(40 14)'}" filter="url(#lift)">${k.icon(a)}</g>
${k.hero ? '' : fitLabel(k.label, { family: SANS, weight: 700, font: FONT }).map((l) => `<text x="72" y="${l.y}" font-family="${SANS}" font-size="${l.size}" font-weight="700" fill="${W}" stroke="${W}" stroke-width="0.3" text-anchor="middle" filter="url(#lift)">${l.text}</text>`).join('\n')}
<rect x="0.75" y="0.75" width="142.5" height="142.5" rx="20" fill="none" stroke="#fff" stroke-opacity="${k.hero ? 0.22 : 0.08}" stroke-width="1.5"/>
</svg>`;
}

const pngs = [];
KEYS.forEach((k, i) => {
  const n = String(i + 1).padStart(2, '0');
  const svg = tile(k);
  fs.writeFileSync(path.join(OUT, 'svg', `${n}-${k.id}.svg`), svg);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 288 }, font: FONT }).render().asPng();
  fs.writeFileSync(path.join(OUT, 'icons', `${n}-${k.id}.png`), png);
  pngs.push(png);
});

fs.writeFileSync(path.join(OUT, 'keymap.json'), JSON.stringify(KEYS.map((k, i) => ({
  pos: { col: i % 8, row: Math.floor(i / 8) }, file: `${String(i + 1).padStart(2, '0')}-${k.id}.png`,
  id: k.id, label: k.label, keys: k.keys, ...(k.plugin ? { plugin: k.plugin } : {}), action: k.menu, when: k.when, category: k.cat,
})), null, 2));

// contact sheet: 8 x 4 grid of the real PNGs on a device-like plate
const S = 144, G = 22, P = 40;
const sheetW = P * 2 + 8 * S + 7 * G, sheetH = P * 2 + 4 * S + 3 * G;
const imgs = pngs.map((p, i) => {
  const x = P + (i % 8) * (S + G), y = P + Math.floor(i / 8) * (S + G);
  return `<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18"/></clipPath><image x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#c${i})" href="data:image/png;base64,${p.toString('base64')}"/>`;
}).join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0b0b0d"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT}`);
