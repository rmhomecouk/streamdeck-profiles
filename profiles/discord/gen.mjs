// Generates Stream Deck XL key icons for Discord as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Discord's UI face is gg sans, which isn't installed; SF Pro Rounded is the closest (resvg can't render SF Pro)
const SANS = '.SF NS Rounded';
const MONO = '.SF NS Mono';
const FONT = {
  fontFiles: ['/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSMono.ttf'],
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: Discord's own colour tokens — blurple (BRAND_500) and the three presence colours
const C = {
  nav: '#5865f2',  // BRAND_500  — navigate
  read: '#f0b232', // YELLOW_300 (idle) — catch up
  chat: '#23a55a', // GREEN_360 (online) — chat
  voice: '#f23f43', // RED_400 (do not disturb) — voice & more
};
// shortcut text: the same hues, lifted so they read on Discord's dark greys (BRAND_360, GREEN_300)
const T = { nav: '#949cf7', read: '#f6c65a', chat: '#3bd67f', voice: '#ff6b6e' };
const W = '#ffffff';
const INK = '#1a1b1e'; // PRIMARY_730

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
// text-channel hash, slanted like Discord's channel icon
const hash = (cx, cy, s, c, w = sw) => line(cx - s * 0.2, cy - s, cx - s * 0.45, cy + s, c, w) + line(cx + s * 0.45, cy - s, cx + s * 0.2, cy + s, c, w) +
  line(cx - s, cy - s * 0.38, cx + s, cy - s * 0.38, c, w) + line(cx - s * 1.05, cy + s * 0.38, cx + s * 0.95, cy + s * 0.38, c, w);
const lens = (cx, cy, r, c) => circ(cx, cy, r) + line(cx + r * 0.72, cy + r * 0.72, cx + r * 1.55, cy + r * 1.55, c, 6);
const person = (cx, cy, s, c = W) => circ(cx, cy - s * 0.55, s * 0.42, c) + pathS(`M${cx - s * 0.85} ${cy + s * 0.95} Q${cx - s * 0.85} ${cy + s * 0.2} ${cx} ${cy + s * 0.2} Q${cx + s * 0.85} ${cy + s * 0.2} ${cx + s * 0.85} ${cy + s * 0.95}`, c);
const face = (cx, cy, r, c = W) => circ(cx, cy, r, c) + dot(cx - r * 0.35, cy - r * 0.2, 2.6, c) + dot(cx + r * 0.35, cy - r * 0.2, 2.6, c) + pathS(`M${cx - r * 0.45} ${cy + r * 0.25} Q${cx} ${cy + r * 0.75} ${cx + r * 0.45} ${cy + r * 0.25}`, c, 'none', 3.6);
const check = (pts, c, w = 5) => poly(pts, c, w);
// a server icon in the rail: Discord's rounded square ("squircle")
const server = (x, y, s, c = W, fill = 'none', w = sw) => rect(x, y, s, s, s * 0.34, c, fill, w);
const mic = (c = W) => rect(24, 6, 16, 30, 8, c) + pathS('M14 30 A18 18 0 0 0 50 30', c) + line(32, 48, 32, 56, c) + line(24, 56, 40, 56, c);
const phone = (c, fill = 'none') => pathS('M16 8 Q9 9 8 17 Q9 36 25 50 Q40 60 49 55 Q55 52 55 47 L55 43 Q55 40 52 39 L44 36 Q41 35 39 38 L36 42 Q26 37 21 27 L25 24 Q28 22 27 19 L24 11 Q23 8 20 8 Z', c, fill);
const speaker = (c = W) => pathS('M6 24 H16 L30 12 V52 L16 40 H6 Z', c);
const badge = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="${INK}"/>`;

// Discord's Clyde mark, from the app's own ClydeIcon (24-unit viewBox), filled with the icon's blurple gradient
const CLYDE = 'M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.21.4-.4.8-.58 1.21-1.69-.25-3.4-.25-5.1 0-.18-.41-.37-.82-.59-1.2-1.6.27-3.14.75-4.6 1.43A19.04 19.04 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98-.65-.25-1.29-.55-1.9-.92.17-.12.32-.24.47-.37 3.58 1.7 7.7 1.7 11.28 0l.46.37c-.6.36-1.25.67-1.9.92.35.7.75 1.35 1.2 1.98 2.03-.63 3.94-1.6 5.64-2.87.47-4.87-.78-9.09-3.3-12.83ZM8.3 15.12c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.89 2.27-2 2.27Zm7.4 0c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.88 2.27-2 2.27Z';
const clyde = () => `<defs><linearGradient id="cly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a90f7"/><stop offset="1" stop-color="#4148b8"/></linearGradient></defs>
<path d="${CLYDE}" transform="translate(-2 -4) scale(2.84)" fill="url(#cly)"/>`;

// the corner flourish: each row wears one of Discord's status indicators, cut out of the tile like on an avatar
function status(cat, a) {
  const cx = 18, cy = 18, r = 6.5;
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r + 2.6}" fill="#000" fill-opacity="0.35"/>`;
  if (cat === 'read') return ring + `<mask id="moon"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><circle cx="${cx - 3.6}" cy="${cy - 3.6}" r="${r * 0.62}" fill="#000"/></mask><circle cx="${cx}" cy="${cy}" r="${r}" fill="${a}" mask="url(#moon)"/>`;
  if (cat === 'voice') return ring + dot(cx, cy, r, a) + `<rect x="${cx - 3.6}" y="${cy - 1.2}" width="7.2" height="2.4" rx="1.2" fill="#1a1b1e"/>`;
  if (cat === 'chat') return ring + dot(cx, cy, r, a);
  return ring + circ(cx, cy, r - 1.3, a, 'none', 2.6);
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// src = the keybind action id in Discord's web client (build 609489), or the native menu item
const KEYS = [
  // row 1 — navigate
  { id: 'discord', label: 'Discord', keys: 'main', src: 'Switch Profile → Main', cat: 'nav', when: 'anywhere', hero: true, icon: () => clyde() },
  { id: 'quick-switcher', label: 'Quick switcher', keys: '⌘K', src: 'QUICKSWITCHER_SHOW · mod+k', cat: 'nav', when: 'anywhere', icon: (a) => rect(3, 12, 58, 40, 11) + circ(20, 31, 7, a, 'none', 3.8) + line(25, 36, 29, 40, a, 3.8) + line(35, 26, 51, 26, W, 3.4) + line(35, 36, 46, 36, W, 3.4) },
  { id: 'search', label: 'Search', keys: '⌘F', src: 'FOCUS_SEARCH · mod+f', cat: 'nav', when: 'anywhere', icon: (a) => lens(27, 27, 17, a) + `<path d="M18 23 A10 10 0 0 1 26 16" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'back', label: 'Back', keys: '⌘[', src: 'NAVIGATE_BACK · mod+[ (Mac)', cat: 'nav', when: 'anywhere', icon: (a) => arrow(32, 32, 'l', 44, a, 5) },
  { id: 'forward', label: 'Forward', keys: '⌘]', src: 'NAVIGATE_FORWARD · mod+] (Mac)', cat: 'nav', when: 'anywhere', icon: (a) => arrow(32, 32, 'r', 44, a, 5) },
  { id: 'prev-server', label: 'Prev server', keys: '⌥⌘↑', src: 'SERVER_PREV · mod+alt+up', cat: 'nav', when: 'anywhere', icon: (a) => arrow(13, 32, 'u', 42, a, 5) + server(32, 3, 19, a, `${a}66`) + server(32, 27, 19) + server(32, 51, 11, '#ffffff66', 'none', 3) },
  { id: 'next-server', label: 'Next server', keys: '⌥⌘↓', src: 'SERVER_NEXT · mod+alt+down', cat: 'nav', when: 'anywhere', icon: (a) => arrow(13, 32, 'd', 42, a, 5) + server(36, 2, 11, '#ffffff66', 'none', 3) + server(32, 18, 19) + server(32, 42, 19, a, `${a}66`) },
  { id: 'dms-toggle', label: 'DMs / server', keys: '⌥⌘→', src: 'TOGGLE_PREVIOUS_GUILD · mod+alt+right', cat: 'nav', when: 'anywhere', icon: (a) => pathS('M8 6 H30 Q36 6 36 12 V24 Q36 30 30 30 H16 L8 37 V12 Q8 6 14 6 Z', W) + server(30, 30, 28, a, `${a}55`) + poly('13,46 7,52 13,58', a, 3.4) + pathS('M8 52 H18 Q24 52 24 46 V42', a, 'none', 3.4) },

  // row 2 — catch up
  { id: 'prev-channel', label: 'Prev channel', keys: '⌥↑', src: 'CHANNEL_PREV · alt+up', cat: 'read', when: 'anywhere', icon: (a) => arrow(18, 32, 'u', 44, a, 5) + hash(45, 32, 12, W, 3.8) },
  { id: 'next-channel', label: 'Next channel', keys: '⌥↓', src: 'CHANNEL_NEXT · alt+down', cat: 'read', when: 'anywhere', icon: (a) => arrow(18, 32, 'd', 44, a, 5) + hash(45, 32, 12, W, 3.8) },
  // Discord marks an unread channel with a small white pill at the left edge of the sidebar
  { id: 'prev-unread', label: 'Prev unread', keys: '⌥⇧↑', src: 'UNREAD_PREV · alt+shift+up', cat: 'read', when: 'anywhere', icon: (a) => arrow(16, 32, 'u', 44, a, 5) + `<rect x="32" y="9" width="5" height="14" rx="2.5" fill="${W}"/>` + line(44, 16, 58, 16, W, 4) + line(44, 34, 56, 34, '#ffffff77', 3.4) + line(44, 48, 54, 48, '#ffffff77', 3.4) },
  { id: 'next-unread', label: 'Next unread', keys: '⌥⇧↓', src: 'UNREAD_NEXT · alt+shift+down', cat: 'read', when: 'anywhere', icon: (a) => arrow(16, 32, 'd', 44, a, 5) + `<rect x="32" y="41" width="5" height="14" rx="2.5" fill="${W}"/>` + line(44, 48, 58, 48, W, 4) + line(44, 16, 56, 16, '#ffffff77', 3.4) + line(44, 30, 54, 30, '#ffffff77', 3.4) },
  // mention badges are Discord's red pills
  { id: 'prev-mention', label: 'Prev mention', keys: '⌥⇧⌘↑', src: 'MENTION_CHANNEL_PREV · mod+shift+alt+up', cat: 'read', when: 'anywhere', icon: (a) => arrow(16, 32, 'u', 44, a, 5) + hash(44, 38, 11, W, 3.6) + badge(50, 14, 10) + dot(50, 14, 10, '#f23f43') + `<text x="50" y="19.5" font-family="${SANS}" font-size="15" font-weight="700" fill="#fff" stroke="#fff" stroke-width="0.4" text-anchor="middle">@</text>` },
  { id: 'next-mention', label: 'Next mention', keys: '⌥⇧⌘↓', src: 'MENTION_CHANNEL_NEXT · mod+shift+alt+down', cat: 'read', when: 'anywhere', icon: (a) => arrow(16, 32, 'd', 44, a, 5) + hash(44, 38, 11, W, 3.6) + badge(50, 14, 10) + dot(50, 14, 10, '#f23f43') + `<text x="50" y="19.5" font-family="${SANS}" font-size="15" font-weight="700" fill="#fff" stroke="#fff" stroke-width="0.4" text-anchor="middle">@</text>` },
  { id: 'mark-read', label: 'Mark read', keys: 'esc', src: 'MARK_CHANNEL_READ · esc', cat: 'read', when: 'chat', icon: (a) => circ(32, 32, 25) + check('20,33 29,42 45,23', a) },
  { id: 'mark-server-read', label: 'Mark server read', keys: '⇧esc', src: 'MARK_SERVER_READ · shift+esc', cat: 'read', when: 'server', icon: (a) => server(6, 6, 52, W, 'none') + check('20,33 29,42 45,23', a) },

  // row 3 — chat
  { id: 'inbox', label: 'Inbox', keys: '⌘I', src: 'TOGGLE_INBOX · mod+i', cat: 'chat', when: 'anywhere', icon: (a) => pathS('M6 34 L14 10 H50 L58 34 V50 Q58 56 52 56 H12 Q6 56 6 50 Z') + pathS('M6 34 H21 Q23 43 32 43 Q41 43 43 34 H58', a) },
  { id: 'pins', label: 'Pins', keys: '⌘P', src: 'TOGGLE_CHANNEL_PINS · mod+p', cat: 'chat', when: 'chat', icon: (a) => `<g transform="rotate(35 32 32)">${pathS('M23 6 H41 L39 22 Q48 27 49 36 H15 Q16 27 25 22 Z', a, `${a}55`)}${line(32, 36, 32, 60)}</g>` },
  { id: 'members', label: 'Members', keys: '⌘U', src: 'TOGGLE_USERS · mod+u', cat: 'chat', when: 'chat', icon: (a) => person(22, 30, 18) + person(44, 32, 15, a) },
  { id: 'emoji', label: 'Emoji', keys: '⌘E', src: 'SEARCH_EMOJIS · mod+e', cat: 'chat', when: 'chat', icon: (a) => face(32, 32, 26, a) },
  { id: 'gifs', label: 'GIFs', keys: '⌘G', src: 'SEARCH_GIFS · mod+g', cat: 'chat', when: 'chat', icon: (a) => rect(4, 12, 56, 40, 10) + `<text x="32" y="41.5" font-family="${SANS}" font-size="23" font-weight="700" fill="${a}" stroke="${a}" stroke-width="1" text-anchor="middle" letter-spacing="0.5">GIF</text>` },
  { id: 'upload', label: 'Upload', keys: '⇧⌘U', src: 'UPLOAD_FILE · mod+shift+u', cat: 'chat', when: 'chat', icon: (a) => circ(32, 32, 26) + `<circle cx="32" cy="32" r="17" fill="${a}" fill-opacity="0.3"/>` + plus(32, 32, 11, a, 5) },
  { id: 'copy-link', label: 'Copy link', keys: '⇧⌘L', src: 'COPY_CHANNEL_LINK · mod+shift+l', cat: 'chat', when: 'chat', icon: (a) => `<g transform="rotate(-45 32 32)">${rect(4, 22, 32, 20, 10)}${rect(28, 22, 32, 20, 10, a)}</g>` },
  { id: 'new-group', label: 'New group DM', keys: '⇧⌘T', src: 'CREATE_DM_GROUP · mod+shift+t', cat: 'chat', when: 'anywhere', icon: (a) => person(24, 32, 20) + badge(49, 16, 10) + plus(49, 16, 9, a, 4.8) },

  // row 4 — voice & more
  { id: 'mute', label: 'Mute', keys: '⇧⌘M', src: 'TOGGLE_MUTE · mod+shift+m', cat: 'voice', when: 'anywhere', icon: (a) => mic() + line(12, 8, 52, 52, a, 4.8) },
  { id: 'deafen', label: 'Deafen', keys: '⇧⌘D', src: 'TOGGLE_DEAFEN · mod+shift+d', cat: 'voice', when: 'anywhere', icon: (a) => pathS('M9 42 V33 Q9 9 32 9 Q55 9 55 33 V42') + rect(5, 37, 13, 21, 6, W, 'none') + rect(46, 37, 13, 21, 6, W, 'none') + line(10, 8, 54, 54, a, 4.8) },
  { id: 'answer', label: 'Answer call', keys: '⌘↩', src: 'CALL_ACCEPT · mod+return', cat: 'voice', when: 'ringing', c: '#23a55a', t: '#3bd67f', icon: (a) => phone(a, `${a}55`) },
  { id: 'start-call', label: 'Start call', keys: '⌃\'', src: 'CALL_START · ctrl+\'', cat: 'voice', when: 'dm', icon: (a) => phone(W) + pathS('M40 8 Q52 10 55 22', a, 'none', 3.8) + pathS('M38 17 Q45 18 46 25', a, 'none', 3.8) },
  { id: 'go-to-call', label: 'Go to call', keys: '⌥⇧⌘V', src: 'JUMP_TO_CURRENT_CALL · mod+shift+alt+v', cat: 'voice', when: 'call', icon: (a) => speaker() + pathS('M38 22 Q44 32 38 42', a, 'none', 4) + pathS('M45 14 Q56 32 45 50', a, 'none', 4) },
  { id: 'soundboard', label: 'Soundboard', keys: '⇧⌘B', src: 'SEARCH_SOUNDBOARD · mod+shift+b', cat: 'voice', when: 'call', icon: (a) => server(4, 4, 25, a, `${a}55`) + server(35, 4, 25) + server(4, 35, 25) + server(35, 35, 25) + `<g transform="translate(9 9)">${pathS('M6 13 V3 L13 1.5', W, 'none', 2.6)}${dot(4, 13, 3, W)}</g>` },
  { id: 'settings', label: 'Settings', keys: '⌘,', src: 'Native menu: Discord ▸ Preferences (OPEN_SETTINGS)', cat: 'voice', when: 'anywhere', icon: (a) => gear(32, 32, 25, 19, 8) + circ(32, 32, 7.5, a) },
  { id: 'shortcuts', label: 'Shortcuts', keys: '⌘/', src: 'TOGGLE_HOTKEYS · mod+/', cat: 'voice', when: 'anywhere', icon: (a) => rect(8, 8, 48, 48, 10) + rect(15, 13, 34, 34, 6, W, 'none', 2) + `<text x="32" y="40" font-family="${MONO}" font-size="26" fill="${a}" stroke="${a}" stroke-width="0.8" text-anchor="middle">⌘</text>` },
];

function tile(k) {
  const a = k.c || C[k.cat];
  const t = k.t || T[k.cat];
  // PRIMARY_660 → PRIMARY_730 → PRIMARY_800; the hero uses the app icon's near-black
  const bg = k.hero ? ['#232428', '#161719', '#0c0c0e'] : ['#2b2d31', '#1e1f22', '#111214'];
  const labelSize = k.label.length > 14 ? 14.5 : k.label.length > 11 ? 15.5 : 17.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#5865f2' : a}" stop-opacity="${k.hero ? 0.22 : 0.13}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${k.hero ? '' : status(k.cat, C[k.cat])}
<g transform="translate(40 14)" filter="url(#lift)">${k.icon(a)}</g>
<text x="72" y="106" font-family="${SANS}" font-size="${labelSize}" font-weight="700" fill="${W}" stroke="${W}" stroke-width="0.6" text-anchor="middle" filter="url(#lift)">${k.label}</text>
<text x="72" y="127" font-family="${MONO}" font-size="15" fill="${k.hero ? '#bcc1fa' : t}" stroke="${k.hero ? '#bcc1fa' : t}" stroke-width="0.45" text-anchor="middle">${k.keys}</text>
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
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0b0b0d"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT} (labels in ${SANS})`);
