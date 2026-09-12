// Generates Stream Deck XL key icons for Microsoft Outlook as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitLabel, HERO_GLYPH } from '../../tools/tile.mjs';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Family names as stored in the fonts' name tables. resvg can't render SF Pro (SFNS.ttf),
// so labels use SF Pro Rounded — close to Fluent's soft, rounded feel (as in the Teams deck).
const SANS = '.SF NS Rounded';
const MONO = '.SF NS Mono';
const FONT = {
  fontFiles: ['/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSMono.ttf'].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: the sky-to-indigo layers of Outlook's envelope
const C = {
  go: '#6cd0fa',   // sky      — go to
  mail: '#4d9bf7', // blue     — compose
  tri: '#8a7ff8',  // indigo   — triage
  cal: '#b9a8ff',  // lavender — calendar & view
};
const RED = '#ff5c6c', AMBER = '#ffb347', FLAG = '#ff5c6c', GREEN = '#6bd68b';
const W = '#ffffff';
const INK = '#141824';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const dot = (cx, cy, r, c) => circ(cx, cy, r, 'none', c, 0);
const plus = (cx, cy, r, c, w = sw) => line(cx - r, cy, cx + r, cy, c, w) + line(cx, cy - r, cx, cy + r, c, w);
const badge = (cx, cy, r = 11) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/>`;
function arrow(cx, cy, dir, len, c = W, w = sw) {
  const h = len / 2, k = 6.5;
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
const envelope = (x, y, w, h, c = W, flap = c) => rect(x, y, w, h, 6, c) + poly(`${x + 3},${y + 5} ${x + w / 2},${y + h * 0.55} ${x + w - 3},${y + 5}`, flap, 3.8);
const openEnvelope = (c = W, a = c) => pathS('M6 28 L32 10 L58 28 V54 Q58 58 54 58 H10 Q6 58 6 54 Z', c) + poly('8,30 32,46 56,30', a, 3.8);
// calendar with header band; body(x, y, w, h) draws inside the grid area
const calendar = (a, body = '') => rect(6, 9, 52, 49, 8) + `<path d="M8 11 H56 V22 H8 Z" fill="${a}" fill-opacity="0.35"/>` + line(6, 22, 58, 22, W, 3) + line(19, 4, 19, 13, W, 4.2) + line(45, 4, 45, 13, W, 4.2) + body;
const person = (cx, cy, s, c = W) => circ(cx, cy - s * 0.55, s * 0.42, c) + pathS(`M${cx - s * 0.85} ${cy + s * 0.95} Q${cx - s * 0.85} ${cy + s * 0.2} ${cx} ${cy + s * 0.2} Q${cx + s * 0.85} ${cy + s * 0.2} ${cx + s * 0.85} ${cy + s * 0.95}`, c);
const folder = (c = W) => pathS('M5 16 Q5 10 11 10 H24 L29 16 H53 Q59 16 59 22 V50 Q59 56 53 56 H11 Q5 56 5 50 Z', c);
const plane = (c, fill = 'none') => pathS('M6 30 L58 8 L44 56 L31 38 Z', c, fill) + line(31, 38, 58, 8, c, 3.4);
// curved reply arrows (Fluent style)
const replyArrow = (x, c = W) => pathS(`M${x + 44} 50 Q${x + 44} 26 ${x + 16} 26`, c) + poly(`${x + 25},16 ${x + 14},26 ${x + 25},36`, c);
const forwardArrow = (c = W) => pathS('M12 50 Q12 26 40 26', c) + poly('31,16 42,26 31,36', c);
const trash = (c = W) => line(8, 15, 56, 15, c) + pathS('M24 15 V10 Q24 7 27 7 H37 Q40 7 40 10 V15', c) + pathS('M13 15 L16 53 Q16.5 57 21 57 H43 Q47.5 57 48 53 L51 15', c) + line(27, 25, 27, 47, c, 3.4) + line(37, 25, 37, 47, c, 3.4);
const flag = (c) => line(12, 6, 12, 58, c, 4.6) + pathS('M12 9 H52 L44 22 L52 35 H12', c, `${c}55`);
// Outlook's mark: layered envelope with the O plate
function outlookMark() {
  return `<path d="M10 24 L34 8 Q37 6 40 8 L62 22 V52 Q62 58 56 58 H16 Q10 58 10 52 Z" fill="url(#ob)"/>` +
    `<path d="M22 14 L34 7 Q37 5.5 40 7 L62 21 V30 L48 40 Z" fill="url(#os)" opacity="0.95"/>` +
    `<path d="M10 26 L40 46 L62 30 V52 Q62 58 56 58 H16 Q10 58 10 52 Z" fill="url(#of)"/>` +
    `<rect x="0" y="22" width="32" height="32" rx="7" fill="url(#op)"/>` +
    `<ellipse cx="16" cy="38" rx="8" ry="9" fill="none" stroke="#fff" stroke-width="5"/>`;
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// src = menu path in Outlook 16.112 (from its Base.lproj nibs); when = where it works
const KEYS = [
  // row 1 — go to
  { id: 'outlook', label: 'Outlook', keys: 'main', src: 'Switch Profile → Main', cat: 'go', when: 'anywhere', hero: true, icon: () => outlookMark() },
  { id: 'mail', label: 'Mail', keys: '⌘1', src: 'Go To ▸ Mail · ViewMenus.nib', cat: 'go', when: 'anywhere', icon: (a) => envelope(4, 12, 56, 40, W, a) },
  { id: 'calendar', label: 'Calendar', keys: '⌘2', src: 'Go To ▸ Calendar · ViewMenus.nib', cat: 'go', when: 'anywhere', icon: (a) => calendar(a, [[18, 32], [32, 32], [46, 32], [18, 45], [32, 45]].map(([x, y]) => dot(x, y, 3.2, W)).join('') + dot(46, 45, 4, a)) },
  { id: 'people', label: 'People', keys: '⌘3', src: 'Go To ▸ People · ViewMenus.nib', cat: 'go', when: 'anywhere', icon: (a) => person(24, 30, 19) + person(46, 33, 15, a) },
  { id: 'tasks', label: 'Tasks', keys: '⌘4', src: 'Go To ▸ Tasks · ViewMenus.nib', cat: 'go', when: 'anywhere', icon: (a) => rect(5, 8, 15, 15, 4, a, `${a}40`, 3.4) + poly('8.5,15.5 11.5,18.5 16.5,12.5', W, 3) + line(27, 15.5, 58, 15.5) + rect(5, 30, 15, 15, 4, W, 'none', 3.4) + line(27, 37.5, 58, 37.5) + line(27, 54, 48, 54, '#ffffff88', 3.4) },
  { id: 'search', label: 'Search', keys: '⇧⌘F', src: 'Find ▸ Outlook Items Search · OutlookApp.nib', cat: 'go', when: 'anywhere', icon: (a) => circ(27, 27, 17) + line(39, 39, 54, 54, a, 6.5) + `<path d="M18 23 A10 10 0 0 1 26 16" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'go-to-folder', label: 'Go to folder', keys: '⌃G', src: 'Folder ▸ Go to Folder… · OutlookApp.nib', cat: 'go', when: 'mail', icon: (a) => folder() + badge(44, 42, 15) + circ(42, 40, 8, a, 'none', 3.8) + line(48, 46, 55, 53, a, 4.6) },
  { id: 'sync', label: 'Sync', keys: '⌃⌘K', src: 'Tools ▸ Send & Receive · OutlookApp.nib', cat: 'go', when: 'anywhere', icon: (a) => pathS('M52 26 A21 21 0 0 0 13 22', a) + poly('52,12 52,26 38,26', a) + pathS('M12 38 A21 21 0 0 0 51 42', W) + poly('12,52 12,38 26,38', W) },

  // row 2 — compose
  { id: 'new-email', label: 'New email', keys: '⌘N', src: 'New ▸ Email · OutlookApp.nib', cat: 'mail', when: 'anywhere', icon: (a) => envelope(4, 14, 46, 34) + badge(50, 46, 13) + plus(50, 46, 8, a, 4.6) },
  { id: 'reply', label: 'Reply', keys: '⌘R', src: 'Message ▸ Reply · DocumentMenus.nib', cat: 'mail', when: 'mail', icon: (a) => replyArrow(4, a) },
  { id: 'reply-all', label: 'Reply all', keys: '⇧⌘R', src: 'Message ▸ Reply All · DocumentMenus.nib', cat: 'mail', when: 'mail', icon: (a) => replyArrow(10, a) + poly('17,16 6,26 17,36', W) },
  { id: 'forward', label: 'Forward', keys: '⌘J', src: 'Message ▸ Forward · DocumentMenus.nib', cat: 'mail', when: 'mail', icon: (a) => forwardArrow(a) },
  { id: 'send', label: 'Send', keys: '⌘↩', src: 'Draft ▸ Send · DocumentMenus.nib', cat: 'mail', when: 'compose', icon: (a) => plane(a, `${a}40`) },
  { id: 'discard', label: 'Discard', keys: '⌘esc', src: 'Draft ▸ Discard · DocumentMenus.nib', cat: 'mail', when: 'compose', icon: () => pathS('M12 6 H38 L50 18 V58 H12 Z') + poly('38,6 38,18 50,18', W, 3) + badge(46, 46, 13) + line(40, 40, 52, 52, RED, 4.6) + line(52, 40, 40, 52, RED, 4.6) },
  { id: 'undo-send', label: 'Undo send', keys: '⌥⌘↩', src: 'Edit ▸ Undo Send · OutlookApp.nib', cat: 'mail', when: 'mail', icon: (a) => `<g transform="translate(18 0) scale(0.7)">${plane(W)}</g>` + pathS('M44 52 Q44 34 22 34', a) + poly('30,25 20,34 30,43', a) },
  { id: 'react', label: 'React', keys: '⌃⌘R', src: 'Message ▸ React · DocumentMenus.nib', cat: 'mail', when: 'mail', icon: (a) => circ(28, 34, 22) + dot(21, 29, 2.8, W) + dot(35, 29, 2.8, W) + pathS('M19 39 Q28 48 37 39', W, 'none', 3.6) + badge(51, 13, 10) + plus(51, 13, 7, a, 4.4) },

  // row 3 — triage
  { id: 'archive', label: 'Archive', keys: '⌃E', src: 'Message ▸ Archive · DocumentMenus.nib', cat: 'tri', when: 'mail', icon: (a) => rect(4, 8, 56, 14, 4) + pathS('M9 22 V52 Q9 57 14 57 H50 Q55 57 55 52 V22') + line(25, 35, 39, 35, a, 4.6) },
  { id: 'delete', label: 'Delete', keys: '⌘⌫', src: 'Edit ▸ Delete · OutlookApp.nib', cat: 'tri', c: RED, when: 'mail', icon: () => trash(RED) },
  { id: 'move', label: 'Move', keys: '⇧⌘M', src: 'Move ▸ Choose Folder… · DocumentMenus.nib', cat: 'tri', when: 'mail', icon: (a) => folder() + arrow(32, 36, 'r', 24, a) },
  { id: 'mark-read', label: 'Mark read', keys: '⌘T', src: 'Message ▸ Mark as Read · DocumentMenus.nib', cat: 'tri', when: 'mail', icon: (a) => openEnvelope(W, a) },
  { id: 'mark-unread', label: 'Mark unread', keys: '⇧⌘T', src: 'Message ▸ Mark as Unread · DocumentMenus.nib', cat: 'tri', when: 'mail', icon: (a) => envelope(4, 14, 50, 36) + badge(52, 14, 11) + dot(52, 14, 7.5, a) },
  { id: 'flag', label: 'Flag', keys: '⌃1', src: 'To Do ▸ Today · SetToDoMenu.nib', cat: 'tri', c: FLAG, when: 'mail', icon: () => flag(FLAG) },
  { id: 'pin', label: 'Pin', keys: '⌃P', src: 'Message ▸ Pin · DocumentMenus.nib', cat: 'tri', when: 'mail', icon: (a) => `<g transform="rotate(40 32 32)">${pathS('M22 8 H42 L39 13 V26 L46 34 H18 L25 26 V13 Z', a, `${a}40`)}${line(32, 34, 32, 56, W)}</g>` },
  { id: 'junk', label: 'Junk', keys: '⇧⌘J', src: 'Junk Mail ▸ Mark as Junk · DocumentMenus.nib', cat: 'tri', c: AMBER, when: 'mail', icon: () => pathS('M32 5 L55 13 V30 Q55 48 32 59 Q9 48 9 30 V13 Z', AMBER) + line(23, 23, 41, 41, AMBER, 4.6) + line(41, 23, 23, 41, AMBER, 4.6) },

  // row 4 — calendar & view
  { id: 'today', label: 'Today', keys: '⌘T', src: 'View ▸ Today · ViewMenus.nib', cat: 'cal', when: 'calendar', icon: (a) => calendar(a, circ(32, 40, 10, a, `${a}40`, 3.6)) },
  { id: 'day', label: 'Day', keys: '⌃⌘1', src: 'View ▸ Day · ViewMenus.nib', cat: 'cal', when: 'calendar', icon: (a) => calendar(a, `<rect x="16" y="29" width="32" height="8" rx="3" fill="${a}"/>` + line(16, 46, 40, 46, W, 3.4)) },
  { id: 'work-week', label: 'Work week', keys: '⌃⌘2', src: 'View ▸ Work Week · ViewMenus.nib', cat: 'cal', when: 'calendar', icon: (a) => calendar(a, [13, 21, 29, 37, 45].map((x, i) => `<rect x="${x}" y="${i % 2 ? 36 : 29}" width="6" height="${i % 2 ? 14 : 12}" rx="2" fill="${i === 2 ? a : '#ffffffaa'}"/>`).join('')) },
  { id: 'month', label: 'Month', keys: '⌃⌘4', src: 'View ▸ Month · ViewMenus.nib', cat: 'cal', when: 'calendar', icon: (a) => calendar(a, [0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => dot(15 + c * 11.3, 31 + r * 9, 2.6, r === 1 && c === 2 ? a : W))).join('')) },
  { id: 'previous', label: 'Previous', keys: '⌥⌘←', src: 'View ▸ Previous · ViewMenus.nib', cat: 'cal', when: 'calendar', icon: (a) => poly('38,12 18,32 38,52', a, 5.5) },
  { id: 'next', label: 'Next', keys: '⌥⌘→', src: 'View ▸ Next · ViewMenus.nib', cat: 'cal', when: 'calendar', icon: (a) => poly('26,12 46,32 26,52', a, 5.5) },
  { id: 'reading-pane', label: 'Reading pane', keys: '⌘\\', src: 'View ▸ Reading Pane ▸ Right · ViewMenus.nib', cat: 'cal', when: 'mail', icon: (a) => rect(4, 10, 56, 44, 7) + `<rect x="34" y="12" width="24" height="40" rx="5" fill="${a}" fill-opacity="0.45"/>` + line(33, 12, 33, 52) + line(11, 22, 26, 22, '#ffffffaa', 3.2) + line(11, 32, 26, 32, '#ffffffaa', 3.2) + line(11, 42, 22, 42, '#ffffffaa', 3.2) },
  { id: 'sidebar', label: 'Sidebar', keys: '⇧⌘[', src: 'View ▸ Sidebar · ViewMenus.nib', cat: 'cal', when: 'anywhere', icon: (a) => rect(4, 10, 56, 44, 7) + `<rect x="6" y="12" width="18" height="40" rx="5" fill="${a}" fill-opacity="0.45"/>` + line(25, 12, 25, 52) },
];

