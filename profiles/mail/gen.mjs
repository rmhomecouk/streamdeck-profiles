// Generates Stream Deck XL key icons for Apple Mail as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitLabel, HERO_GLYPH } from '../../tools/tile.mjs';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Mail's UI face is SF Pro, which resvg can't render; SF Pro Rounded is the closest it can
const SANS = '.SF NS Rounded';
const FONT = {
  fontFiles: ['/System/Library/Fonts/SFNSRounded.ttf'].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: four of Mail's own flag colours (Apple's dark-mode system colours)
const C = {
  go: '#409cff',   // blue   — mailboxes
  write: '#30d158', // green  — write
  sort: '#ff9f0a', // orange — triage
  view: '#bf5af2', // purple — view
};
const W = '#ffffff';
const INK = '#0b1322';

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
function gear(cx, cy, ro, ri, teeth, c = W, w = sw) {
  const pts = [], step = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2, t = step * 0.22;
    for (const [ang, r] of [[a - step / 2 + t * 0.4, ri], [a - t, ro], [a + t, ro], [a + step / 2 - t * 0.4, ri]])
      pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)},${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;
}
const star = (cx, cy, ro, ri) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
};
// a line envelope: body plus the top flap's V
const env = (x, y, w, h, c = W, s = sw, fill = 'none') => rect(x, y, w, h, 5, c, fill, s) + poly(`${x + 2},${y + 3} ${x + w / 2},${y + h * 0.55} ${x + w - 2},${y + 3}`, c, s);
// Mail's inbox tray
const tray = (c = W, a = c) => pathS('M6 36 L13 12 H51 L58 36 V50 Q58 56 52 56 H12 Q6 56 6 50 Z', c) + pathS('M6 36 H21 Q23 44 32 44 Q41 44 43 36 H58', a);
const lens = (cx, cy, r, c) => circ(cx, cy, r) + line(cx + r * 0.72, cy + r * 0.72, cx + r * 1.5, cy + r * 1.5, c, 6);
// Mail's flag (the glyph on flagged messages and the Flag toolbar button)
const flag = (x, y, s, c, fill = 'none', w = sw) => line(x, y, x, y + s * 1.15, W, w) + pathS(`M${x} ${y + 1} Q${x + s * 0.25} ${y - s * 0.08} ${x + s * 0.5} ${y + s * 0.06} Q${x + s * 0.75} ${y + s * 0.2} ${x + s} ${y + s * 0.06} V${y + s * 0.58} Q${x + s * 0.75} ${y + s * 0.72} ${x + s * 0.5} ${y + s * 0.58} Q${x + s * 0.25} ${y + s * 0.44} ${x} ${y + s * 0.6}`, c, fill, w);
const replyArrow = (x0, c, w = sw) => pathS(`M${x0 + 34} 48 V42 Q${x0 + 34} 28 ${x0 + 20} 28 H${x0}`, c, 'none', w) + poly(`${x0 + 10},18 ${x0},28 ${x0 + 10},38`, c, w);

