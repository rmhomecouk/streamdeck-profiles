// Generates Stream Deck XL key icons for Claude desktop as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitLabel, HERO_GLYPH } from '../../tools/tile.mjs';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

const SERIF = 'New York';
const MONO = 'SF Mono';
const FONT = {
  fontFiles: ['/System/Library/Fonts/NewYork.ttf', '/System/Library/Fonts/SFNSMono.ttf'].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
  defaultFontFamily: SERIF,
};

// Claude palette: warm charcoal ground, ivory ink, one accent per row
const C = {
  chat: '#e07a5f',  // terracotta — chats & navigation
  comp: '#e3b57c',  // kraft      — composer
  code: '#8fb4e3',  // focus blue — Claude Code
  app: '#b9b3e0',   // heather    — sessions & app
};
const W = '#f4f1ea';
const INK = '#1f1d1a';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const plus = (cx, cy, r, c) => line(cx - r, cy, cx + r, cy, c) + line(cx, cy - r, cx, cy + r, c);
const frame = () => rect(6, 10, 52, 44, 7);
function arrow(cx, cy, dir, len, c = W, w = sw) {
  const h = len / 2, k = 5.5;
  const v = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir];
  const tx = cx + v[0] * h, ty = cy + v[1] * h, bx = cx - v[0] * h, by = cy - v[1] * h;
  const px = -v[1], py = v[0];
  return line(bx, by, tx, ty, c, w) + poly(`${tx - v[0] * k + px * k},${ty - v[1] * k + py * k} ${tx},${ty} ${tx - v[0] * k - px * k},${ty - v[1] * k - py * k}`, c, w);
}
function gear(cx, cy, ro, ri, teeth, c = W, w = sw) {
  const pts = [], step = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2, t = step * 0.22;
    for (const [ang, r] of [[a - step / 2 + t * 0.4, ri], [a - t, ro], [a + t, ro], [a + step / 2 - t * 0.4, ri]])
      pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)},${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;
}
// speech bubble with a tail at bottom-left
const bubble = (x, y, w, h, c = W, s = sw) => {
  const r = 8;
  return pathS(`M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + 20} L${x + 9} ${y + h + 9} V${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`, c, 'none', s);
};
// Claude's spark: irregular rays around a small core, like the app icon
function spark() {
  const rays = [[-90, 27], [-58, 22], [-30, 26], [2, 21], [30, 27], [58, 23], [88, 26], [118, 21], [150, 27], [180, 22], [208, 26], [238, 21]];
  return rays.map(([a, len], i) => {
    const r = (a * Math.PI) / 180, r0 = 5;
    return line((32 + Math.cos(r) * r0).toFixed(2), (32 + Math.sin(r) * r0).toFixed(2), (32 + Math.cos(r) * len).toFixed(2), (32 + Math.sin(r) * len).toFixed(2), '#fffaf3', i % 2 ? 5 : 6.2);
  }).join('') + circ(32, 32, 6, 'none', '#fffaf3', 0);
}
const half = (side, c) => {
  const r = { l: [6, 10, 26, 44], r: [32, 10, 26, 44] }[side];
  return `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${c}" clip-path="url(#fr)"/>`;
};
const lens = (inner, c) => circ(27, 27, 16) + line(39, 39, 53, 53, c, 6.5) + inner;

