// Generates Stream Deck XL key icons for Microsoft PowerPoint as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitLabel, HERO_GLYPH } from '../../tools/tile.mjs';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Office's own face, Aptos, ships inside PowerPoint; fall back to SF Pro Rounded (resvg can't render SF Pro)
const DF = '/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts';
const aptos = ['Aptos.ttf', 'Aptos-Bold.ttf'].map((f) => path.join(DF, f)).filter((f) => fs.existsSync(f));
const SANS = aptos.length === 2 ? 'Aptos' : '.SF NS Rounded';
const FONT = {
  fontFiles: [...aptos, '/System/Library/Fonts/SFNSRounded.ttf'],
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: the sweep of PowerPoint's icon, from its orange edge round to the magenta
const C = {
  show: '#ffa53d',  // orange  — present
  slide: '#ff7358', // coral   — slides
  arr: '#ff5c95',   // pink    — arrange
  edit: '#d47cff',  // orchid  — edit & view
};
const W = '#ffffff';
const INK = '#1c1216';

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
const txt = (x, y, s, c, size, w = 700) => `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${size}" font-weight="${w}" fill="${c}" text-anchor="middle">${s}</text>`;
function arrow(cx, cy, dir, len, c = W, w = sw) {
  const h = len / 2, k = 6;
  const v = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir];
  const tx = cx + v[0] * h, ty = cy + v[1] * h, bx = cx - v[0] * h, by = cy - v[1] * h;
  const px = -v[1], py = v[0];
  return line(bx, by, tx, ty, c, w) + poly(`${tx - v[0] * k + px * k},${ty - v[1] * k + py * k} ${tx},${ty} ${tx - v[0] * k - px * k},${ty - v[1] * k - py * k}`, c, w);
}
// a 16:9 slide
const slide = (x, y, w, c = W, fill = 'none', s = sw) => rect(x, y, w, w * 0.5625, Math.max(2, w * 0.07), c, fill, s);
const play = (cx, cy, s, c) => `<path d="M${cx - s * 0.45} ${cy - s * 0.6} L${cx + s * 0.6} ${cy} L${cx - s * 0.45} ${cy + s * 0.6} Z" fill="${c}" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>`;
const lens = (cx, cy, r, c) => circ(cx, cy, r) + line(cx + r * 0.72, cy + r * 0.72, cx + r * 1.55, cy + r * 1.55, c, 6);
const floppy = (c = W, a = W) => pathS('M8 12 Q8 6 14 6 H44 L56 18 V50 Q56 56 50 56 H14 Q8 56 8 50 Z', c) + rect(18, 6, 22, 14, 2, a, `${a}44`, 3.2) + rect(17, 34, 30, 22, 3, c, 'none', 3.4);
const hook = (a, flip) => `<g ${flip ? 'transform="translate(64 0) scale(-1 1)"' : ''}>${pathS('M18 24 H40 Q56 24 56 40 Q56 56 40 56 H26', a, 'none', 5)}${poly('27,13 16,24 27,35', a, 5)}</g>`;
// stacking order: one shape in front of another
const stack = (a, frontIsAccent) => frontIsAccent
  ? rect(6, 6, 32, 32, 6) + rect(24, 24, 32, 32, 6, a, `${a}`, 3)
  : rect(24, 24, 32, 32, 6, a, `${a}`, 3) + rect(6, 6, 32, 32, 6, W, INK);