function tile(k) {
  const a = k.c || C[k.cat];
  const bg = k.hero ? ['#26315a', '#1b2240', '#12162a'] : ['#232a3c', '#191e2d', '#11141e'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#5aa9ff' : a}" stop-opacity="${k.hero ? 0.3 : 0.13}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="ob" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f86e8"/><stop offset="1" stop-color="#2c4fc4"/></linearGradient>
  <linearGradient id="os" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fd3fb"/><stop offset="0.5" stop-color="#6f8cf4"/><stop offset="1" stop-color="#4b3fd1"/></linearGradient>
  <linearGradient id="of" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6ccbf8"/><stop offset="1" stop-color="#3a7ee6"/></linearGradient>
  <linearGradient id="op" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4d8cf0"/><stop offset="1" stop-color="#2447b8"/></linearGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${k.hero ? '' : poly('61,5 72,11 83,5', a, 2.6).replace('/>', ' opacity="0.8"/>')}
<g transform="${k.hero ? HERO_GLYPH : 'translate(40 16)'}" filter="url(#lift)">${k.icon(a)}</g>
${k.hero ? '' : fitLabel(k.label, { family: SANS, weight: 400, font: FONT }, { glyphBottom: 80 }).map((l) => `<text x="72" y="${l.y}" font-family="${SANS}" font-size="${l.size}" fill="${W}" stroke="${W}" stroke-width="0.6" text-anchor="middle" filter="url(#lift)">${l.text}</text>`).join('\n')}
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
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0d0f16"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT}`);