// ---------- the 32 keys (8 x 4, row-major) ----------
// what = where the shortcut comes from in Claude 1.52 (menu accelerator or in-app shortcut id)
const KEYS = [
  // row 1 — chats & navigation
  { id: 'claude', label: 'Claude', keys: 'main', what: 'Switch Profile → Main', cat: 'chat', hero: true, icon: () => spark() },
  { id: 'new-chat', label: 'New chat', keys: '⌘N', what: 'File ▸ New Chat (New session on the Code tab)', cat: 'chat', icon: (a) => bubble(8, 10, 48, 34) + plus(32, 27, 8, a) },
  { id: 'search', label: 'Search', keys: '⌘K', what: 'command_palette — quick chat or search', cat: 'chat', icon: (a) => lens(pathS('M19 24 A9 9 0 0 1 26 18', a, 'none', 3), a) },
  { id: 'quick-chat', label: 'Quick chat', keys: '⌃⌘K', what: 'quick_chat', cat: 'chat', icon: (a) => bubble(8, 10, 48, 34) + pathS('M35 14 L24 30 H32 L29 40 L40 24 H32 Z', a, a, 1.5) },
  { id: 'incognito', label: 'Incognito', keys: '⇧⌘I', what: 'incognito — new incognito chat', cat: 'chat', icon: (a) => pathS('M16 54 V30 A16 16 0 0 1 48 30 V54 L42.7 49 L37.3 54 L32 49 L26.7 54 L21.3 49 Z') + circ(26, 31, 3.2, 'none', a, 0) + circ(38, 31, 3.2, 'none', a, 0) },
  { id: 'prev-chat', label: 'Prev chat', keys: '⇧⌘[', what: 'Go ▸ previous chat / session', cat: 'chat', icon: (a) => bubble(8, 10, 48, 34) + poly('36,19 29,27 36,35', a) },
  { id: 'next-chat', label: 'Next chat', keys: '⇧⌘]', what: 'Go ▸ next chat / session', cat: 'chat', icon: (a) => bubble(8, 10, 48, 34) + poly('29,19 36,27 29,35', a) },
  { id: 'sidebar', label: 'Sidebar', keys: '⌘.', what: 'toggle_sidebar', cat: 'chat', icon: (a) => `<rect x="6" y="10" width="18" height="44" fill="${a}" clip-path="url(#fr)"/>` + frame() + line(24, 10, 24, 54) },

  // row 2 — composer
  { id: 'attach', label: 'Attach', keys: '⌘U', what: 'file_upload — add files or photos', cat: 'comp', icon: (a) => `<g transform="rotate(40 32 32)">${pathS('M38 22 V44 A8 8 0 0 1 22 44 V16 A6 6 0 0 1 34 16 V40', a)}</g>` },
  { id: 'dictate', label: 'Dictate', keys: '⌘D', what: 'toggle_dictation', cat: 'comp', icon: (a) => rect(24, 7, 16, 28, 8, 'none', a, 0) + pathS('M15 29 A17 17 0 0 0 49 29') + line(32, 46, 32, 55) + line(24, 55, 40, 55) },
  { id: 'thinking', label: 'Thinking', keys: '⇧⌘E', what: 'extended_thinking (effort menu on the Code tab)', cat: 'comp', icon: (a) => pathS('M20 40 A9 9 0 0 1 17 22 A12 12 0 0 1 38 14 A11 11 0 0 1 51 30 A9 9 0 0 1 44 40 Z') + circ(25, 28, 2.8, 'none', a, 0) + circ(33, 28, 2.8, 'none', a, 0) + circ(41, 28, 2.8, 'none', a, 0) + circ(17, 48, 3.4, W, 'none', 3) + circ(10, 56, 2.2, W, 'none', 2.6) },
  { id: 'model', label: 'Model', keys: '⇧⌘.', what: 'model_selector', cat: 'comp', icon: (a) => pathS('M32 9 L55 21 L32 33 L9 21 Z', a, 'rgba(227,181,124,0.22)') + pathS('M9 32 L32 44 L55 32') + pathS('M9 43 L32 55 L55 43') },
  { id: 'stop', label: 'Stop', keys: 'esc', what: 'stop Claude’s response', cat: 'comp', icon: (a) => circ(32, 32, 23) + rect(23, 23, 18, 18, 3.5, 'none', a, 0) },
  { id: 'side-chat', label: 'Side chat', keys: '⌘;', what: 'btw_side_chat — toggle side chat', cat: 'comp', icon: (a) => frame() + line(34, 10, 34, 54) + rect(39, 18, 14, 11, 3.5, a, 'none', 3) + poly('42,29 40,34 46,29', a, 3) },
  { id: 'close', label: 'Close', keys: '⌘W', what: 'close chat / session', cat: 'comp', icon: (a) => frame() + line(6, 21, 58, 21) + line(25, 31, 39, 45, a) + line(39, 31, 25, 45, a) },
  { id: 'reopen', label: 'Reopen', keys: '⇧⌘T', what: 'reopen closed session', cat: 'comp', icon: (a) => pathS('M16 22 H38 A13 13 0 0 1 38 48 H18') + poly('24,14 16,22 24,30', a) },

  // row 3 — Claude Code
  { id: 'open-folder', label: 'Open folder', keys: '⇧⌘O', what: 'File ▸ Open Folder… (new Code session)', cat: 'code', icon: (a) => pathS('M6 18 Q6 12 12 12 H24 L29 18 H52 Q58 18 58 24 V48 Q58 54 52 54 H12 Q6 54 6 48 Z') + plus(32, 36, 7, a) },
  { id: 'pane-prev', label: 'Prev pane', keys: '⌃[', what: 'focus_previous_pane (split view)', cat: 'code', icon: (a) => half('l', a) + frame() + line(32, 10, 32, 54) + arrow(19, 32, 'l', 13, INK, 4.5) },
  { id: 'pane-next', label: 'Next pane', keys: '⌃]', what: 'focus_next_pane (split view)', cat: 'code', icon: (a) => half('r', a) + frame() + line(32, 10, 32, 54) + arrow(45, 32, 'r', 13, INK, 4.5) },
  { id: 'close-pane', label: 'Close pane', keys: '⌘\\', what: 'close the most recent pane', cat: 'code', icon: (a) => frame() + line(32, 10, 32, 54) + line(40, 26, 50, 38, a) + line(50, 26, 40, 38, a) },
  { id: 'prompt-up', label: 'Prompt up', keys: '⌥⌘↑', what: 'jump_prev_prompt', cat: 'code', icon: (a) => arrow(32, 18, 'u', 20, a) + poly('18,38 25,45 18,52') + line(30, 52, 46, 52) },
  { id: 'prompt-down', label: 'Prompt down', keys: '⌥⌘↓', what: 'jump_next_prompt', cat: 'code', icon: (a) => poly('18,10 25,17 18,24') + line(30, 24, 46, 24) + arrow(32, 44, 'd', 20, a) },
  { id: 'files', label: 'Files', keys: '⇧⌘F', what: 'toggle Files pane', cat: 'code', icon: (a) => pathS('M14 8 H36 L50 22 V52 Q50 56 46 56 H18 Q14 56 14 52 Z') + pathS('M36 8 V22 H50') + line(22, 34, 42, 34, a, 3.4) + line(22, 43, 36, 43, a, 3.4) },
  { id: 'open-pr', label: 'Open PR', keys: '⌥⌘G', what: 'open_code_session_pr', cat: 'code', icon: (a) => circ(17, 13, 5) + circ(17, 51, 5) + circ(47, 51, 5) + line(17, 18, 17, 46) + pathS('M47 46 V25 Q47 16 38 16 H29', a) + poly('34,11 29,16 34,21', a) },

  // row 4 — sessions & app
  { id: 'fork', label: 'Fork', keys: '⌥⌘O', what: 'fork_code_session', cat: 'app', icon: (a) => circ(17, 12, 5) + circ(47, 12, 5) + circ(32, 52, 5) + pathS('M17 17 V22 Q17 31 26 31 H38 Q47 31 47 22 V17', a) + line(32, 31, 32, 47, a) },
  { id: 'pin', label: 'Pin', keys: '⌥⌘P', what: 'pin / unpin chat, task or session', cat: 'app', icon: (a) => `<g transform="rotate(35 32 32)">${rect(22, 6, 20, 8, 3)}${pathS('M25 14 L22 32 H42 L39 14', W, 'rgba(185,179,224,0.25)')}${line(32, 32, 32, 57, a)}</g>` },
  { id: 'archive', label: 'Archive', keys: '⌥⌘A', what: 'archive task / session', cat: 'app', icon: (a) => rect(7, 11, 50, 13, 3.5) + pathS('M11 24 V50 Q11 55 16 55 H48 Q53 55 53 50 V24') + line(25, 35, 39, 35, a, 5) },
  { id: 'find', label: 'Find', keys: '⌘F', what: 'Edit ▸ Find…', cat: 'app', icon: (a) => rect(7, 7, 34, 44, 5) + line(14, 19, 33, 19, W, 3.2) + line(14, 28, 27, 28, W, 3.2) + circ(40, 39, 10, a, INK) + line(47.5, 46.5, 55, 54, a, 6) },
  { id: 'zoom-out', label: 'Zoom out', keys: '⌘−', what: 'View ▸ Zoom Out', cat: 'app', icon: (a) => lens(line(20, 27, 34, 27, a), a) },
  { id: 'zoom-in', label: 'Zoom in', keys: '⌘=', what: 'View ▸ Zoom In', cat: 'app', icon: (a) => lens(plus(27, 27, 7, a), a) },
  { id: 'shortcuts', label: 'Shortcuts', keys: '⌘/', what: 'Help ▸ Keyboard Shortcuts', cat: 'app', icon: (a) => rect(8, 8, 48, 48, 10) + rect(15, 13, 34, 34, 6, W, 'none', 2) + `<text x="32" y="40" font-family="${MONO}" font-weight="700" font-size="26" fill="${a}" text-anchor="middle">⌘</text>` },
  { id: 'settings', label: 'Settings', keys: '⌘,', what: 'Claude ▸ Settings…', cat: 'app', icon: (a) => gear(32, 32, 25, 19, 8) + circ(32, 32, 7.5, a) },
];