// the hero: Mail's app icon — the white envelope with its pale flaps, on the icon's blue
function mailMark() {
  return `<defs><linearGradient id="envb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dcebff"/></linearGradient>
<linearGradient id="envf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f3ff"/><stop offset="1" stop-color="#b8d5fb"/></linearGradient></defs>
<rect x="3" y="12" width="58" height="42" rx="7" fill="url(#envb)" stroke="#ffffff" stroke-width="1.2"/>
<path d="M5 52 L25 34 M59 52 L39 34" stroke="#a9c9f3" stroke-width="1.6" stroke-linecap="round"/>
<path d="M5 15 L26.5 34.5 Q32 39.5 37.5 34.5 L59 15" fill="url(#envf)" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>`;
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// menu = where the shortcut lives in Mail 16's menu bar (read from MainMenu.nib, every one confirmed in the running app's live menu bar)
const KEYS = [
  // row 1 — mailboxes
  { id: 'mail', label: 'Mail', keys: 'main', menu: 'Switch Profile → Main', cat: 'go', when: 'anywhere', hero: true, icon: () => mailMark() },
  { id: 'get-mail', label: 'Get mail', keys: '⇧⌘N', menu: 'Mailbox ▸ Get All New Mail', cat: 'go', when: 'anywhere', icon: (a) => tray() + arrow(32, 16, 'd', 24, a, 4.6) },
  { id: 'search', label: 'Search', keys: '⌥⌘F', menu: 'Edit ▸ Find ▸ Mailbox Search', cat: 'go', when: 'anywhere', icon: (a) => lens(27, 27, 17, a) + `<path d="M18 23 A10 10 0 0 1 26 16" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'jump-to-top', label: 'Jump to top', keys: '⌃⌘T', menu: 'Edit ▸ Find ▸ Jump to Top', cat: 'go', when: 'anywhere', icon: (a) => line(10, 8, 54, 8, a, 5) + arrow(32, 36, 'u', 38, W, 5) + line(6, 30, 18, 30, '#ffffff77', 3.4) + line(46, 30, 58, 30, '#ffffff77', 3.4) + line(6, 42, 18, 42, '#ffffff77', 3.4) + line(46, 42, 58, 42, '#ffffff77', 3.4) + line(6, 54, 18, 54, '#ffffff77', 3.4) + line(46, 54, 58, 54, '#ffffff77', 3.4) },
  { id: 'primary', label: 'Primary', keys: '⌥⌘1', menu: 'Mailbox ▸ Go to Mailbox Category ▸ Primary', cat: 'go', when: 'categories', icon: (a) => circ(32, 32, 26) + circ(32, 25, 8, a, 'none', 4) + pathS('M17 50 Q19 38 32 38 Q45 38 47 50', a, 'none', 4) },
  { id: 'all-mail', label: 'All mail', keys: '⌥⌘5', menu: 'Mailbox ▸ Go to Mailbox Category ▸ All Mail', cat: 'go', when: 'categories', icon: (a) => pathS('M12 12 H52', a, 'none', 3.6) + pathS('M9 20 H55', a, 'none', 3.6) + pathS('M6 36 L10 28 H54 L58 36 V50 Q58 56 52 56 H12 Q6 56 6 50 Z') + pathS('M6 38 H21 Q23 45 32 45 Q41 45 43 38 H58') },
  { id: 'prev-unread', label: 'Prev unread', keys: '⌃⌥⌘[', menu: 'Mailbox ▸ Go to Previous Unread Mailbox', cat: 'go', when: 'anywhere', icon: (a) => arrow(15, 32, 'u', 44, a, 5) + env(26, 18, 34, 26, W, 3.6) + badge(56, 17, 6) + dot(56, 17, 6, a) },
  { id: 'next-unread', label: 'Next unread', keys: '⌃⌥⌘]', menu: 'Mailbox ▸ Go to Next Unread Mailbox', cat: 'go', when: 'anywhere', icon: (a) => arrow(15, 32, 'd', 44, a, 5) + env(26, 18, 34, 26, W, 3.6) + badge(56, 17, 6) + dot(56, 17, 6, a) },

  // row 2 — write
  { id: 'new-message', label: 'New message', keys: '⌘N', menu: 'File ▸ New Message', cat: 'write', when: 'anywhere', icon: (a) => pathS('M30 10 H14 Q8 10 8 16 V50 Q8 56 14 56 H48 Q54 56 54 50 V34') + pathS('M50 7 L57 14 L33 38 L23 41 L26 31 Z', a) },
  { id: 'reply', label: 'Reply', keys: '⌘R', menu: 'Message ▸ Reply', cat: 'write', when: 'message', icon: (a) => replyArrow(12, a, 5) },
  { id: 'reply-all', label: 'Reply all', keys: '⇧⌘R', menu: 'Message ▸ Reply All', cat: 'write', when: 'message', icon: (a) => replyArrow(16, a, 5) + poly('16,18 6,28 16,38', W, 5) },
  { id: 'forward', label: 'Forward', keys: '⇧⌘F', menu: 'Message ▸ Forward', cat: 'write', when: 'message', icon: (a) => pathS('M18 48 V42 Q18 28 32 28 H52', a, 'none', 5) + poly('42,18 52,28 42,38', a, 5) },
  { id: 'redirect', label: 'Redirect', keys: '⇧⌘E', menu: 'Message ▸ Redirect', cat: 'write', when: 'message', icon: (a) => env(4, 24, 36, 28) + pathS('M30 18 Q32 8 44 8 H52', a, 'none', 4.4) + poly('46,2 53,8 46,14', a, 4.4) + arrow(50, 38, 'r', 16, a, 4.4) },
  { id: 'send', label: 'Send', keys: '⇧⌘D', menu: 'Message ▸ Send', cat: 'write', when: 'compose', icon: (a) => pathS('M6 30 L58 8 L44 56 L31 36 Z', W, `${a}33`) + pathS('M31 36 L58 8', a) },
  { id: 'attach', label: 'Attach', keys: '⇧⌘A', menu: 'File ▸ Attach Files…', cat: 'write', when: 'compose', icon: (a) => pathS('M44 22 L25 41 Q20 46 15 41 Q10 36 15 31 L36 10 Q43 3 50 10 Q57 17 50 24 L30 44', a, 'none', 4.6) },
  { id: 'add-link', label: 'Add link', keys: '⌘K', menu: 'Edit ▸ Add Link…', cat: 'write', when: 'compose', icon: (a) => `<g transform="rotate(-45 32 32)">${rect(4, 22, 32, 20, 10)}${rect(28, 22, 32, 20, 10, a)}</g>` },

  // row 3 — triage
  { id: 'archive', label: 'Archive', keys: '⌃⌘A', menu: 'Message ▸ Archive', cat: 'sort', when: 'message', icon: (a) => rect(6, 10, 52, 13, 4) + pathS('M10 23 V50 Q10 55 15 55 H49 Q54 55 54 50 V23') + line(25, 34, 39, 34, a, 4.6) },
  { id: 'delete', label: 'Delete', keys: '⌘⌫', menu: 'Edit ▸ Delete', cat: 'sort', when: 'message', c: '#ff453a', icon: (a) => line(9, 15, 55, 15) + pathS('M24 15 V10 Q24 7 27 7 H37 Q40 7 40 10 V15') + pathS('M14 15 L17 52 Q17.5 57 22 57 H42 Q46.5 57 47 52 L50 15') + line(27, 25, 27, 47, a, 3.6) + line(37, 25, 37, 47, a, 3.6) },
  { id: 'junk', label: 'Junk', keys: '⇧⌘J', menu: 'Message ▸ Move to Junk', cat: 'sort', when: 'message', icon: (a) => tray() + line(25, 14, 39, 28, a, 4.6) + line(39, 14, 25, 28, a, 4.6) },
  { id: 'mark-read', label: 'Read / unread', keys: '⇧⌘U', menu: 'Message ▸ Mark as Read (or Unread)', cat: 'sort', when: 'message', icon: (a) => env(12, 18, 46, 34) + badge(12, 18, 8) + dot(12, 18, 8, '#409cff') },
  { id: 'flag', label: 'Flag', keys: '⇧⌘L', menu: 'Message ▸ Flag ▸ Toggle Flag', cat: 'sort', when: 'message', icon: (a) => flag(16, 10, 34, a, `${a}55`, 4.6) },
  { id: 'mute', label: 'Mute thread', keys: '⌃⇧M', menu: 'Message ▸ Mute', cat: 'sort', when: 'message', icon: (a) => pathS('M16 44 V30 Q16 13 32 13 Q48 13 48 30 V44 L53 49 H11 Z') + pathS('M27 54 Q32 59 37 54') + line(10, 8, 54, 56, a, 4.8) },
  { id: 'move-suggested', label: 'Move to suggested', keys: '⌃⌘M', menu: 'Message ▸ Move to Predicted Mailbox', cat: 'sort', when: 'message', icon: (a) => pathS('M6 18 Q6 12 12 12 H24 L29 18 H52 Q58 18 58 24 V48 Q58 54 52 54 H12 Q6 54 6 48 Z') + arrow(32, 36, 'r', 20, a, 4.4) + `<polygon points="${star(52, 10, 8, 3)}" fill="${a}"/>` },
  { id: 'apply-rules', label: 'Apply rules', keys: '⌥⌘L', menu: 'Message ▸ Apply Rules', cat: 'sort', when: 'message', icon: (a) => line(8, 14, 36, 14) + line(8, 28, 30, 28) + line(8, 42, 24, 42) + gear(45, 42, 14, 10.5, 7, a) + circ(45, 42, 4, a, 'none', 3.4) },

  // row 4 — view
  { id: 'sidebar', label: 'Sidebar', keys: '⌃⌘S', menu: 'View ▸ Show Sidebar', cat: 'view', when: 'anywhere', icon: (a) => `<rect x="6" y="10" width="18" height="44" fill="${a}" clip-path="url(#fr)"/>` + rect(6, 10, 52, 44, 7) + line(24, 10, 24, 54) },
  { id: 'favorites', label: 'Favorites bar', keys: '⌥⇧⌘H', menu: 'View ▸ Show Favorites Bar', cat: 'view', when: 'anywhere', icon: (a) => `<polygon points="${star(32, 32, 20, 9)}" fill="none" stroke="${W}" stroke-width="${sw}" stroke-linejoin="round"/>` + rect(6, 5, 52, 7, 3.5, 'none', a, 0) },
  // Mail's filter button: a circle with three shrinking lines
  { id: 'filter', label: 'Unread filter', keys: '⌘L', menu: 'View ▸ Filter ▸ Enable Message Filter', cat: 'view', when: 'anywhere', icon: (a) => circ(32, 32, 26) + line(19, 23, 45, 23, a, 4.4) + line(23, 32, 41, 32, a, 4.4) + line(27, 41, 37, 41, a, 4.4) },
  { id: 'find', label: 'Find', keys: '⌘F', menu: 'Edit ▸ Find ▸ Find…', cat: 'view', when: 'message', icon: (a) => pathS('M36 6 H14 Q9 6 9 11 V53 Q9 58 14 58 H26') + line(17, 18, 35, 18) + line(17, 28, 28, 28) + lens(40, 38, 11, a) },
  { id: 'all-headers', label: 'All headers', keys: '⇧⌘H', menu: 'View ▸ Message ▸ All Headers', cat: 'view', when: 'message', icon: (a) => rect(8, 6, 48, 52, 7) + line(16, 17, 48, 17, a, 3.6) + line(16, 25, 42, 25, a, 3.6) + line(16, 33, 45, 33, a, 3.6) + line(16, 45, 48, 45, '#ffffff66', 3.2) },
  { id: 'quick-look', label: 'Quick Look', keys: '⌘Y', menu: 'File ▸ Quick Look Attachments…', cat: 'view', when: 'message', icon: (a) => pathS('M4 32 Q18 12 32 12 Q46 12 60 32 Q46 52 32 52 Q18 52 4 32 Z') + circ(32, 32, 10, a, `${a}44`, 4.2) + dot(32, 32, 3.5, a) },
  { id: 'activity', label: 'Activity', keys: '⌥⌘0', menu: 'Window ▸ Activity', cat: 'view', when: 'anywhere', icon: (a) => circ(32, 32, 24, '#ffffff44') + pathS('M32 8 A24 24 0 0 1 55 38', a, 'none', 5) + arrow(32, 32, 'd', 18, W, 4.2) },
  { id: 'settings', label: 'Settings', keys: '⌘,', menu: 'Mail ▸ Settings…', cat: 'view', when: 'anywhere', icon: (a) => gear(32, 32, 25, 19, 8) + circ(32, 32, 7.5, a) },
];

// the corner flourish: each row flies one of Mail's flag colours
const cornerFlag = (a) => `<g opacity="0.75">${flag(12, 11, 11, a, a, 1.8).replace(`stroke="${W}"`, `stroke="${a}"`)}</g>`;

function tile(k) {
  const a = k.c || C[k.cat];
  // the hero wears the icon's own blue; the rest are Mail's dark sidebar navy
  const bg = k.hero ? ['#3aa8ff', '#1581ff', '#0a5ee6'] : ['#1f2b40', '#141c2b', '#0b101a'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#ffffff' : a}" stop-opacity="${k.hero ? 0.18 : 0.13}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="${k.hero ? 0.25 : 0.5}"/>
  </filter>
  <clipPath id="fr"><rect x="6" y="10" width="52" height="44" rx="7"/></clipPath>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${k.hero ? '' : cornerFlag(C[k.cat])}
<g transform="${k.hero ? HERO_GLYPH : 'translate(40 14)'}" filter="url(#lift)">${k.icon(a)}</g>
${k.hero ? '' : fitLabel(k.label, { family: SANS, weight: 700, font: FONT }).map((l) => `<text x="72" y="${l.y}" font-family="${SANS}" font-size="${l.size}" font-weight="700" fill="${W}" stroke="${W}" stroke-width="0.3" text-anchor="middle" filter="url(#lift)">${l.text}</text>`).join('\n')}
<rect x="0.75" y="0.75" width="142.5" height="142.5" rx="20" fill="none" stroke="#fff" stroke-opacity="${k.hero ? 0.3 : 0.08}" stroke-width="1.5"/>
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
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0a0e16"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT}`);
