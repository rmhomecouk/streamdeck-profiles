// Generates Stream Deck XL key icons for Microsoft Excel as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Office's own face, Aptos, ships inside Excel (regular and bold); bold italic comes from Word's copy when it's there.
// Falls back to SF Pro Rounded (resvg can't render SF Pro)
const DFS = ['Excel', 'Word'].map((app) => `/Applications/Microsoft ${app}.app/Contents/Resources/DFonts`);
const findFont = (f) => DFS.map((d) => path.join(d, f)).find((p) => fs.existsSync(p));
const aptos = ['Aptos.ttf', 'Aptos-Bold.ttf', 'Aptos-Bold-Italic.ttf'].map(findFont).filter(Boolean);
const SANS = aptos.length >= 2 ? 'Aptos' : '.SF NS Rounded';
const MONO = '.SF NS Mono';
const FONT = {
  fontFiles: [...aptos, '/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSMono.ttf'],
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: the greens of Excel's icon, from the lit top corner down to the pale sheet
const C = {
  book: '#c6ea7c', // yellow-lime — workbook
  edit: '#6fd47a', // green       — edit & data
  fmt: '#3ccf9e',  // emerald     — format
  sheet: '#a7d9b5', // pale sage  — sheets & view
};
// shortcut text: the same hues, lifted so they read on the dark tiles
const T = { book: '#d6f09d', edit: '#8fe097', fmt: '#6ddcb5', sheet: '#c2e6cc' };
const W = '#ffffff';
const INK = '#111a14';
const RED = '#ff6b6b';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const dot = (cx, cy, r, c) => circ(cx, cy, r, 'none', c, 0);
const plus = (cx, cy, r, c, w = sw) => line(cx - r, cy, cx + r, cy, c, w) + line(cx, cy - r, cx, cy + r, c, w);
const txt = (x, y, s, c, size, { w = 700, style = 'normal', anchor = 'middle', font = SANS } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${w}" font-style="${style}" fill="${c}" text-anchor="${anchor}">${s}</text>`;
function arrow(cx, cy, dir, len, c = W, w = sw) {
  const h = len / 2, k = 6.5;
  const v = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir];
  const tx = cx + v[0] * h, ty = cy + v[1] * h, bx = cx - v[0] * h, by = cy - v[1] * h;
  const px = -v[1], py = v[0];
  return line(bx, by, tx, ty, c, w) + poly(`${tx - v[0] * k + px * k},${ty - v[1] * k + py * k} ${tx},${ty} ${tx - v[0] * k - px * k},${ty - v[1] * k - py * k}`, c, w);
}
const lens = (cx, cy, r, c) => circ(cx, cy, r) + line(cx + r * 0.72, cy + r * 0.72, cx + r * 1.55, cy + r * 1.55, c, 6);
const floppy = (c = W, a = W) => pathS('M8 12 Q8 6 14 6 H44 L56 18 V50 Q56 56 50 56 H14 Q8 56 8 50 Z', c) + rect(18, 6, 22, 14, 2, a, `${a}44`, 3.2) + rect(17, 34, 30, 22, 3, c, 'none', 3.4);
const badge = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="${INK}"/>`;
const hook = (a) => pathS('M18 24 H40 Q56 24 56 40 Q56 56 40 56 H26', a, 'none', 5) + poly('27,13 16,24 27,35', a, 5);
// a 3 x 3 cell grid; `hi` is a list of [col,row] cells to fill with the accent
function grid(x, y, cw, ch, cols, rows, a, hi = [], c = W) {
  let s = hi.map(([i, j]) => `<rect x="${x + i * cw}" y="${y + j * ch}" width="${cw}" height="${ch}" fill="${a}" fill-opacity="0.5"/>`).join('');
  s += rect(x, y, cw * cols, ch * rows, 3, c, 'none', 3.4);
  for (let i = 1; i < cols; i++) s += line(x + i * cw, y, x + i * cw, y + ch * rows, c, 2.4);
  for (let j = 1; j < rows; j++) s += line(x, y + j * ch, x + cw * cols, y + j * ch, c, 2.4);
  return s;
}
// the active cell: a thick green outline with the fill handle at its bottom-right corner
const cell = (x, y, w, h, a, s = 4) => rect(x, y, w, h, 1.5, a, 'none', s) + `<rect x="${x + w - 4}" y="${y + h - 4}" width="8" height="8" fill="${a}" stroke="${INK}" stroke-width="1.6"/>`;
// a sheet tab hanging below the grid line, as in Excel's tab bar
const tab = (x, y, w, c, fill = 'none') => pathS(`M${x} ${y} V${y + 12} Q${x} ${y + 18} ${x + 6} ${y + 18} H${x + w - 6} Q${x + w} ${y + 18} ${x + w} ${y + 12} V${y}`, c, fill, 3.6);
const eyeOff = (cx, cy, c) => pathS(`M${cx - 12} ${cy} Q${cx} ${cy - 11} ${cx + 12} ${cy} Q${cx} ${cy + 11} ${cx - 12} ${cy} Z`, c, INK, 3) + dot(cx, cy, 3.4, c) + line(cx - 11, cy - 9, cx + 11, cy + 9, c, 3);

// Excel's icon: the light sheet with its lit corner block behind the X badge
function excelMark() {
  return `<defs>
  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6e08a"/><stop offset="1" stop-color="#6cc35d"/></linearGradient>
  <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8ea86"/><stop offset="1" stop-color="#8fdc74"/></linearGradient>
  <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f9a47"/><stop offset="1" stop-color="#2e6a31"/></linearGradient>
  <linearGradient id="xb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#37895a"/><stop offset="1" stop-color="#174d2f"/></linearGradient>
</defs>
<rect x="16" y="2" width="46" height="60" rx="8" fill="url(#g1)"/>
<path d="M16 34 Q16 22 28 22 H45 V52 Q45 62 35 62 H24 Q16 62 16 54 Z" fill="#5aa650" opacity="0.8"/>
<path d="M45 22 H62 V54 Q62 62 54 62 H24 Q35 62 38 56 Q45 52 45 40 Z" fill="url(#g3)"/>
<rect x="39" y="2" width="23" height="20" rx="6" fill="url(#g2)"/>
<rect x="0" y="23" width="32" height="32" rx="8" fill="url(#xb)" stroke="#0b2a18" stroke-opacity="0.5" stroke-width="1"/>
${txt(16, 47.5, 'X', '#f2f7f2', 25, { w: 700 })}`;
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// src = where the binding was confirmed in Excel 16.112.4: a live menu item, or a key test in a scratch workbook
const KEYS = [
  // row 1 — workbook
  { id: 'excel', label: 'Excel', keys: 'open app', src: 'launch / focus Microsoft Excel.app', cat: 'book', when: 'anywhere', hero: true, icon: () => excelMark() },
  { id: 'save', label: 'Save', keys: '⌘S', src: 'Menu: File ▸ Save', cat: 'book', when: 'workbook', icon: (a) => floppy(W, a) },
  { id: 'save-as', label: 'Save as', keys: '⇧⌘S', src: 'Menu: File ▸ Save As…', cat: 'book', when: 'workbook', icon: (a) => floppy(W, a) + badge(50, 50, 10) + pathS('M42 58 L43 52 L54 41 L59 46 L48 57 Z', a, INK, 3.4) },
  { id: 'print', label: 'Print', keys: '⌘P', src: 'Menu: File ▸ Print…', cat: 'book', when: 'workbook', icon: (a) => rect(18, 4, 28, 16, 2) + pathS('M14 46 H8 Q4 46 4 42 V26 Q4 20 10 20 H54 Q60 20 60 26 V42 Q60 46 56 46 H50') + rect(18, 36, 28, 22, 2, a, INK) + dot(50, 28, 3, a) },
  { id: 'undo', label: 'Undo', keys: '⌘Z', src: 'Menu: Edit ▸ Undo', cat: 'book', when: 'workbook', icon: (a) => hook(a) },
  { id: 'find', label: 'Find', keys: '⌃F', src: 'Menu: Edit ▸ Find ▸ Find…', cat: 'book', when: 'workbook', icon: (a) => lens(27, 27, 17, a) + `<path d="M18 23 A10 10 0 0 1 26 16" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'replace', label: 'Replace', keys: '⌃H', src: 'Menu: Edit ▸ Find ▸ Replace…', cat: 'book', when: 'workbook', icon: (a) => txt(16, 28, 'a', W, 26) + txt(48, 58, 'b', a, 26) + pathS('M30 14 H44 Q52 14 52 22 V30', a, 'none', 3.6) + poly('46,25 52,31 58,25', a, 3.6) + pathS('M34 50 H20 Q12 50 12 42 V36', W, 'none', 3.6) + poly('6,40 12,34 18,40', W, 3.6) },
  { id: 'go-to', label: 'Go to', keys: '⌃G', src: 'Menu: Edit ▸ Find ▸ Go To…', cat: 'book', when: 'workbook', icon: (a) => grid(22, 6, 14, 12, 3, 4, a, [], '#ffffffaa') + cell(36, 30, 14, 12, a) + arrow(15, 36, 'r', 22, a, 4.4) },

  // row 2 — edit & data
  { id: 'fill-down', label: 'Fill down', keys: '⌘D', src: 'Key test: A1 = 5, A1:A3 selected → A3 = 5', cat: 'edit', when: 'cells', icon: (a) => grid(8, 4, 26, 18, 1, 3, a, [[0, 0]]) + txt(21, 18, '5', W, 14) + arrow(50, 32, 'd', 44, a, 5) },
  { id: 'fill-right', label: 'Fill right', keys: '⌘R', src: 'Key test: A1 = 5, A1:C1 selected → C1 = 5', cat: 'edit', when: 'cells', icon: (a) => grid(4, 8, 19, 22, 3, 1, a, [[0, 0]]) + txt(13.5, 24, '5', W, 14) + arrow(32, 48, 'r', 48, a, 5) },
  { id: 'autosum', label: 'AutoSum', keys: '⇧⌘T', src: 'Key test: A1 = 1, A2 = 2, A3 selected → =SUM(A1:A2)', cat: 'edit', when: 'cells', icon: (a) => poly('50,10 12,10 32,32 12,54 50,54', a, 5.2) },
  { id: 'today', label: 'Today', keys: '⌃;', src: 'Key test: A1 → today\'s date', cat: 'edit', when: 'cells', icon: (a) => rect(6, 10, 52, 48, 8) + `<rect x="8" y="12" width="48" height="12" rx="6" fill="${a}" fill-opacity="0.5"/>` + line(20, 4, 20, 16) + line(44, 4, 44, 16) + txt(32, 51, '12', W, 22) },
  { id: 'insert', label: 'Insert', keys: '⌃⇧=', src: 'Key test: row 1 selected → a row is inserted above', cat: 'edit', when: 'cells', icon: (a) => grid(4, 20, 20, 14, 2, 3, a, [], '#ffffffaa') + badge(48, 16, 12) + circ(48, 16, 12, a, `${a}44`, 3.4) + plus(48, 16, 6.5, a, 4) },
  { id: 'delete', label: 'Delete', keys: '⌘-', src: 'Key test: row 1 selected → row 1 is deleted', cat: 'edit', when: 'cells', icon: (a) => grid(4, 20, 20, 14, 2, 3, a, [], '#ffffffaa') + badge(48, 16, 12) + circ(48, 16, 12, RED, `${RED}33`, 3.4) + line(41.5, 16, 54.5, 16, RED, 4) },
  { id: 'filter', label: 'Filter', keys: '⇧⌘F', src: 'Key test: header + data, A1 selected → AutoFilter on', cat: 'edit', when: 'cells', icon: (a) => pathS('M6 8 H58 L38 32 V52 L26 58 V32 Z', a, `${a}33`) },
  { id: 'sort', label: 'Sort', keys: '⇧⌘R', src: 'Menu: Data ▸ Sort…', cat: 'edit', when: 'cells', icon: (a) => txt(14, 26, 'A', W, 22) + txt(14, 58, 'Z', W, 22) + arrow(46, 32, 'd', 48, a, 5) },

  // row 3 — format
  { id: 'format-cells', label: 'Format cells', keys: '⌘1', src: 'Menu: Format ▸ Cells…', cat: 'fmt', when: 'cells', icon: (a) => grid(4, 6, 18, 14, 3, 3, a, [], '#ffffff66') + cell(22, 20, 18, 14, a) + txt(50, 62, '1', a, 22) },
  { id: 'bold', label: 'Bold', keys: '⌘B', src: 'Key test: A1 selected → bold', cat: 'fmt', when: 'cells', icon: (a) => txt(32, 52, 'B', a, 58) },
  { id: 'italic', label: 'Italic', keys: '⌘I', src: 'Key test: A1 selected → italic', cat: 'fmt', when: 'cells', icon: (a) => txt(32, 52, 'I', a, 58, { style: 'italic' }) },
  { id: 'currency', label: 'Currency', keys: '⌃⇧$', src: 'Key test: 5 → $#,##0.00_);[Red]($#,##0.00)', cat: 'fmt', when: 'cells', icon: (a) => txt(32, 53, '$', a, 56) },
  { id: 'percent', label: 'Percent', keys: '⌃⇧%', src: 'Key test: 5 → 0%', cat: 'fmt', when: 'cells', icon: (a) => txt(32, 52, '%', a, 52) },
  { id: 'number', label: 'Number', keys: '⌃⇧!', src: 'Key test: 5 → #,##0.00', cat: 'fmt', when: 'cells', icon: (a) => txt(32, 44, '0.00', a, 27) + line(8, 54, 56, 54, '#ffffff66', 3) },
  { id: 'border', label: 'Border', keys: '⌥⌘0', src: 'Key test: A1 selected → continuous outline border', cat: 'fmt', when: 'cells', icon: (a) => rect(6, 6, 52, 52, 2, a, 'none', 5) + line(32, 12, 32, 52, '#ffffff66', 2.4).replace('/>', ' stroke-dasharray="3 5"/>') + line(12, 32, 52, 32, '#ffffff66', 2.4).replace('/>', ' stroke-dasharray="3 5"/>') },
  { id: 'center', label: 'Center', keys: '⌘E', src: 'Key test: A1 selected → centre alignment', cat: 'fmt', when: 'cells', icon: (a) => line(6, 10, 58, 10) + line(16, 24, 48, 24, a) + line(6, 38, 58, 38) + line(20, 52, 44, 52, a) },

  // row 4 — sheets & view
  { id: 'prev-sheet', label: 'Prev sheet', keys: '⌥←', src: 'Key test: Sheet2 → Sheet1', cat: 'sheet', when: 'workbook', icon: (a) => grid(6, 2, 13, 9, 4, 2, a, [], '#ffffff88') + line(2, 22, 62, 22, '#ffffff88', 3) + tab(6, 22, 24, a, `${a}55`) + tab(34, 22, 24, W) + arrow(32, 54, 'l', 40, a, 5) },
  { id: 'next-sheet', label: 'Next sheet', keys: '⌥→', src: 'Key test: Sheet1 → Sheet2', cat: 'sheet', when: 'workbook', icon: (a) => grid(6, 2, 13, 9, 4, 2, a, [], '#ffffff88') + line(2, 22, 62, 22, '#ffffff88', 3) + tab(6, 22, 24, W) + tab(34, 22, 24, a, `${a}55`) + arrow(32, 54, 'r', 40, a, 5) },
  { id: 'new-sheet', label: 'New sheet', keys: '⇧F11', src: 'Menu: Insert ▸ Sheet ▸ Insert Sheet', cat: 'sheet', when: 'workbook', icon: (a) => grid(6, 2, 13, 9, 4, 2, a, [], '#ffffff88') + line(2, 22, 62, 22, '#ffffff88', 3) + tab(6, 22, 24, W) + badge(46, 48, 11) + circ(46, 48, 11, a, `${a}44`, 3.4) + plus(46, 48, 6, a, 4) },
  { id: 'hide-row', label: 'Hide row', keys: '⌃9', src: 'Key test: A1 selected → row height 0', cat: 'sheet', when: 'cells', icon: (a) => line(4, 10, 60, 10, '#ffffff77', 3) + `<rect x="4" y="24" width="56" height="12" fill="${a}" fill-opacity="0.45"/>` + line(4, 50, 60, 50, '#ffffff77', 3) + eyeOff(32, 30, W) },
  { id: 'hide-column', label: 'Hide column', keys: '⌃0', src: 'Key test: A1 selected → column width 0', cat: 'sheet', when: 'cells', icon: (a) => line(10, 4, 10, 60, '#ffffff77', 3) + `<rect x="24" y="4" width="16" height="56" fill="${a}" fill-opacity="0.45"/>` + line(54, 4, 54, 60, '#ffffff77', 3) + eyeOff(32, 32, W) },
  { id: 'show-formulas', label: 'Show formulas', keys: '⌃`', src: 'Key test: display formulas → true', cat: 'sheet', when: 'workbook', icon: (a) => txt(30, 46, 'fx', a, 42, { style: 'italic' }) },
  { id: 'time', label: 'Current time', keys: '⌘;', src: 'Key test: A1 → current time', cat: 'sheet', when: 'cells', icon: (a) => circ(32, 32, 25) + poly('32,16 32,32 44,40', a, 4.6) },
  { id: 'paste-special', label: 'Paste special', keys: '⌃⌘V', src: 'Menu: Edit ▸ Paste Special…', cat: 'sheet', when: 'cells', icon: (a) => rect(10, 10, 40, 50, 6) + rect(20, 4, 20, 12, 4, W, INK, 3.4) + pathS('M42 30 L45 38 L53 39 L47 44 L49 52 L42 48 L35 52 L37 44 L31 39 L39 38 Z', a, `${a}55`, 3) },
];

