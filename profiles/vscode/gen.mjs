// Generates Stream Deck XL key icons for Visual Studio Code as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Family names as stored in the fonts' name tables. resvg can't render SF Pro (SFNS.ttf),
// so labels use Helvetica Neue — the neutral grotesque closest to VS Code's macOS UI font.
const SANS = 'Helvetica Neue';
const MONO = '.SF NS Mono';
const FONT = {
  fontFiles: ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/SFNSMono.ttf'].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: VS Code's Dark+ syntax colours, so each row reads like a token class
const C = {
  nav: '#4daafc',  // focus blue      — navigate
  edit: '#c586c0', // keyword purple  — edit
  view: '#4ec9b0', // type teal       — workbench
  run: '#dcdcaa',  // function yellow — run & AI
};
const RED = '#f14c4c', GREEN = '#89d185', BULB = '#ffcc00', CLAUDE = '#d97757', BP = '#e51400';
const W = '#e8e8e8';
const INK = '#1f1f1f';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const plus = (cx, cy, r, c, w = sw) => line(cx - r, cy, cx + r, cy, c, w) + line(cx, cy - r, cx, cy + r, c, w);
const mono = (x, y, size, t, c, anchor = 'middle') => `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${c}" stroke="${c}" stroke-width="${(size / 22).toFixed(2)}" text-anchor="${anchor}">${t}</text>`;
function arrow(cx, cy, dir, len, c = W, w = sw) {
  const h = len / 2, k = 6;
  const v = { l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir];
  const tx = cx + v[0] * h, ty = cy + v[1] * h, bx = cx - v[0] * h, by = cy - v[1] * h;
  const px = -v[1], py = v[0];
  return line(bx, by, tx, ty, c, w) + poly(`${tx - v[0] * k + px * k},${ty - v[1] * k + py * k} ${tx},${ty} ${tx - v[0] * k - px * k},${ty - v[1] * k - py * k}`, c, w);
}
// four-point sparkle, used for the AI keys
const spark = (cx, cy, r, c) => `<path d="M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r} Z" fill="${c}"/>`;
const doc = (x, y, w, h, c = W) => pathS(`M${x} ${y} H${x + w - 11} L${x + w} ${y + 11} V${y + h} H${x} Z`, c) + poly(`${x + w - 11},${y} ${x + w - 11},${y + 11} ${x + w},${y + 11}`, c, 3);
const lens = (cx, cy, r, c) => circ(cx, cy, r, c) + line(cx + r * 0.72, cy + r * 0.72, cx + r * 1.6, cy + r * 1.6, c, 5.5);
const textLines = (x, ys, lens_, c = W, w = 3.6) => ys.map((y, i) => line(x[i] ?? x[0], y, (x[i] ?? x[0]) + lens_[i], y, c, w)).join('');

// VS Code's mark: the dark back stroke, the mid diagonal and the light right band
function codeMark() {
  return `<path d="M7 42 L43.5 8.5 L50 11 V22 L16.5 49 Q13 51.5 10.5 49.5 L7 46.5 Q5 44 7 42 Z" fill="#2a64a3"/>` +
    `<path d="M7 22 L10.5 18.8 Q13 16.8 16 19 L50 44 V55 L43.5 57 L7 26.5 Q5 24.3 7 22 Z" fill="#3a7fcf"/>` +
    `<path d="M43.5 8.5 Q46 5.5 49.5 6.8 L57 10.4 Q59.5 11.6 59.5 14.6 V49.4 Q59.5 52.4 57 53.6 L49.5 57.2 Q46 58.5 43.5 57 Q46.5 55.5 46.5 52 V13.5 Q46.5 10 43.5 8.5 Z" fill="#4c9df0"/>` +
    `<path d="M46.5 13.5 Q46.5 10 43.5 8.5 L50 11 V55 L43.5 57 Q46.5 55.5 46.5 52 Z" fill="#3a86dc"/>`;
}
// the Claude spark: eight tapered rays
function claudeSpark(c) {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2, l = i % 2 ? 22 : 27, s = 0.2;
    const p = (ang, r) => `${(32 + r * Math.cos(ang)).toFixed(2)} ${(32 + r * Math.sin(ang)).toFixed(2)}`;
    d += `M${p(a - s, 5)} L${p(a, l)} L${p(a + s, 5)} Z `;
  }
  return `<path d="${d}" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>` + circ(32, 32, 7, 'none', c, 0);
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// cmd = VS Code command id (default macOS keybinding in VS Code 1.136); when = where it works
const KEYS = [
  // row 1 — navigate
  { id: 'code', label: 'VS Code', keys: 'main', cmd: 'Switch Profile → Main', cat: 'nav', when: 'anywhere', hero: true, icon: () => codeMark() },
  { id: 'commands', label: 'Commands', keys: '⇧⌘P', cmd: 'workbench.action.showCommands', cat: 'nav', when: 'anywhere', icon: (a) => rect(4, 12, 56, 40, 9) + poly('15,24 23,32 15,40', a, 4.6) + line(29, 40, 45, 40, a, 4.6) },
  { id: 'quick-open', label: 'Quick open', keys: '⌘P', cmd: 'workbench.action.quickOpen', cat: 'nav', when: 'anywhere', icon: (a) => doc(8, 5, 34, 46) + lens(43, 41, 9, a) },
  { id: 'symbol', label: 'Go to symbol', keys: '⇧⌘O', cmd: 'workbench.action.gotoSymbol', cat: 'nav', when: 'editor', icon: (a) => rect(4, 6, 56, 52, 11) + mono(32, 47, 44, '@', a) },
  { id: 'line', label: 'Go to line', keys: '⌃G', cmd: 'workbench.action.gotoLine', cat: 'nav', when: 'editor', icon: (a) => mono(4, 26, 19, '12', '#858585', 'start') + mono(4, 45, 19, '13', a, 'start') + mono(4, 64, 19, '14', '#858585', 'start') + line(33, 20, 58, 20, W, 3.4) + rect(30, 31, 30, 16, 4, a, 'none', 3) + line(33, 58, 52, 58, W, 3.4) },
  { id: 'definition', label: 'Definition', keys: 'F12', cmd: 'editor.action.revealDefinition', cat: 'nav', when: 'editor', icon: (a) => pathS('M18 8 Q9 8 9 16 V26 Q9 32 3 32 Q9 32 9 38 V48 Q9 56 18 56') + pathS('M46 8 Q55 8 55 16 V26 Q55 32 61 32 Q55 32 55 38 V48 Q55 56 46 56') + arrow(32, 30, 'd', 26, a) + line(24, 47, 40, 47, a) },
  { id: 'back', label: 'Back', keys: '⌃-', cmd: 'workbench.action.navigateBack', cat: 'nav', when: 'anywhere', icon: (a) => arrow(32, 32, 'l', 44, a, 5) },
  { id: 'forward', label: 'Forward', keys: '⌃⇧-', cmd: 'workbench.action.navigateForward', cat: 'nav', when: 'anywhere', icon: (a) => arrow(32, 32, 'r', 44, a, 5) },

  // row 2 — edit
  { id: 'rename', label: 'Rename', keys: 'F2', cmd: 'editor.action.rename', cat: 'edit', when: 'editor', icon: (a) => rect(3, 17, 58, 30, 6) + mono(8, 40, 19, 'ab', W, 'start') + line(40, 23, 40, 41, a, 3.6) + line(35, 23, 45, 23, a, 3) + line(35, 41, 45, 41, a, 3) },
  { id: 'format', label: 'Format', keys: '⇧⌥F', cmd: 'editor.action.formatDocument', cat: 'edit', when: 'editor', icon: (a) => textLines([6, 16, 16, 26, 16, 6], [8, 18, 28, 38, 48, 58], [30, 34, 24, 30, 36, 20]) + `<g opacity="0.95">${line(6, 18, 6, 48, a, 3)}${line(16, 28, 16, 38, a, 3)}</g>` },
  { id: 'quick-fix', label: 'Quick fix', keys: '⌘.', cmd: 'editor.action.quickFix', cat: 'edit', c: BULB, when: 'editor', icon: () => pathS('M22 42 Q22 36 17 31 Q11 25 11 18 Q12 5 32 4 Q52 5 53 18 Q53 25 47 31 Q42 36 42 42 Z', BULB) + line(24, 50, 40, 50, BULB) + line(27, 58, 37, 58, BULB) },
  { id: 'comment', label: 'Comment', keys: '⌘/', cmd: 'editor.action.commentLine', cat: 'edit', when: 'editor', icon: (a) => line(10, 50, 24, 12, a, 5.5) + line(24, 50, 38, 12, a, 5.5) + line(44, 32, 58, 32, '#858585', 3.4) + line(44, 44, 54, 44, '#858585', 3.4) },
  { id: 'line-up', label: 'Line up', keys: '⌥↑', cmd: 'editor.action.moveLinesUpAction', cat: 'edit', when: 'editor', icon: (a) => textLines([4], [14, 32, 50], [30, 30, 30]) + rect(0, 25, 38, 14, 4, a, 'none', 2.6) + arrow(51, 32, 'u', 40, a) },
  { id: 'line-down', label: 'Line down', keys: '⌥↓', cmd: 'editor.action.moveLinesDownAction', cat: 'edit', when: 'editor', icon: (a) => textLines([4], [14, 32, 50], [30, 30, 30]) + rect(0, 25, 38, 14, 4, a, 'none', 2.6) + arrow(51, 32, 'd', 40, a) },
  { id: 'duplicate', label: 'Duplicate', keys: '⇧⌥↓', cmd: 'editor.action.copyLinesDownAction', cat: 'edit', when: 'editor', icon: (a) => rect(4, 8, 40, 16, 4) + rect(4, 32, 40, 16, 4, a, `${a}33`) + arrow(54, 34, 'd', 28, a) },
  { id: 'next-match', label: 'Next match', keys: '⌘D', cmd: 'editor.action.addSelectionToNextFindMatch', cat: 'edit', when: 'editor', icon: (a) => `<rect x="3" y="11" width="26" height="17" rx="3" fill="${a}" fill-opacity="0.35"/><rect x="31" y="36" width="26" height="17" rx="3" fill="${a}" fill-opacity="0.35"/>` + line(29, 8, 29, 31, W, 3.4) + line(57, 33, 57, 56, W, 3.4) + textLines([6, 34], [44, 20], [20, 22], '#858585', 3) },

  // row 3 — workbench
  { id: 'explorer', label: 'Explorer', keys: '⇧⌘E', cmd: 'workbench.view.explorer', cat: 'view', when: 'anywhere', icon: (a) => doc(20, 4, 36, 44, a) + pathS('M8 18 V58 H40', W) },
  { id: 'search', label: 'Search', keys: '⇧⌘F', cmd: 'workbench.action.findInFiles', cat: 'view', when: 'anywhere', icon: (a) => circ(36, 26, 17) + line(24, 38, 8, 54, W, 6) + `<path d="M29 21 A9 9 0 0 1 37 15" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'scm', label: 'Source control', keys: '⌃⇧G', cmd: 'workbench.view.scm', cat: 'view', when: 'anywhere', icon: (a) => circ(18, 10, 6) + circ(18, 54, 6) + circ(46, 20, 6, a) + line(18, 16, 18, 48) + pathS('M46 26 Q46 40 18 42', a) },
  { id: 'extensions', label: 'Extensions', keys: '⇧⌘X', cmd: 'workbench.view.extensions', cat: 'view', when: 'anywhere', icon: (a) => rect(6, 20, 18, 18, 3) + rect(6, 40, 18, 18, 3) + rect(26, 40, 18, 18, 3) + `<rect x="34" y="4" width="18" height="18" rx="3" transform="rotate(12 43 13)" fill="${a}33" stroke="${a}" stroke-width="${sw}"/>` },
  { id: 'sidebar', label: 'Sidebar', keys: '⌘B', cmd: 'workbench.action.toggleSidebarVisibility', cat: 'view', when: 'anywhere', icon: (a) => rect(4, 10, 56, 44, 7) + `<rect x="6" y="12" width="17" height="40" rx="5" fill="${a}" fill-opacity="0.45"/>` + line(24, 12, 24, 52) },
  { id: 'terminal', label: 'Terminal', keys: '⌃`', cmd: 'workbench.action.terminal.toggleTerminal', cat: 'view', when: 'anywhere', icon: (a) => rect(4, 10, 56, 44, 7) + poly('14,24 22,32 14,40', a, 4.4) + line(28, 41, 44, 41, W, 4.4) },
  { id: 'split', label: 'Split editor', keys: '⌘\\', cmd: 'workbench.action.splitEditor', cat: 'view', when: 'anywhere', icon: (a) => rect(4, 10, 56, 44, 7) + line(32, 12, 32, 52, a) + textLines([11, 39], [24, 24], [14, 14], '#858585', 3) + textLines([11, 39], [33, 33], [10, 12], '#858585', 3) },
  { id: 'problems', label: 'Problems', keys: '⇧⌘M', cmd: 'workbench.actions.view.problems', cat: 'view', when: 'anywhere', icon: () => circ(20, 22, 15, RED) + line(14, 16, 26, 28, RED) + line(26, 16, 14, 28, RED) + pathS('M44 30 L60 58 H28 Z', '#cca700') + line(44, 40, 44, 47, '#cca700', 3.6) + circ(44, 53, 1.6, 'none', '#cca700', 0) },

  // row 4 — run & AI
  { id: 'debug', label: 'Debug', keys: 'F5', cmd: 'workbench.action.debug.start', cat: 'run', c: GREEN, when: 'anywhere', icon: () => pathS('M16 8 L54 32 L16 56 Z', GREEN, `${GREEN}40`, 4.6) },
  { id: 'step-over', label: 'Step over', keys: 'F10', cmd: 'workbench.action.debug.stepOver', cat: 'run', when: 'debugging', icon: (a) => pathS('M8 34 Q10 10 32 10 Q52 10 55 30', a) + poly('45,26 55,32 60,21', a) + circ(32, 50, 6.5, 'none', W, 0) },
  { id: 'restart', label: 'Restart', keys: '⇧⌘F5', cmd: 'workbench.action.debug.restart', cat: 'run', c: GREEN, when: 'debugging', icon: () => pathS('M50 20 A22 22 0 1 0 54 38', GREEN) + poly('38,19 51,19 51,6', GREEN) },
  { id: 'stop', label: 'Stop', keys: '⇧F5', cmd: 'workbench.action.debug.stop', cat: 'run', c: RED, when: 'debugging', icon: () => rect(12, 12, 40, 40, 6, RED, `${RED}40`, 4.6) },
  { id: 'breakpoint', label: 'Breakpoint', keys: 'F9', cmd: 'editor.debug.action.toggleBreakpoint', cat: 'run', c: RED, when: 'editor', icon: () => textLines([30], [14, 32, 50], [28, 28, 22], '#858585', 3.6) + circ(12, 32, 10, 'none', BP, 0) },
  { id: 'chat', label: 'Chat', keys: '⌃⌘I', cmd: 'workbench.action.chat.open', cat: 'run', when: 'anywhere', icon: (a) => pathS('M8 14 Q8 8 14 8 H50 Q56 8 56 14 V38 Q56 44 50 44 H26 L14 55 V44 Q8 44 8 38 Z') + spark(32, 26, 12, a) },
  { id: 'inline-chat', label: 'Inline chat', keys: '⌘I', cmd: 'inlineChat.start', cat: 'run', when: 'editor', icon: (a) => textLines([4], [10, 54], [40, 32], '#858585', 3.4) + rect(4, 21, 56, 22, 6, a) + spark(15, 32, 7, a) + line(26, 32, 50, 32, W, 3.4) },
  { id: 'claude', label: 'Claude Code', keys: '⌘esc', cmd: 'claude-vscode.focus / claude-vscode.blur (Claude Code extension)', cat: 'run', c: CLAUDE, when: 'anywhere', icon: () => claudeSpark(CLAUDE) },
];

function tile(k) {
  const a = k.c || C[k.cat];
  const bg = k.hero ? ['#26303d', '#1b2028', '#141619'] : ['#272727', '#1e1e1e', '#161616'];
  const labelSize = k.label.length > 11 ? 16 : 18;
  const tint = k.hero ? '#4c9df0' : a;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${tint}" stop-opacity="${k.hero ? 0.26 : 0.11}"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
<rect x="0" y="30" width="4.5" height="52" fill="${tint}"/>
<g transform="translate(40 14)" filter="url(#lift)">${k.icon(a)}</g>
<text x="72" y="106" font-family="${SANS}" font-size="${labelSize}" font-weight="700" fill="#f2f2f2" text-anchor="middle" filter="url(#lift)">${k.label}</text>
<text x="72" y="127" font-family="${MONO}" font-size="15" fill="${k.hero ? '#9cc9ff' : a}" stroke="${k.hero ? '#9cc9ff' : a}" stroke-width="0.45" text-anchor="middle">${k.keys}</text>
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
  id: k.id, label: k.label, keys: k.keys, action: k.cmd, when: k.when, category: k.cat,
})), null, 2));

// contact sheet: 8 x 4 grid of the real PNGs on a device-like plate
const S = 144, G = 22, P = 40;
const sheetW = P * 2 + 8 * S + 7 * G, sheetH = P * 2 + 4 * S + 3 * G;
const imgs = pngs.map((p, i) => {
  const x = P + (i % 8) * (S + G), y = P + Math.floor(i / 8) * (S + G);
  return `<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${S}" height="${S}" rx="18"/></clipPath><image x="${x}" y="${y}" width="${S}" height="${S}" clip-path="url(#c${i})" href="data:image/png;base64,${p.toString('base64')}"/>`;
}).join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0e0e10"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT}`);
