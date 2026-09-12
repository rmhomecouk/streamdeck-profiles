// Generates Stream Deck XL key icons for Safari as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Family names as stored in the fonts' name tables (not the marketing names).
// resvg can't render SF Pro's SFNS.ttf at all, so labels use SF Pro Rounded, which it can.
const SANS = '.SF NS Rounded'; // SF Pro Rounded
const MONO = '.SF NS Mono';    // SF Mono
const FONT = {
  fontFiles: ['/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSMono.ttf'].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Accents from Safari's icon (tick cyan, needle red) and Apple's system colours
const C = {
  tabs: '#6fe7ff',  // cyan   — tabs & windows
  nav: '#5fe08a',   // green  — navigate
  view: '#ffc94d',  // amber  — find & view
  marks: '#ff5b4f', // red    — bookmarks & sidebar
};
const W = '#ffffff';
const INK = '#0d121b';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const plus = (cx, cy, r, c, w = sw) => line(cx - r, cy, cx + r, cy, c, w) + line(cx, cy - r, cx, cy + r, c, w);
const frame = () => rect(6, 10, 52, 44, 7);
function arrow(cx, cy, dir, len, c = W, w = sw) {
  const h = len / 2, k = 5.5;
  const v = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir];
  const tx = cx + v[0] * h, ty = cy + v[1] * h, bx = cx - v[0] * h, by = cy - v[1] * h;
  const px = -v[1], py = v[0];
  return line(bx, by, tx, ty, c, w) + poly(`${tx - v[0] * k + px * k},${ty - v[1] * k + py * k} ${tx},${ty} ${tx - v[0] * k - px * k},${ty - v[1] * k - py * k}`, c, w);
}
const arcArrow = (cx, cy, r, a0, a1, c, w = sw) => {
  const p = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const t = (a1 + 90) * Math.PI / 180, n = a1 * Math.PI / 180, k = 6;
  const hx = x1 - Math.cos(t) * k, hy = y1 - Math.sin(t) * k;
  return pathS(`M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`, c, 'none', w) +
    poly(`${(hx + Math.cos(n) * k).toFixed(2)},${(hy + Math.sin(n) * k).toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)} ${(hx - Math.cos(n) * k).toFixed(2)},${(hy - Math.sin(n) * k).toFixed(2)}`, c, w);
};
const tabBar = (hl, c) => {
  const t1 = 'M6 24 V16 Q6 12 10 12 H26 Q30 12 30 16 V24';
  const t2 = 'M34 24 V16 Q34 12 38 12 H54 Q58 12 58 16 V24';
  const fill = (d) => pathS(d + ' Z', 'none', c, 0);
  return (hl === 1 ? fill(t1) : hl === 2 ? fill(t2) : '') + pathS(t1) + (hl === 0 ? '' : pathS(t2)) + rect(6, 24, 52, 30, 5);
};
const lens = (inner, c) => circ(27, 27, 16) + line(39, 39, 53, 53, c, 6.5) + inner;
const star = (cx, cy, ro, ri) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
};
// Safari's compass: blue dial, cyan ticks, red/white needle pointing north-east
function compass() {
  let t = '';
  for (let i = 0; i < 36; i++) {
    const a = (i * 10 * Math.PI) / 180, r1 = i % 3 ? 22.5 : 20.5, r2 = 25.5;
    t += line((32 + Math.cos(a) * r1).toFixed(2), (32 + Math.sin(a) * r1).toFixed(2), (32 + Math.cos(a) * r2).toFixed(2), (32 + Math.sin(a) * r2).toFixed(2), '#a6f7ff', 1.5);
  }
  return `<circle cx="32" cy="32" r="29" fill="url(#dial)"/>` + t +
    `<g transform="rotate(45 32 32)"><polygon points="32,7 36.5,32 27.5,32" fill="#ff3b30"/><polygon points="27.5,32 36.5,32 32,57" fill="#ffffff"/></g>` +
    `<circle cx="32" cy="32" r="3.4" fill="#ff8a80"/>`;
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// menu = where the shortcut lives in Safari 27's menu bar (read from MainMenu.nib)
const KEYS = [
  // row 1 — tabs & windows
  { id: 'safari', label: 'Safari', keys: 'main', menu: 'Switch Profile → Main', cat: 'tabs', hero: true, icon: () => compass() },
  { id: 'new-tab', label: 'New tab', keys: '⌘T', menu: 'File ▸ New Tab', cat: 'tabs', icon: (a) => tabBar(0, a) + plus(46, 16, 5.5, a) + line(34, 24, 58, 24) },
  { id: 'new-window', label: 'New window', keys: '⌘N', menu: 'File ▸ New Window', cat: 'tabs', icon: (a) => frame() + line(6, 21, 58, 21) + plus(32, 38, 8, a) },
  { id: 'private', label: 'Private', keys: '⇧⌘N', menu: 'File ▸ New Private Window', cat: 'tabs', icon: (a) => rect(6, 10, 52, 44, 7, W, 'rgba(0,0,0,0.45)') + line(6, 21, 58, 21) + pathS('M17 38 Q32 25 47 38 Q32 51 17 38 Z', a, 'none', 3.4) + circ(32, 38, 4, 'none', a, 0) + line(21, 48, 43, 28, W, 3.4) },
  { id: 'prev-tab', label: 'Prev tab', keys: '⌃⇧⇥', menu: 'Window ▸ Show Previous Tab', cat: 'tabs', icon: (a) => tabBar(1, a) + poly('36,32 29,39 36,46', a) },
  { id: 'next-tab', label: 'Next tab', keys: '⌃⇥', menu: 'Window ▸ Show Next Tab', cat: 'tabs', icon: (a) => tabBar(2, a) + poly('28,32 35,39 28,46', a) },
  { id: 'close-tab', label: 'Close tab', keys: '⌘W', menu: 'File ▸ Close Tab', cat: 'tabs', icon: (a) => tabBar(1, a) + line(26, 33, 38, 45, a) + line(38, 33, 26, 45, a) },
  { id: 'tab-overview', label: 'Overview', keys: '⇧⌘\\', menu: 'View ▸ Show Tab Overview', cat: 'tabs', icon: (a) => rect(7, 7, 22, 22, 5) + rect(35, 7, 22, 22, 5, 'none', a, 0) + rect(7, 35, 22, 22, 5) + rect(35, 35, 22, 22, 5) },

  // row 2 — navigate
  { id: 'back', label: 'Back', keys: '⌘[', menu: 'History ▸ Back', cat: 'nav', icon: (a) => poly('39,11 18,32 39,53', a, 6.5) },
  { id: 'forward', label: 'Forward', keys: '⌘]', menu: 'History ▸ Forward', cat: 'nav', icon: (a) => poly('25,11 46,32 25,53', a, 6.5) },
  { id: 'reload', label: 'Reload', keys: '⌘R', menu: 'View ▸ Reload Page', cat: 'nav', icon: (a) => arcArrow(32, 32, 21, -60, 235, a, 5) },
  { id: 'stop', label: 'Stop', keys: '⌘.', menu: 'View ▸ Stop', cat: 'nav', icon: (a) => circ(32, 32, 24) + line(24, 24, 40, 40, a) + line(40, 24, 24, 40, a) },
  { id: 'address', label: 'Address', keys: '⌘L', menu: 'File ▸ Open Location…', cat: 'nav', icon: (a) => rect(3, 19, 58, 26, 13) + circ(16, 31, 5.5, a, 'none', 3.2) + line(20, 35, 23.5, 38.5, a, 3.2) + line(30, 32, 45, 32, W, 3.2) + line(51, 25, 51, 39, a, 3.2) },
  { id: 'home', label: 'Home', keys: '⇧⌘H', menu: 'History ▸ Home', cat: 'nav', icon: (a) => pathS('M8 31 L32 10 L56 31') + pathS('M15 25 V53 H49 V25') + rect(27, 37, 10, 16, 2.5, 'none', a, 0) },
  { id: 'history', label: 'History', keys: '⌘Y', menu: 'History ▸ Show History', cat: 'nav', icon: (a) => pathS('M13 38 A21 21 0 1 0 15 21') + poly('9,17 14,22 20,17', W) + poly('34,20 34,33 43,38', a) },
  { id: 'reopen', label: 'Reopen', keys: '⌘Z', menu: 'Edit ▸ Undo (reopens a closed tab)', cat: 'nav', icon: (a) => pathS('M16 22 H38 A13 13 0 0 1 38 48 H18') + poly('24,14 16,22 24,30', a) },

  // row 3 — find & view
  { id: 'find', label: 'Find', keys: '⌘F', menu: 'Edit ▸ Find ▸ Find…', cat: 'view', icon: (a) => lens(pathS('M19 24 A9 9 0 0 1 26 18', a, 'none', 3), a) },
  { id: 'find-prev', label: 'Find prev', keys: '⇧⌘G', menu: 'Edit ▸ Find ▸ Find Previous', cat: 'view', icon: (a) => lens(poly('20,30 27,23 34,30', a), a) },
  { id: 'find-next', label: 'Find next', keys: '⌘G', menu: 'Edit ▸ Find ▸ Find Next', cat: 'view', icon: (a) => lens(poly('20,24 27,31 34,24', a), a) },
  { id: 'reader', label: 'Reader', keys: '⇧⌘R', menu: 'View ▸ Show Reader', cat: 'view', icon: (a) => line(12, 12, 52, 12, a, 5) + line(12, 24, 52, 24, W, 3.2) + line(12, 33, 52, 33, W, 3.2) + line(12, 42, 46, 42, W, 3.2) + line(12, 51, 36, 51, W, 3.2) },
  { id: 'zoom-out', label: 'Zoom out', keys: '⌘−', menu: 'View ▸ Zoom Out', cat: 'view', icon: (a) => lens(line(20, 27, 34, 27, a), a) },
  { id: 'actual-size', label: 'Actual size', keys: '⌘0', menu: 'View ▸ Actual Size', cat: 'view', icon: (a) => rect(6, 12, 52, 40, 9) + `<text x="32" y="40" font-family="${SANS}" font-size="21" fill="${a}" stroke="${a}" stroke-width="0.8" text-anchor="middle">1:1</text>` },
  { id: 'zoom-in', label: 'Zoom in', keys: '⌘+', menu: 'View ▸ Zoom In', cat: 'view', icon: (a) => lens(plus(27, 27, 7, a), a) },
  { id: 'full-screen', label: 'Full screen', keys: '⌃⌘F', menu: 'View ▸ Enter Full Screen', cat: 'view', icon: (a) => pathS('M37 8 H56 V27', a) + line(55, 9, 38, 26, a) + pathS('M27 56 H8 V37', a) + line(9, 55, 26, 38, a) },

  // row 4 — bookmarks & sidebar
  { id: 'sidebar', label: 'Sidebar', keys: '⇧⌘L', menu: 'View ▸ Show Sidebar', cat: 'marks', icon: (a) => `<rect x="6" y="10" width="18" height="44" fill="${a}" clip-path="url(#fr)"/>` + frame() + line(24, 10, 24, 54) },
  { id: 'add-bookmark', label: 'Add bookmark', keys: '⌘D', menu: 'Bookmarks ▸ Add Bookmark…', cat: 'marks', icon: (a) => pathS('M32 16 Q21 9 7 12 V50 Q21 47 32 54 Q43 47 57 50 V12 Q43 9 32 16 Z') + line(32, 16, 32, 54, a) },
  { id: 'reading-list', label: 'Reading list', keys: '⇧⌘D', menu: 'Bookmarks ▸ Add to Reading List', cat: 'marks', icon: (a) => `<circle cx="17" cy="36" r="11" fill="${a}" fill-opacity="0.35" stroke="${W}" stroke-width="${sw}"/><circle cx="47" cy="36" r="11" fill="${a}" fill-opacity="0.35" stroke="${W}" stroke-width="${sw}"/>` + pathS('M28 34 Q32 30 36 34') + line(6, 33, 3, 24, W, 3.4) + line(58, 33, 61, 24, W, 3.4) },
  { id: 'bookmarks', label: 'Bookmarks', keys: '⌥⌘B', menu: 'Bookmarks ▸ Edit Bookmarks', cat: 'marks', icon: (a) => pathS('M14 7 H42 V57 L28 45 L14 57 Z') + line(40, 51, 56, 35, a, 5) + poly('53,32 59,38', a, 5) },
  { id: 'favorites', label: 'Favorites', keys: '⇧⌘B', menu: 'View ▸ Show Favorites Bar', cat: 'marks', icon: (a) => `<polygon points="${star(32, 26, 19, 8.5)}" fill="none" stroke="${W}" stroke-width="${sw}" stroke-linejoin="round"/>` + rect(6, 51, 52, 7, 3.5, 'none', a, 0) },
  { id: 'downloads', label: 'Downloads', keys: '⌥⌘L', menu: 'View ▸ Show Downloads', cat: 'marks', icon: (a) => circ(32, 32, 25) + arrow(32, 31, 'd', 24, a) },
  { id: 'group-prev', label: 'Prev group', keys: '⇧⌘↑', menu: 'Window ▸ Go To Previous Tab Group', cat: 'marks', icon: (a) => rect(20, 6, 36, 36, 7) + rect(8, 18, 36, 36, 7, W, INK) + arrow(26, 36, 'u', 18, a) },
  { id: 'group-next', label: 'Next group', keys: '⇧⌘↓', menu: 'Window ▸ Go To Next Tab Group', cat: 'marks', icon: (a) => rect(20, 6, 36, 36, 7) + rect(8, 18, 36, 36, 7, W, INK) + arrow(26, 36, 'd', 18, a) },
];

function tile(k) {
  const a = C[k.cat];
  // compass-bezel ticks around the key edge: Safari's dial, scaled up and faint
  let ring = '';
  for (let i = 0; i < 60; i++) {
    const ang = (i * 6 * Math.PI) / 180, r2 = 68, r1 = i % 5 ? 64.5 : 61.5;
    ring += `<line x1="${(72 + Math.cos(ang) * r1).toFixed(2)}" y1="${(72 + Math.sin(ang) * r1).toFixed(2)}" x2="${(72 + Math.cos(ang) * r2).toFixed(2)}" y2="${(72 + Math.sin(ang) * r2).toFixed(2)}" stroke="#9ff3ff" stroke-opacity="${k.hero ? 0.2 : 0.11}" stroke-width="1.3" stroke-linecap="round"/>`;
  }
  const bg = k.hero ? ['#26303f', '#161c27', '#0c1017'] : ['#212a38', '#141a24', '#0b0e14'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="42%">
    <stop offset="0" stop-color="${k.hero ? '#4aa3ff' : a}" stop-opacity="${k.hero ? 0.28 : 0.13}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="dial" cx="45%" cy="30%" r="80%">
    <stop offset="0" stop-color="#5cc0ff"/><stop offset="0.6" stop-color="#3a8cf2"/><stop offset="1" stop-color="#2d62dd"/>
  </radialGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.06"/>
    <stop offset="0.7" stop-color="#fff" stop-opacity="0.03"/><stop offset="1" stop-color="#fff" stop-opacity="0.22"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.10"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.5"/>
  </filter>
  <clipPath id="fr"><rect x="6" y="10" width="52" height="44" rx="7"/></clipPath>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${ring}
<rect width="144" height="80" fill="url(#sheen)"/>
<g transform="translate(40 14)" filter="url(#lift)">${k.icon(a)}</g>
<text x="72" y="106" font-family="${SANS}" font-size="17.5" fill="${W}" stroke="${W}" stroke-width="0.6" text-anchor="middle" filter="url(#lift)">${k.label}</text>
<text x="72" y="127" font-family="${MONO}" font-size="15" fill="${k.hero ? '#a6f7ff' : a}" stroke="${k.hero ? '#a6f7ff' : a}" stroke-width="0.45" text-anchor="middle">${k.keys}</text>
<rect x="0.9" y="0.9" width="142.2" height="142.2" rx="20" fill="none" stroke="url(#rim)" stroke-width="1.8"/>
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
  id: k.id, label: k.label, keys: k.keys, action: k.menu, category: k.cat,
})), null, 2));

// contact sheet: 8 x 4 grid of the real PNGs on a device-like plate
const S = 144, G = 22, P = 40;
const sheetW = P * 2 + 8 * S + 7 * G, sheetH = P * 2 + 4 * S + 3 * G;
const imgs = pngs.map((p, i) => {
  const x = P + (i % 8) * (S + G), y = P + Math.floor(i / 8) * (S + G);
  return `<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18"/></clipPath><image x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#c${i})" href="data:image/png;base64,${p.toString('base64')}"/>`;
}).join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0c0e12"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT}`);