function tile(k) {
  const a = k.c || C[k.cat];
  const bg = k.hero ? ['#1f2e24', '#141e17', '#0a0f0b'] : ['#1b261f', '#131b16', '#0b100d'];
  const labelSize = k.label.length > 11 ? 16 : 18;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#8fdc74' : a}" stop-opacity="${k.hero ? 0.16 : 0.13}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${k.hero ? '' : `<g opacity="0.6"><rect x="11" y="12" width="15" height="11" fill="none" stroke="${a}" stroke-width="1.8"/><rect x="23.5" y="20.5" width="5" height="5" fill="${a}"/></g>`}
<g transform="translate(40 14)" filter="url(#lift)">${k.icon(a)}</g>
<text x="72" y="106" font-family="${SANS}" font-size="${labelSize}" font-weight="700" fill="${W}" stroke="${W}" stroke-width="0.25" text-anchor="middle" filter="url(#lift)">${k.label}</text>
<text x="72" y="127" font-family="${MONO}" font-size="15" fill="${k.hero ? '#d6f09d' : T[k.cat]}" stroke="${k.hero ? '#d6f09d' : T[k.cat]}" stroke-width="0.45" text-anchor="middle">${k.keys}</text>
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
  id: k.id, label: k.label, keys: k.keys, action: k.src, when: k.when, category: k.cat,
})), null, 2));

// contact sheet: 8 x 4 grid of the real PNGs on a device-like plate
const S = 144, G = 22, P = 40;
const sheetW = P * 2 + 8 * S + 7 * G, sheetH = P * 2 + 4 * S + 3 * G;
const imgs = pngs.map((p, i) => {
  const x = P + (i % 8) * (S + G), y = P + Math.floor(i / 8) * (S + G);
  return `<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18"/></clipPath><image x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#c${i})" href="data:image/png;base64,${p.toString('base64')}"/>`;
}).join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#090d0a"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT} (labels in ${SANS})`);
