// Generates Stream Deck XL key icons for Ghostty as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

const FONTDIR = path.join(os.homedir(), 'Library/Fonts');
const FONT = {
  fontFiles: ['JetBrainsMonoNerdFont-Bold.ttf', 'JetBrainsMonoNerdFont-Regular.ttf', 'JetBrainsMonoNerdFont-ExtraBold.ttf', 'JetBrainsMonoNerdFont-Medium.ttf']
    .map(f => path.join(FONTDIR, f)),
  loadSystemFonts: true,
  defaultFontFamily: 'JetBrainsMono Nerd Font',
};

// Accents drawn from the Spacedust palette (brightened for glow on dark glass)
const C = {
  win: '#3fd0e8',   // cyan    — windows & tabs
  split: '#6fe0b8', // mint    — splits
  nav: '#ffc878',   // amber   — navigate & search
  edit: '#ff8a3a',  // orange  — clipboard & view
  cfg: '#8fb8ff',   // blue    — config
};
const W = '#eef3ff';
const INK = '#07102a';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const plus = (cx, cy, r, c) => line(cx - r, cy, cx + r, cy, c) + line(cx, cy - r, cx, cy + r, c);
const frame = (y = 10, h = 44) => rect(6, y, 52, h, 7);
function arrow(cx, cy, dir, len, c = W, w = sw) {
  const h = len / 2, k = 5.5;
  const v = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir];
  const tx = cx + v[0] * h, ty = cy + v[1] * h, bx = cx - v[0] * h, by = cy - v[1] * h;
  const px = -v[1], py = v[0];
  return line(bx, by, tx, ty, c, w) + poly(`${tx - v[0] * k + px * k},${ty - v[1] * k + py * k} ${tx},${ty} ${tx - v[0] * k - px * k},${ty - v[1] * k - py * k}`, c, w);
}
function gear(cx, cy, ro, ri, teeth, c = W, w = sw) {
  const pts = [];
  const step = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const t = step * 0.22;
    for (const [ang, r] of [[a - step / 2 + t * 0.4, ri], [a - t, ro], [a + t, ro], [a + step / 2 - t * 0.4, ri]])
      pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)},${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;
}
function ghost() {
  let d = 'M12 54 V32 A20 20 0 0 1 52 32 V54';
  let x = 52;
  for (let i = 0; i < 4; i++) { d += ` Q${x - 2.5} 60 ${x - 5} 55 Q${x - 7.5} 50 ${x - 10} 55`; x -= 10; }
  d += ' Z';
  return pathS(d, W, 'rgba(238,243,255,0.16)') + poly('22,27 28,32 22,37', W) + line(32, 37, 42, 37, W);
}
// Ghostty's own mark for the top-left key: the ghost filled in, with its prompt in the screen blue, as on the app icon
function ghostSolid() {
  let d = 'M12 54 V32 A20 20 0 0 1 52 32 V54';
  let x = 52;
  for (let i = 0; i < 4; i++) { d += ` Q${x - 2.5} 60 ${x - 5} 55 Q${x - 7.5} 50 ${x - 10} 55`; x -= 10; }
  d += ' Z';
  return pathS(d, '#f4f6ff', '#dfe3ff', 2) + poly('22,27 28,32 22,37', '#1d2bb5', 4.4) + line(32, 37, 42, 37, '#1d2bb5', 4.4);
}
// half of the standard frame, filled, clipped to the frame's rounded shape
const half = (side, c) => {
  const r = { l: [6, 10, 26, 44], r: [32, 10, 26, 44], u: [6, 10, 52, 22], d: [6, 32, 52, 22] }[side];
  return `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${c}" clip-path="url(#fr)"/>`;
};
const halfCenter = { l: [19, 32], r: [45, 32], u: [32, 21], d: [32, 43] };
const tabBar = (hl, c) => {
  const t1 = 'M6 24 V16 Q6 12 10 12 H26 Q30 12 30 16 V24';
  const t2 = 'M34 24 V16 Q34 12 38 12 H54 Q58 12 58 16 V24';
  const fill = (d) => pathS(d + ' Z', 'none', c, 0);
  return (hl === 1 ? fill(t1) : hl === 2 ? fill(t2) : '') + pathS(t1) + (hl === 0 ? '' : pathS(t2)) + rect(6, 24, 52, 30, 5);
};
const lens = (inner, c) => `<circle cx="27" cy="27" r="16" fill="none" stroke="${W}" stroke-width="${sw}"/>` + line(39, 39, 53, 53, c, 6.5) + inner;
const bigA = (x = 24) => `<text x="${x}" y="54" font-family="JetBrainsMono Nerd Font" font-weight="800" font-size="50" fill="${W}" text-anchor="middle">A</text>`;
const arcArrow = (cx, cy, r, a0, a1, c) => {
  const p = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  // arrowhead at end, tangent direction (clockwise)
  const t = (a1 + 90) * Math.PI / 180, n = a1 * Math.PI / 180, k = 5.5;
  const hx = x1 - Math.cos(t) * k, hy = y1 - Math.sin(t) * k;
  return pathS(`M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`, c) +
    poly(`${(hx + Math.cos(n) * k).toFixed(2)},${(hy + Math.sin(n) * k).toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)} ${(hx - Math.cos(n) * k).toFixed(2)},${(hy - Math.sin(n) * k).toFixed(2)}`, c);
};