// PowerPoint's icon: an orange-to-magenta disc folded over itself, with the red P badge in front
function pptMark() {
  return `<defs>
  <linearGradient id="disc" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa53d"/><stop offset="0.5" stop-color="#ff5f7e"/><stop offset="1" stop-color="#e83f9a"/></linearGradient>
  <linearGradient id="fold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8284f"/><stop offset="1" stop-color="#ff6a6a"/></linearGradient>
  <linearGradient id="pb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e63a4c"/><stop offset="1" stop-color="#a8142c"/></linearGradient>
</defs>
<circle cx="36" cy="29" r="27" fill="url(#disc)"/>
<path d="M28 3.4 Q36 2 40 10 L40 26 Q41 32 47 33 L62 34 Q60 44 52 50 Q44 42 36 42 L22 42 Q18 42 16 38 L16 10 Q20 4 28 3.4 Z" fill="url(#fold)" opacity="0.85"/>
<rect x="1" y="30" width="31" height="31" rx="7" fill="url(#pb)" stroke="#6d0a1b" stroke-opacity="0.45" stroke-width="1"/>
${txt(16.5, 54, 'P', '#fff5f6', 25)}`;
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// menu = the PowerPoint 16.112 menu item that carries the shortcut, read from the running app's live menu bar
const KEYS = [
  // row 1 — present
  { id: 'powerpoint', label: 'PowerPoint', keys: 'main', menu: 'Switch Profile → Main', cat: 'show', when: 'deck', hero: true, icon: () => pptMark() },
  { id: 'play-start', label: 'Play from start', keys: '⇧⌘↩', menu: 'Slide Show ▸ Play from Start', cat: 'show', when: 'deck', icon: (a) => slide(10, 12, 50) + line(4, 14, 4, 40, a, 5) + play(37, 26, 18, a) },
  { id: 'play-current', label: 'From current', keys: '⌘↩', menu: 'Slide Show ▸ Play from Current Slide', cat: 'show', when: 'deck', icon: (a) => slide(4, 12, 56) + play(33, 28, 20, a) },
  { id: 'presenter', label: 'Presenter view', keys: '⌥↩', menu: 'Slide Show ▸ Presenter View', cat: 'show', when: 'deck', icon: (a) => rect(3, 6, 58, 40, 5) + line(24, 46, 22, 56) + line(40, 46, 42, 56) + line(16, 57, 48, 57) + slide(9, 12, 26, a, `${a}44`, 3) + line(40, 15, 55, 15, W, 3) + line(40, 23, 55, 23, '#ffffff88', 3) + line(40, 31, 52, 31, '#ffffff88', 3) + line(9, 36, 35, 36, '#ffffff88', 3) },
  { id: 'normal', label: 'Normal', keys: '⌘1', menu: 'View ▸ Normal', cat: 'show', when: 'deck', icon: (a) => rect(3, 8, 58, 48, 6) + line(18, 8, 18, 56) + rect(7, 14, 7, 5, 1, 'none', a, 0) + rect(7, 23, 7, 5, 1, 'none', '#ffffff77', 0) + rect(7, 32, 7, 5, 1, 'none', '#ffffff77', 0) + slide(24, 18, 32, a, `${a}33`, 3.2) },
  { id: 'sorter', label: 'Slide sorter', keys: '⌘2', menu: 'View ▸ Slide Sorter', cat: 'show', when: 'deck', icon: (a) => [[4, 10], [34, 10], [4, 36], [34, 36]].map(([x, y], i) => slide(x, y, 26, i === 1 ? a : W, i === 1 ? `${a}44` : 'none', 3.6)).join('') },
  { id: 'notes', label: 'Notes page', keys: '⌘3', menu: 'View ▸ Notes Page', cat: 'show', when: 'deck', icon: (a) => rect(10, 2, 44, 60, 5) + slide(16, 8, 32, a, `${a}44`, 3) + line(17, 38, 47, 38, W, 3) + line(17, 46, 47, 46, '#ffffff88', 3) + line(17, 54, 38, 54, '#ffffff88', 3) },
  { id: 'reading', label: 'Reading view', keys: '⌘5', menu: 'View ▸ Reading View', cat: 'show', when: 'deck', icon: (a) => slide(4, 6, 56) + pathS('M14 50 Q32 36 50 50 Q32 64 14 50 Z', a, 'none', 3.6) + dot(32, 50, 4.5, a) },

  // row 2 — slides
  { id: 'new-slide', label: 'New slide', keys: '⇧⌘N', menu: 'Insert ▸ New Slide', cat: 'slide', when: 'deck', icon: (a) => slide(4, 14, 50) + badge(52, 44, 10) + plus(52, 44, 9, a, 4.8) },
  { id: 'duplicate-slide', label: 'Duplicate slide', keys: '⇧⌘D', menu: 'Insert ▸ Duplicate Slide', cat: 'slide', when: 'deck', icon: (a) => slide(14, 8, 46, a, 'none', 3.6) + slide(4, 26, 46, W, INK) },
  { id: 'comment', label: 'Comment', keys: '⇧⌘M', menu: 'Insert ▸ Comment', cat: 'slide', when: 'deck', icon: (a) => pathS('M12 6 H52 Q58 6 58 12 V40 Q58 46 52 46 H26 L14 57 V46 H12 Q6 46 6 40 V12 Q6 6 12 6 Z', a, `${a}33`) + line(18, 20, 46, 20, W, 3.4) + line(18, 32, 38, 32, W, 3.4) },
  { id: 'link', label: 'Link', keys: '⌘K', menu: 'Insert ▸ Hyperlink…', cat: 'slide', when: 'select', icon: (a) => `<g transform="rotate(-45 32 32)">${rect(4, 22, 32, 20, 10)}${rect(28, 22, 32, 20, 10, a)}</g>` },
  // the slide master: one slide feeding the layouts under it
  { id: 'slide-master', label: 'Slide master', keys: '⌥⌘1', menu: 'View ▸ Master ▸ Slide Master', cat: 'slide', when: 'deck', icon: (a) => slide(12, 2, 40, a, `${a}44`, 3.6) + pathS('M32 25 V34 M14 34 H50 M14 34 V39 M50 34 V39', W, 'none', 3) + slide(2, 41, 24, W, 'none', 3.2) + slide(38, 41, 24, W, 'none', 3.2) },
  { id: 'background', label: 'Background', keys: '⇧⌘2', menu: 'Format ▸ Slide Background…', cat: 'slide', when: 'deck', icon: (a) => `<defs><linearGradient id="bgf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${a}" stop-opacity="0.15"/></linearGradient></defs>` + slide(4, 14, 56, W, 'url(#bgf)') + rect(18, 24, 28, 7, 2, 'none', W, 0) + line(18, 38, 40, 38, '#ffffffcc', 3) },
  { id: 'find', label: 'Find', keys: '⌘F', menu: 'Edit ▸ Find ▸ Find…', cat: 'slide', when: 'deck', icon: (a) => lens(27, 27, 17, a) + `<path d="M18 23 A10 10 0 0 1 26 16" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'replace', label: 'Replace', keys: '⌃H', menu: 'Edit ▸ Find ▸ Replace…', cat: 'slide', when: 'deck', icon: (a) => txt(18, 28, 'a', W, 26) + txt(46, 56, 'b', a, 26) + pathS('M30 12 H44 Q50 12 50 18 V26', a, 'none', 3.8) + poly('45,22 50,27 55,22', a, 3.8) + pathS('M34 52 H20 Q14 52 14 46 V38', W, 'none', 3.8) + poly('9,42 14,37 19,42', W, 3.8) },

  // row 3 — arrange
  { id: 'bring-front', label: 'Bring to front', keys: '⇧⌘F', menu: 'Arrange ▸ Bring to Front', cat: 'arr', when: 'select', icon: (a) => stack(a, true) },
  { id: 'send-back', label: 'Send to back', keys: '⇧⌘B', menu: 'Arrange ▸ Send to Back', cat: 'arr', when: 'select', icon: (a) => stack(a, false) },
  { id: 'bring-forward', label: 'Bring forward', keys: '⌥⇧⌘F', menu: 'Arrange ▸ Bring Forward', cat: 'arr', when: 'select', icon: (a) => rect(4, 20, 28, 28, 6) + rect(20, 30, 28, 28, 6, a, a, 3) + arrow(52, 22, 'u', 26, a, 4.4) },
  { id: 'send-backward', label: 'Send backward', keys: '⌥⇧⌘B', menu: 'Arrange ▸ Send Backward', cat: 'arr', when: 'select', icon: (a) => rect(20, 30, 28, 28, 6, a, a, 3) + rect(4, 20, 28, 28, 6, W, INK) + arrow(52, 26, 'd', 26, a, 4.4) },
  { id: 'group', label: 'Group', keys: '⌥⌘G', menu: 'Arrange ▸ Group', cat: 'arr', when: 'select', icon: (a) => rect(4, 4, 56, 56, 4, a, 'none', 3).replace('/>', ' stroke-dasharray="6 5"/>') + circ(22, 24, 10) + rect(30, 30, 22, 22, 4, W, `${a}55`) },
  { id: 'ungroup', label: 'Ungroup', keys: '⌥⇧⌘G', menu: 'Arrange ▸ Ungroup', cat: 'arr', when: 'select', icon: (a) => rect(3, 5, 34, 34, 4, a, 'none', 2.8).replace('/>', ' stroke-dasharray="5 4"/>') + rect(29, 27, 32, 32, 4, a, 'none', 2.8).replace('/>', ' stroke-dasharray="5 4"/>') + circ(20, 22, 10) + rect(35, 33, 20, 20, 4, W, `${a}55`) },
  { id: 'duplicate', label: 'Duplicate', keys: '⌘D', menu: 'Edit ▸ Duplicate', cat: 'arr', when: 'select', icon: (a) => circ(24, 24, 18, W, 'none') + circ(40, 40, 18, a, `${a}55`) },
  { id: 'selection-pane', label: 'Selection pane', keys: '⌥⌘U', menu: 'Arrange ▸ Selection Pane…', cat: 'arr', when: 'deck', icon: (a) => rect(4, 4, 56, 56, 7) + [16, 30, 44].map((y, i) => rect(11, y - 4, 8, 8, 2, 'none', i === 0 ? a : '#ffffff99', 0) + line(24, y, 40, y, i === 0 ? a : W, 3.4) + pathS(`M44 ${y} Q48.5 ${y - 4.5} 53 ${y} Q48.5 ${y + 4.5} 44 ${y} Z`, '#ffffffaa', 'none', 2.2)).join('') },

  // row 4 — edit & view
  { id: 'save', label: 'Save', keys: '⌘S', menu: 'File ▸ Save', cat: 'edit', when: 'deck', icon: (a) => floppy(W, a) },
  { id: 'undo', label: 'Undo', keys: '⌘Z', menu: 'Edit ▸ Undo', cat: 'edit', when: 'deck', icon: (a) => hook(a, false) },
  { id: 'redo', label: 'Redo', keys: '⌘Y', menu: 'Edit ▸ Redo (Repeat)', cat: 'edit', when: 'deck', icon: (a) => hook(a, true) },
  { id: 'format-pane', label: 'Format pane', keys: '⇧⌘1', menu: 'Format ▸ Format Object…', cat: 'edit', when: 'select', icon: (a) => rect(4, 6, 56, 52, 7) + line(36, 6, 36, 58) + circ(19, 32, 9, W, `${a}55`, 3.4) + [18, 32, 46].map((y, i) => line(42, y, 54, y, '#ffffff66', 3.2) + dot([50, 45, 52][i], y, 3.6, a)).join('') },
  { id: 'guides', label: 'Guides', keys: '⌃⌥⌘G', menu: 'View ▸ Grid and Guides ▸ Guides', cat: 'edit', when: 'deck', icon: (a) => slide(4, 14, 56) + line(32, 4, 32, 60, a, 3).replace('/>', ' stroke-dasharray="5 4"/>') + line(0, 30, 64, 30, a, 3).replace('/>', ' stroke-dasharray="5 4"/>') },
  { id: 'gridlines', label: 'Gridlines', keys: '⌘\'', menu: 'View ▸ Grid and Guides ▸ Gridlines', cat: 'edit', when: 'deck', icon: (a) => slide(4, 14, 56) + [18, 32, 46].map((x) => line(x, 16, x, 43, a, 2.2)).join('') + [23, 34].map((y) => line(6, y, 58, y, a, 2.2)).join('') },
  { id: 'fit-window', label: 'Fit to window', keys: '⌥⌘O', menu: 'View ▸ Zoom ▸ Fit to Window', cat: 'edit', when: 'deck', icon: (a) => poly('4,16 4,6 14,6', a, 4.6) + poly('50,6 60,6 60,16', a, 4.6) + poly('60,48 60,58 50,58', a, 4.6) + poly('14,58 4,58 4,48', a, 4.6) + slide(13, 19, 38, W, 'none', 3.8) },
  { id: 'ribbon', label: 'Ribbon', keys: '⌥⌘R', menu: 'View ▸ Ribbon', cat: 'edit', when: 'deck', icon: (a) => rect(4, 6, 56, 52, 7) + `<rect x="6" y="8" width="52" height="15" fill="${a}" opacity="0.75"/>` + line(4, 23, 60, 23) + [12, 22, 32].map((x) => line(x, 15, x + 6, 15, W, 3)).join('') },
];

// the corner flourish: a little slide thumbnail in the row's colour, like the thumbnails in PowerPoint's slide pane
const thumb = (a) => `<g opacity="0.7"><rect x="10" y="12" width="17" height="10.5" rx="2" fill="none" stroke="${a}" stroke-width="1.6"/><rect x="13" y="15" width="8" height="2.2" rx="1" fill="${a}"/></g>`;

function tile(k) {
  const a = k.c || C[k.cat];
  // warm charcoal, leaning to the icon's plum; the hero's glow is the disc's coral
  const bg = k.hero ? ['#352027', '#22151b', '#140c10'] : ['#2b1f24', '#1d1519', '#120d10'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#ff7358' : a}" stop-opacity="${k.hero ? 0.22 : 0.13}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${k.hero ? '' : thumb(C[k.cat])}
<g transform="${k.hero ? HERO_GLYPH : 'translate(40 14)'}" filter="url(#lift)">${k.icon(a)}</g>
${k.hero ? '' : fitLabel(k.label, { family: SANS, weight: 700, font: FONT }).map((l) => `<text x="72" y="${l.y}" font-family="${SANS}" font-size="${l.size}" font-weight="700" fill="${W}" stroke="${W}" stroke-width="0.25" text-anchor="middle" filter="url(#lift)">${l.text}</text>`).join('\n')}
<rect x="0.75" y="0.75" width="142.5" height="142.5" rx="20" fill="none" stroke="#fff" stroke-opacity="${k.hero ? 0.2 : 0.08}" stroke-width="1.5"/>
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
  id: k.id, label: k.label, keys: k.keys, action: k.menu, when: k.when, category: k.cat,
})), null, 2));

// contact sheet: 8 x 4 grid of the real PNGs on a device-like plate
const S = 144, G = 22, P = 40;
const sheetW = P * 2 + 8 * S + 7 * G, sheetH = P * 2 + 4 * S + 3 * G;
const imgs = pngs.map((p, i) => {
  const x = P + (i % 8) * (S + G), y = P + Math.floor(i / 8) * (S + G);
  return `<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18"/></clipPath><image x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#c${i})" href="data:image/png;base64,${p.toString('base64')}"/>`;
}).join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0f0a0c"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT} (labels in ${SANS})`);