// New York has no arrows or math signs; set just those glyphs in SF so the serif run isn't swapped out
const label = (s) => s.replace(/([←→↑↓−+])/g, `<tspan font-family="SF Pro, ${MONO}">$1</tspan>`);

function tile(k) {
  const a = C[k.cat];
  const bg = k.hero ? ['#e3876a', '#cf6647', '#a9492f'] : ['#36322d', '#26241f', '#1b1a17'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="22%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="45%">
    <stop offset="0" stop-color="${k.hero ? '#fff3e8' : a}" stop-opacity="${k.hero ? 0.18 : 0.12}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <pattern id="grain" width="5" height="5" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1.2" r="0.55" fill="#fff" opacity="${k.hero ? 0.12 : 0.07}"/>
    <circle cx="3.6" cy="3.4" r="0.45" fill="#000" opacity="0.16"/>
    <circle cx="3.2" cy="0.6" r="0.35" fill="#fff" opacity="${k.hero ? 0.08 : 0.04}"/>
  </pattern>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#000" flood-opacity="${k.hero ? 0.28 : 0.45}"/>
  </filter>
  <clipPath id="fr"><rect x="6" y="10" width="52" height="44" rx="7"/></clipPath>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
<rect width="144" height="144" fill="url(#grain)"/>
<g transform="${k.hero ? HERO_GLYPH : 'translate(40 14)'}" filter="url(#lift)">${k.icon(a)}</g>
${k.hero ? '' : fitLabel(k.label, { family: SERIF, weight: 400, font: FONT }).map((l) => `<text x="72" y="${l.y}" font-family="${SERIF}" font-size="${l.size}" fill="${k.hero ? '#fffaf3' : W}" stroke="${k.hero ? '#fffaf3' : W}" stroke-width="0.55" text-anchor="middle" filter="url(#lift)">${label(l.text)}</text>`).join('\n')}
<rect x="0.75" y="0.75" width="142.5" height="142.5" rx="20" fill="none" stroke="#fff" stroke-opacity="${k.hero ? 0.25 : 0.07}" stroke-width="1.5"/>
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
  id: k.id, label: k.label, keys: k.keys, action: k.what, category: k.cat,
})), null, 2));

// contact sheet: 8 x 4 grid of the real PNGs on a device-like plate
const S = 144, G = 22, P = 40;
const sheetW = P * 2 + 8 * S + 7 * G, sheetH = P * 2 + 4 * S + 3 * G;
const imgs = pngs.map((p, i) => {
  const x = P + (i % 8) * (S + G), y = P + Math.floor(i / 8) * (S + G);
  return `<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18"/></clipPath><image x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#c${i})" href="data:image/png;base64,${p.toString('base64')}"/>`;
}).join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0f0e0d"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT}`);