// ---------- the 32 keys (8 x 4, row-major) ----------
// action = Ghostty default keybind action; keys = macOS hotkey to send
const KEYS = [
  // row 1 — windows & tabs
  { id: 'ghostty', label: 'ghostty', keys: 'main', action: 'Switch Profile → Main', cat: 'win', hero: true, icon: () => ghostSolid() },
  { id: 'new-window', label: 'new window', keys: '⌘N', action: 'new_window', cat: 'win', icon: (a) => frame() + line(6, 21, 58, 21) + plus(32, 38, 8, a) },
  { id: 'new-tab', label: 'new tab', keys: '⌘T', action: 'new_tab', cat: 'win', icon: (a) => tabBar(0, a) + plus(46, 16, 5.5, a) + line(34, 24, 58, 24) },
  { id: 'prev-tab', label: 'prev tab', keys: '⇧⌘[', action: 'previous_tab', cat: 'win', icon: (a) => tabBar(1, a) + poly('36,32 29,39 36,46', a) },
  { id: 'next-tab', label: 'next tab', keys: '⇧⌘]', action: 'next_tab', cat: 'win', icon: (a) => tabBar(2, a) + poly('28,32 35,39 28,46', a) },
  { id: 'close', label: 'close', keys: '⌘W', action: 'close_surface', cat: 'win', icon: (a) => frame() + line(6, 21, 58, 21) + line(25, 31, 39, 45, a) + line(39, 31, 25, 45, a) },
  { id: 'reopen', label: 'reopen', keys: '⌘Z', action: 'undo', cat: 'win', icon: (a) => pathS('M16 22 H38 A13 13 0 0 1 38 48 H18') + poly('24,14 16,22 24,30', a) },
  { id: 'palette', label: 'palette', keys: '⇧⌘P', action: 'toggle_command_palette', cat: 'win', icon: (a) => frame() + rect(12, 16, 40, 11, 3.5, a, 'none', 3) + poly('16,19 19,21.5 16,24', a, 2.5) + line(14, 36, 48, 36, W, 3) + line(14, 45, 38, 45, W, 3) },

  // row 2 — splits
  { id: 'split-right', label: 'split →', keys: '⌘D', action: 'new_split:right', cat: 'split', icon: (a) => frame() + line(32, 10, 32, 54) + plus(45, 32, 6.5, a) },
  { id: 'split-down', label: 'split ↓', keys: '⇧⌘D', action: 'new_split:down', cat: 'split', icon: (a) => frame() + line(6, 32, 58, 32) + plus(32, 43, 5.5, a) },
  ...['l', 'u', 'd', 'r'].map((s) => ({
    id: `focus-${{ l: 'left', u: 'up', d: 'down', r: 'right' }[s]}`,
    label: `focus ${{ l: '←', u: '↑', d: '↓', r: '→' }[s]}`,
    keys: `⌥⌘${{ l: '←', u: '↑', d: '↓', r: '→' }[s]}`,
    action: `goto_split:${{ l: 'left', u: 'up', d: 'down', r: 'right' }[s]}`,
    cat: 'split',
    icon: (a) => half(s, a) + frame() + ('lr'.includes(s) ? line(32, 10, 32, 54) : line(6, 32, 58, 32)) + arrow(...halfCenter[s], s, 'lr'.includes(s) ? 13 : 12, INK, 4.5),
  })),
  { id: 'zoom-split', label: 'zoom', keys: '⇧⌘↩', action: 'toggle_split_zoom', cat: 'split', icon: (a) => frame() + rect(12, 16, 18, 14, 3, a, a, 0) + line(35, 35, 50, 47, a) + poly('41,47 50,47 50,38', a) },
  { id: 'equalize', label: 'equalize', keys: '⌃⌘=', action: 'equalize_splits', cat: 'split', icon: (a) => rect(6, 8, 52, 36, 7) + line(23.3, 8, 23.3, 44) + line(40.7, 8, 40.7, 44) + line(6, 54, 58, 54, a, 3) + [6, 23.3, 40.7, 58].map((x) => line(x, 50, x, 58, a, 3)).join('') },

  // row 3 — navigate & search
  { id: 'prompt-up', label: 'prompt ↑', keys: '⌘↑', action: 'jump_to_prompt:-1', cat: 'nav', icon: (a) => arrow(32, 18, 'u', 20, a) + poly('18,38 25,45 18,52', W) + line(30, 52, 46, 52) },
  { id: 'prompt-down', label: 'prompt ↓', keys: '⌘↓', action: 'jump_to_prompt:1', cat: 'nav', icon: (a) => poly('18,10 25,17 18,24', W) + line(30, 24, 46, 24) + arrow(32, 44, 'd', 20, a) },
  { id: 'scroll-top', label: 'top', keys: '⌘Home', action: 'scroll_to_top', cat: 'nav', icon: (a) => line(12, 9, 52, 9, a, 5) + arrow(32, 36, 'u', 32, W) + line(12, 56, 22, 56, W, 3) + line(42, 56, 52, 56, W, 3) },
  { id: 'scroll-bottom', label: 'bottom', keys: '⌘End', action: 'scroll_to_bottom', cat: 'nav', icon: (a) => line(12, 8, 22, 8, W, 3) + line(42, 8, 52, 8, W, 3) + arrow(32, 28, 'd', 32, W) + line(12, 55, 52, 55, a, 5) },
  { id: 'find', label: 'find', keys: '⌘F', action: 'start_search', cat: 'nav', icon: (a) => lens(pathS('M19 24 A9 9 0 0 1 26 18', a, 'none', 3), a) },
  { id: 'find-prev', label: 'find prev', keys: '⇧⌘G', action: 'navigate_search:previous', cat: 'nav', icon: (a) => lens(poly('20,30 27,23 34,30', a), a) },
  { id: 'find-next', label: 'find next', keys: '⌘G', action: 'navigate_search:next', cat: 'nav', icon: (a) => lens(poly('20,24 27,31 34,24', a), a) },
  { id: 'clear', label: 'clear', keys: '⌘K', action: 'clear_screen', cat: 'nav', icon: (a) => `<g transform="rotate(-38 32 30)">${rect(12, 21, 40, 18, 4, a, a, 0)}<rect x="12" y="21" width="16" height="18" rx="4" fill="${INK}" opacity="0"/>${rect(26, 21, 26, 18, 4, W, INK)}${rect(12, 21, 40, 18, 4)}</g>` + line(10, 56, 54, 56, W, 3) },

  // row 4 — clipboard, view, config
  { id: 'copy', label: 'copy', keys: '⌘C', action: 'copy_to_clipboard', cat: 'edit', icon: (a) => rect(22, 8, 30, 36, 6) + rect(12, 20, 30, 36, 6, a, INK) },
  { id: 'paste', label: 'paste', keys: '⌘V', action: 'paste_from_clipboard', cat: 'edit', icon: (a) => rect(11, 12, 42, 46, 6) + rect(22, 6, 20, 11, 3.5, a, a, 0) + line(20, 32, 44, 32, W, 3) + line(20, 42, 36, 42, W, 3) },
  { id: 'font-smaller', label: 'font −', keys: '⌘−', action: 'decrease_font_size', cat: 'edit', icon: (a) => bigA(24) + line(44, 20, 58, 20, a, 5) },
  { id: 'font-reset', label: 'font reset', keys: '⌘0', action: 'reset_font_size', cat: 'edit', icon: (a) => bigA(24) + `<text x="51" y="30" font-family="JetBrainsMono Nerd Font" font-weight="800" font-size="24" fill="${a}" text-anchor="middle">0</text>` },
  { id: 'font-bigger', label: 'font +', keys: '⌘=', action: 'increase_font_size', cat: 'edit', icon: (a) => bigA(24) + plus(51, 20, 7, a).replace(/stroke-width="4"/g, 'stroke-width="5"') },
  { id: 'fullscreen', label: 'fullscreen', keys: '⌘↩', action: 'toggle_fullscreen', cat: 'edit', icon: (a) => pathS('M6 20 V12 Q6 6 12 6 H20', a, 'none', 5) + pathS('M44 6 H52 Q58 6 58 12 V20', a, 'none', 5) + pathS('M58 44 V52 Q58 58 52 58 H44', a, 'none', 5) + pathS('M20 58 H12 Q6 58 6 52 V44', a, 'none', 5) + rect(18, 21, 28, 22, 4) },
  { id: 'open-config', label: 'config', keys: '⌘,', action: 'open_config', cat: 'cfg', icon: (a) => gear(32, 32, 25, 19, 8) + `<circle cx="32" cy="32" r="7.5" fill="none" stroke="${a}" stroke-width="${sw}"/>` },
  { id: 'reload-config', label: 'reload', keys: '⇧⌘,', action: 'reload_config', cat: 'cfg', icon: (a) => arcArrow(32, 32, 24, 200, 330, a) + arcArrow(32, 32, 24, 20, 150, a) + gear(32, 32, 12, 9, 6, W, 3.2) },
];

