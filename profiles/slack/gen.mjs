// Generates Stream Deck XL key icons for Slack as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Slack's UI face is Lato; use it when installed, else SF Pro Rounded (resvg can't render SF Pro)
const home = process.env.HOME || '';
const lato = [`${home}/Library/Fonts`, '/Library/Fonts']
  .flatMap((d) => (fs.existsSync(d) ? fs.readdirSync(d).map((f) => path.join(d, f)) : []))
  .filter((f) => /Lato-(Bold|Black)\.ttf$/i.test(f));
const SANS = lato.length ? 'Lato' : '.SF NS Rounded';
const MONO = '.SF NS Mono';
const FONT = {
  fontFiles: [...lato, '/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSMono.ttf'].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: the four colours of Slack's mark
const C = {
  nav: '#36c5f0',  // blue   — navigate
  msg: '#2eb67d',  // green  — messaging
  read: '#ecb22e', // yellow — catch up
  you: '#e01e5a',  // red    — huddles & you
};
// shortcut text: the same hues, lifted so they read on aubergine
const T = { nav: '#5fd3f5', msg: '#4cd395', read: '#f3c451', you: '#ff5c8d' };
const W = '#ffffff';
const INK = '#1a0f1b';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const dot = (cx, cy, r, c) => circ(cx, cy, r, 'none', c, 0);
const plus = (cx, cy, r, c, w = sw) => line(cx - r, cy, cx + r, cy, c, w) + line(cx, cy - r, cx, cy + r, c, w);
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
// Slack's channel hash, slightly slanted like the wordmark's #
const hash = (cx, cy, s, c, w = sw) => line(cx - s * 0.2, cy - s, cx - s * 0.45, cy + s, c, w) + line(cx + s * 0.45, cy - s, cx + s * 0.2, cy + s, c, w) +
  line(cx - s, cy - s * 0.38, cx + s, cy - s * 0.38, c, w) + line(cx - s * 1.05, cy + s * 0.38, cx + s * 0.95, cy + s * 0.38, c, w);
const bubble = (x, y, w, h, c = W, fill = 'none', s = sw) => pathS(`M${x + 8} ${y} H${x + w - 8} Q${x + w} ${y} ${x + w} ${y + 8} V${y + h - 8} Q${x + w} ${y + h} ${x + w - 8} ${y + h} H${x + 16} L${x + 5} ${y + h + 9} V${y + h - 1} Q${x} ${y + h - 2} ${x} ${y + h - 9} V${y + 8} Q${x} ${y} ${x + 8} ${y} Z`, c, fill, s);
const lens = (cx, cy, r, c) => circ(cx, cy, r) + line(cx + r * 0.72, cy + r * 0.72, cx + r * 1.55, cy + r * 1.55, c, 6);
const person = (cx, cy, s, c = W) => circ(cx, cy - s * 0.55, s * 0.42, c) + pathS(`M${cx - s * 0.85} ${cy + s * 0.95} Q${cx - s * 0.85} ${cy + s * 0.2} ${cx} ${cy + s * 0.2} Q${cx + s * 0.85} ${cy + s * 0.2} ${cx + s * 0.85} ${cy + s * 0.95}`, c);
const face = (cx, cy, r, c = W) => circ(cx, cy, r, c) + dot(cx - r * 0.35, cy - r * 0.2, 2.6, c) + dot(cx + r * 0.35, cy - r * 0.2, 2.6, c) + pathS(`M${cx - r * 0.45} ${cy + r * 0.25} Q${cx} ${cy + r * 0.75} ${cx + r * 0.45} ${cy + r * 0.25}`, c, 'none', 3.6);
const check = (pts, c, w = 5) => poly(pts, c, w);

// Slack's mark: a blue petal in the top-left quadrant, rotated 90° for green, yellow, red
function slackMark() {
  const petal = (fill) => `<rect x="4" y="21" width="27" height="10" rx="5" fill="${fill}"/><path d="M31 19 H26 A5 5 0 0 1 21 14 A5 5 0 0 1 26 9 A5 5 0 0 1 31 14 Z" fill="${fill}"/>`;
  return [['#36c5f0', 0], ['#2eb67d', 90], ['#ecb22e', 180], ['#e01e5a', 270]]
    .map(([c, r]) => `<g transform="rotate(${r} 32 32)">${petal(c)}</g>`).join('');
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// src = where the binding lives in Slack 4.52 (menu id, global shortcut table id, or Keyboard Shortcuts sheet title)
const KEYS = [
  // row 1 — navigate
  { id: 'slack', label: 'Slack', keys: 'open app', src: 'launch / focus Slack.app', cat: 'nav', when: 'anywhere', hero: true, icon: () => slackMark() },
  { id: 'jump-to', label: 'Jump to', keys: '⌘K', src: 'SWITCH_TO_CHANNEL · Go ▸ Switch to Channel', cat: 'nav', when: 'anywhere', icon: (a) => rect(3, 12, 58, 40, 11) + hash(22, 32, 9, a, 3.8) + poly('39,24 47,32 39,40', W, 4.4) },
  { id: 'search', label: 'Search', keys: '⌘G', src: 'SEARCH · Edit ▸ Search', cat: 'nav', when: 'anywhere', icon: (a) => lens(27, 27, 17, a) + `<path d="M18 23 A10 10 0 0 1 26 16" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'back', label: 'Back', keys: '⌘[', src: 'Sheet: Back in history', cat: 'nav', when: 'anywhere', icon: (a) => arrow(32, 32, 'l', 44, a, 5) },
  { id: 'forward', label: 'Forward', keys: '⌘]', src: 'Sheet: Forward in history', cat: 'nav', when: 'anywhere', icon: (a) => arrow(32, 32, 'r', 44, a, 5) },
  { id: 'unreads', label: 'All unreads', keys: '⇧⌘A', src: 'ALL_UNREADS · Go ▸ All Unreads', cat: 'nav', when: 'anywhere', icon: (a) => line(6, 16, 40, 16) + line(6, 32, 34, 32) + line(6, 48, 40, 48) + dot(52, 16, 6.5, a) + dot(52, 32, 6.5, a) + circ(52, 48, 5, `${a}88`, 'none', 3) },
  { id: 'threads', label: 'Threads', keys: '⇧⌘T', src: 'THREADS · Go ▸ Threads', cat: 'nav', when: 'anywhere', icon: (a) => bubble(4, 5, 38, 26) + bubble(24, 27, 36, 22, a, INK) + line(32, 38, 51, 38, a, 3.4) },
  { id: 'activity', label: 'Activity', keys: '⇧⌘M', src: 'MENTIONS_REACTIONS · Go ▸ Activity', cat: 'nav', when: 'anywhere', icon: (a) => pathS('M32 7 Q15 7 15 26 V38 L9 47 H55 L49 38 V26 Q49 7 32 7 Z') + pathS('M25 53 Q32 60 39 53', W) + dot(50, 12, 7, a) },

  // row 2 — messaging
  { id: 'new-message', label: 'New message', keys: '⌘N', src: 'NEW_MESSAGE · File ▸ New Message', cat: 'msg', when: 'anywhere', icon: (a) => pathS('M30 8 H14 Q7 8 7 15 V50 Q7 57 14 57 H49 Q56 57 56 50 V34') + pathS('M26 40 L28 30 L50 8 L58 16 L36 38 Z', a) },
  { id: 'dms', label: 'DMs', keys: '⇧⌘K', src: 'ALL_DMS · Go ▸ Direct messages', cat: 'msg', when: 'anywhere', icon: (a) => bubble(4, 6, 38, 28, a) + bubble(22, 22, 38, 26, W, INK).replace('L27', 'L27') },
  { id: 'channels', label: 'Channels', keys: '⇧⌘L', src: 'CHANNEL_BROWSER · Go ▸ Channel Browser', cat: 'msg', when: 'anywhere', icon: (a) => hash(32, 32, 22, a, 5) },
  { id: 'directory', label: 'Directory', keys: '⇧⌘E', src: 'PEOPLE_USER_GROUPS · Go ▸ People & User Groups', cat: 'msg', when: 'anywhere', icon: (a) => person(22, 30, 18) + person(44, 32, 15, a) },
  { id: 'channel-info', label: 'Channel info', keys: '⇧⌘I', src: 'CHANNEL_DETAILS · Sheet: Channel Info', cat: 'msg', when: 'anywhere', icon: (a) => circ(32, 32, 25) + dot(32, 19, 3.6, a) + line(32, 29, 32, 46, a, 5) },
  { id: 'react', label: 'React', keys: '⇧⌘\\', src: 'Sheet: React to last message (or message with focus)', cat: 'msg', when: 'anywhere', icon: (a) => face(27, 34, 22) + `<circle cx="51" cy="13" r="10" fill="${INK}"/>` + plus(51, 13, 7, a, 4.4) },
  { id: 'find', label: 'Find', keys: '⌘F', src: 'FIND · Sheet: Search current conversation', cat: 'msg', when: 'anywhere', icon: (a) => line(6, 10, 44, 10, '#ffffff99', 3.4) + line(6, 22, 26, 22, '#ffffff99', 3.4) + line(6, 34, 20, 34, '#ffffff99', 3.4) + lens(38, 36, 12, a) },
  { id: 'add-file', label: 'Add a file', keys: '⌘O', src: 'Sheet: Add a file', cat: 'msg', when: 'anywhere', icon: (a) => pathS('M10 6 H34 L48 20 V58 H10 Z') + poly('34,6 34,20 48,20', W, 3) + `<circle cx="48" cy="48" r="12" fill="${INK}"/>` + plus(48, 48, 8, a, 4.6) },

  // row 3 — catch up
  { id: 'mark-read', label: 'Mark read', keys: 'esc', src: 'MARK_ALL_AS_READ · Sheet: Mark all messages in current channel as read', cat: 'read', when: 'channel', icon: (a) => circ(32, 32, 25) + check('20,33 29,42 45,23', a) },
  { id: 'mark-all-read', label: 'Mark all read', keys: '⇧esc', src: 'Sheet: Mark all messages as read', cat: 'read', when: 'anywhere', icon: (a) => check('4,32 16,44 38,18', W) + check('28,40 32,44 58,18', a) },
  { id: 'prev-unread', label: 'Prev unread', keys: '⌥⇧↑', src: 'Sheet: Previous unread channel or DM', cat: 'read', when: 'anywhere', icon: (a) => arrow(24, 32, 'u', 44, a, 5) + dot(48, 20, 7, a) + line(42, 40, 56, 40, W, 3.4) + line(42, 50, 52, 50, W, 3.4) },
  { id: 'next-unread', label: 'Next unread', keys: '⌥⇧↓', src: 'Sheet: Next unread channel or DM', cat: 'read', when: 'anywhere', icon: (a) => arrow(24, 32, 'd', 44, a, 5) + dot(48, 44, 7, a) + line(42, 14, 56, 14, W, 3.4) + line(42, 24, 52, 24, W, 3.4) },
  { id: 'prev-channel', label: 'Prev channel', keys: '⌥↑', src: 'Sheet: Previous channel or DM', cat: 'read', when: 'anywhere', icon: (a) => arrow(20, 32, 'u', 44, a, 5) + hash(46, 32, 11, W, 3.6) },
  { id: 'next-channel', label: 'Next channel', keys: '⌥↓', src: 'Sheet: Next channel or DM', cat: 'read', when: 'anywhere', icon: (a) => arrow(20, 32, 'd', 44, a, 5) + hash(46, 32, 11, W, 3.6) },
  { id: 'close-pane', label: 'Close pane', keys: '⌘.', src: 'CLOSE_SECONDARY_VIEW · Sheet: Close item details', cat: 'read', when: 'anywhere', icon: (a) => rect(4, 10, 56, 44, 8) + line(36, 12, 36, 52) + line(43, 26, 53, 36, a, 4.4) + line(53, 26, 43, 36, a, 4.4) },
  { id: 'sidebar', label: 'Sidebar', keys: '⇧⌘D', src: 'TOGGLE_SIDEBAR · View ▸ Hide Sidebar', cat: 'read', when: 'anywhere', icon: (a) => rect(4, 10, 56, 44, 8) + `<rect x="6" y="12" width="18" height="40" rx="6" fill="${a}" fill-opacity="0.45"/>` + line(25, 12, 25, 52) },

  // row 4 — huddles & you
  { id: 'huddle', label: 'Huddle', keys: '⇧⌘H', src: 'HUDDLE_ACTION · Sheet: Toggle huddles start / stop', cat: 'you', when: 'channel', icon: (a) => pathS('M9 40 V32 Q9 9 32 9 Q55 9 55 32 V40') + rect(5, 36, 13, 21, 6, a, `${a}55`) + rect(46, 36, 13, 21, 6, a, `${a}55`) },
  { id: 'mute', label: 'Mute', keys: '⇧⌘Space', src: 'Sheet: Toggle huddles mute / unmute', cat: 'you', when: 'huddle', icon: (a) => rect(24, 6, 16, 30, 8) + pathS('M14 30 A18 18 0 0 0 50 30') + line(32, 48, 32, 56) + line(24, 56, 40, 56) + line(12, 8, 52, 52, a, 4.8) },
  { id: 'status', label: 'Set status', keys: '⇧⌘Y', src: 'Sheet: Set a status', cat: 'you', when: 'anywhere', icon: (a) => person(28, 30, 22) + `<circle cx="50" cy="48" r="10" fill="${INK}"/>` + dot(50, 48, 7, '#2eb67d') + circ(50, 48, 7, a, 'none', 0) },
  { id: 'canvas', label: 'New canvas', keys: '⇧⌘N', src: 'NEW_CANVAS · File ▸ New Canvas', cat: 'you', when: 'anywhere', icon: (a) => rect(8, 5, 44, 54, 8) + line(17, 18, 43, 18, a, 4.4) + line(17, 30, 43, 30, W, 3.4) + line(17, 40, 37, 40, W, 3.4) + line(17, 50, 31, 50, W, 3.4) },
  { id: 'downloads', label: 'Downloads', keys: '⇧⌘J', src: 'DOWNLOADS · File ▸ Downloads', cat: 'you', when: 'anywhere', icon: (a) => arrow(32, 24, 'd', 34, a, 5) + pathS('M8 40 V50 Q8 56 14 56 H50 Q56 56 56 50 V40') },
  { id: 'workspaces', label: 'Workspaces', keys: '⇧⌘S', src: 'Sheet: Open workspace switcher', cat: 'you', when: 'anywhere', icon: (a) => rect(6, 6, 22, 22, 6, a, `${a}55`) + rect(36, 6, 22, 22, 6) + rect(6, 36, 22, 22, 6) + rect(36, 36, 22, 22, 6) },
  { id: 'preferences', label: 'Preferences', keys: '⌘,', src: 'PREFERENCES · Slack ▸ Preferences…', cat: 'you', when: 'anywhere', icon: (a) => gear(32, 32, 25, 19, 8) + circ(32, 32, 7.5, a) },
  { id: 'shortcuts', label: 'Shortcuts', keys: '⌘/', src: 'Global table: mod+/ → toggleKeyboardShortcuts', cat: 'you', when: 'anywhere', icon: (a) => rect(8, 8, 48, 48, 10) + rect(15, 13, 34, 34, 6, W, 'none', 2) + `<text x="32" y="40" font-family="${MONO}" font-size="26" fill="${a}" stroke="${a}" stroke-width="0.8" text-anchor="middle">⌘</text>` },
];

function tile(k) {
  const a = k.c || C[k.cat];
  const bg = k.hero ? ['#4f1c51', '#351437', '#1f0c20'] : ['#3a1c3c', '#27132a', '#190c1a'];
  const labelSize = k.label.length > 11 ? 15.5 : 17.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#ffffff' : a}" stop-opacity="${k.hero ? 0.1 : 0.14}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${k.hero ? '' : `<g opacity="0.5">${hash(16, 14, 5, a, 1.8)}</g>`}
<g transform="translate(40 14)" filter="url(#lift)">${k.icon(a)}</g>
<text x="72" y="106" font-family="${SANS}" font-size="${labelSize}" font-weight="700" fill="${W}" stroke="${W}" stroke-width="${lato.length ? 0 : 0.6}" text-anchor="middle" filter="url(#lift)">${k.label}</text>
<text x="72" y="127" font-family="${MONO}" font-size="15" fill="${k.hero ? '#e8c9ea' : T[k.cat]}" stroke="${k.hero ? '#e8c9ea' : T[k.cat]}" stroke-width="0.45" text-anchor="middle">${k.keys}</text>
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
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#120a13"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT} (labels in ${SANS})`);