function tile(k, i) {
  const a = C[k.cat];
  const bg = k.hero
    ? ['#3446ff', '#1624c8', '#0a1286']
    : ['#132a66', '#0a1638', '#060b1f'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="28%" r="85%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="aura" cx="50%" cy="36%" r="42%">
    <stop offset="0" stop-color="${k.hero ? '#9fb0ff' : a}" stop-opacity="${k.hero ? 0.35 : 0.16}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="0.75" fill="${k.hero ? '#c8d2ff' : '#9db4ff'}" opacity="${k.hero ? 0.2 : 0.13}"/>
  </pattern>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.09"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="3.4" result="b"/>
    <feFlood flood-color="${k.hero ? '#bcc8ff' : a}" flood-opacity="0.85"/>
    <feComposite in2="b" operator="in" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="tglow" x="-20%" y="-60%" width="140%" height="220%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/>
    <feFlood flood-color="${k.hero ? '#bcc8ff' : a}" flood-opacity="0.5"/>
    <feComposite in2="b" operator="in" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <clipPath id="fr"><rect x="6" y="10" width="52" height="44" rx="7"/></clipPath>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#dots)"/>
<rect width="144" height="144" fill="url(#aura)"/>
<rect width="144" height="72" fill="url(#sheen)"/>
<g transform="translate(40 14)" filter="url(#glow)">${k.icon(a)}</g>
<g font-family="JetBrainsMono Nerd Font" text-anchor="middle">
  <text x="72" y="105" font-size="17" font-weight="700" fill="${W}" filter="url(#tglow)">${k.label}</text>
  <text x="72" y="128" font-size="16" font-weight="700" fill="${k.hero ? '#c8d2ff' : a}" opacity="0.92">${k.keys}</text>
</g>
<rect x="0.75" y="0.75" width="142.5" height="142.5" rx="20" fill="none" stroke="#ffffff" stroke-opacity="${k.hero ? 0.22 : 0.08}" stroke-width="1.5"/>
</svg>`;
}

const pngs = [];
KEYS.forEach((k, i) => {
  const n = String(i + 1).padStart(2, '0');
  const svg = tile(k, i);
  fs.writeFileSync(path.join(OUT, 'svg', `${n}-${k.id}.svg`), svg);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 288 }, font: FONT }).render().asPng();
  fs.writeFileSync(path.join(OUT, 'icons', `${n}-${k.id}.png`), png);
  pngs.push(png);
});

// keymap for the mockup page / later profile build
fs.writeFileSync(path.join(OUT, 'keymap.json'), JSON.stringify(KEYS.map((k, i) => ({
  pos: { col: i % 8, row: Math.floor(i / 8) }, file: `${String(i + 1).padStart(2, '0')}-${k.id}.png`,
  id: k.id, label: k.label, keys: k.keys, action: k.action, category: k.cat,
})), null, 2));

// contact sheet: 8 x 4 grid of the real PNGs on a device-like plate
const S = 144, G = 22, P = 40;
const sheetW = P * 2 + 8 * S + 7 * G, sheetH = P * 2 + 4 * S + 3 * G;
const imgs = pngs.map((p, i) => {
  const x = P + (i % 8) * (S + G), y = P + Math.floor(i / 8) * (S + G);
  return `<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18"/></clipPath><image x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#c${i})" href="data:image/png;base64,${p.toString('base64')}"/>`;
}).join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0d0f14"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT}`);
