// Generates Stream Deck XL key icons for Microsoft Teams as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Family names as stored in the fonts' name tables. resvg can't render SF Pro (SFNS.ttf),
// so labels use SF Pro Rounded — close to Fluent's soft, rounded feel.
const SANS = '.SF NS Rounded';
const MONO = '.SF NS Mono';
const FONT = {
  fontFiles: ['/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSMono.ttf'].filter((f) => fs.existsSync(f)),
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: Teams' dark-theme brand violet, plus call-state colours
const C = {
  meet: '#8b8ff8',  // violet — in the meeting
  calls: '#5fd38a', // green  — calls
  react: '#ffc34d', // amber  — reactions & status
  app: '#6cb8f6',   // blue   — chat & app
};
const RED = '#ff5c6c', GREEN = '#6bd68b', EMOJI = '#ffc83d';
const W = '#ffffff';
const INK = '#16161b';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const plus = (cx, cy, r, c, w = sw) => line(cx - r, cy, cx + r, cy, c, w) + line(cx, cy - r, cx, cy + r, c, w);
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
const lens = (inner, c) => circ(27, 27, 16) + line(39, 39, 53, 53, c, 6.5) + inner;
const HANDSET = 'M17 8 C12 8 9 12 9 17 C11 40 25 53 47 55 C52 55 56 52 56 47 V41 C56 39 55 38 53 37 L44 34 C42 33.5 40 34 39 35.5 L36 39.5 C29 36 26 32 23 26 L27 23 C28.5 22 29 20 28.5 18 L25.5 9.5 C25 8.5 24 8 22.5 8 Z';
const handset = (fill, stroke = 'none', w = 0) => `<path d="${HANDSET}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;
// shrink + rotate a 64-box glyph about the icon centre
const inset = (s, deg, body) => `<g transform="translate(32 32) scale(${s}) rotate(${deg}) translate(-32 -32)">${body}</g>`;
const camera = (c = W, lensFill = 'none') => rect(5, 18, 38, 28, 7, c) + pathS('M43 28 L57 20 V44 L43 36 Z', c, lensFill);
const person = (cx = 32, c = W) => circ(cx, 22, 9, c) + pathS(`M${cx - 16} 54 Q${cx - 16} 38 ${cx} 38 Q${cx + 16} 38 ${cx + 16} 54`, c);
const disk = (fill) => circ(32, 32, 28, 'none', fill, 0);
// Teams' mark: two people and the T plate
function teamsMark() {
  return `<circle cx="45" cy="16" r="9" fill="url(#tb)"/><rect x="33" y="27" width="25" height="30" rx="12" fill="url(#tb)"/>` +
    `<circle cx="28" cy="13" r="11" fill="url(#tg)"/><rect x="13" y="27" width="32" height="32" rx="14" fill="url(#tg)"/>` +
    `<rect x="3" y="29" width="27" height="25" rx="6" fill="url(#tp)"/><rect x="9.5" y="35" width="14" height="4" fill="#fff"/><rect x="14.5" y="35" width="4" height="14" fill="#fff"/>`;
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// cmd = Teams' own command id (macOS desktop keymap); when = where it works
const KEYS = [
  // row 1 — in the meeting
  { id: 'teams', label: 'Teams', keys: 'open app', cmd: 'launch / focus Microsoft Teams.app', cat: 'meet', when: 'anywhere', hero: true, icon: () => teamsMark() },
  { id: 'mute', label: 'Mute', keys: '⇧⌘M', cmd: 'ToggleMuteCurrentCall', cat: 'meet', when: 'meeting', icon: (a) => rect(24, 6, 16, 30, 8) + pathS('M14 30 A18 18 0 0 0 50 30') + line(32, 48, 32, 56) + line(24, 56, 40, 56) + line(12, 8, 52, 52, a, 4.8) },
  { id: 'camera', label: 'Camera', keys: '⇧⌘O', cmd: 'ToggleVideoCurrentCall', cat: 'meet', when: 'meeting', icon: (a) => camera(W, a) },
  { id: 'raise-hand', label: 'Raise hand', keys: '⇧⌘K', cmd: 'ToggleRaiseHandCurrentCall', cat: 'meet', when: 'meeting', icon: (a) => `<g fill="${W}"><rect x="17" y="14" width="8" height="26" rx="4"/><rect x="25.5" y="7" width="8" height="30" rx="4"/><rect x="34" y="8" width="8" height="29" rx="4"/><rect x="42.5" y="15" width="8" height="24" rx="4"/><rect x="17" y="28" width="33.5" height="29" rx="13"/><rect x="7" y="29" width="8" height="22" rx="4" transform="rotate(-38 11 40)"/></g>` + line(6, 8, 10, 13, a, 3.4) + line(58, 8, 54, 13, a, 3.4) },
  { id: 'share', label: 'Share', keys: '⇧⌘E', cmd: 'ToggleShareTray', cat: 'meet', when: 'meeting', icon: (a) => rect(5, 9, 54, 37, 6) + arrow(32, 28, 'u', 18, a) + line(22, 55, 42, 55) },
  { id: 'blur', label: 'Blur', keys: '⇧⌘P', cmd: 'ToggleBackgroundBlurCurrentCall', cat: 'meet', when: 'meeting', icon: (a) => person(32) + [[6, 10], [6, 22], [6, 34], [6, 46], [15, 16], [15, 28], [58, 10], [58, 22], [58, 34], [58, 46], [49, 16], [49, 28]].map(([x, y], i) => circ(x, y, 2.6, 'none', a, 0).replace('/>', ` fill-opacity="${i % 3 ? 0.55 : 0.9}"/>`)).join('') },
  { id: 'captions', label: 'Captions', keys: '⇧⌘A', cmd: 'ToggleLiveCaptions', cat: 'meet', when: 'meeting', icon: (a) => rect(5, 13, 54, 38, 8) + `<text x="32" y="40" font-family="${SANS}" font-size="21" fill="${a}" stroke="${a}" stroke-width="1" text-anchor="middle">CC</text>` },
  { id: 'leave', label: 'Leave', keys: '⇧⌘H', cmd: 'LeaveCall', cat: 'meet', c: RED, when: 'meeting', icon: () => rect(2, 17, 60, 30, 15, 'none', RED, 0) + inset(0.62, 135, handset(W)) },

  // row 2 — calls
  { id: 'accept-video', label: 'Accept video', keys: '⇧⌘V', cmd: 'AcceptIncomingCallWithVideo', cat: 'calls', c: GREEN, when: 'incoming', icon: () => disk(GREEN) + inset(0.58, 0, rect(5, 18, 38, 28, 7, 'none', W, 0) + pathS('M43 28 L57 20 V44 L43 36 Z', 'none', W, 0)) },
  { id: 'accept-audio', label: 'Accept audio', keys: '⇧⌘A', cmd: 'AcceptIncomingCallWithAudio', cat: 'calls', c: GREEN, when: 'incoming', icon: () => disk(GREEN) + inset(0.58, 0, handset(W)) },
  { id: 'decline', label: 'Decline', keys: '⇧⌘D', cmd: 'RejectIncomingCall', cat: 'calls', c: RED, when: 'incoming', icon: () => disk(RED) + inset(0.58, 135, handset(W)) },
  { id: 'join', label: 'Join', keys: '⇧⌘J', cmd: 'JoinMeetingFromToast', cat: 'calls', when: 'incoming', icon: (a) => pathS('M34 7 H49 Q57 7 57 15 V49 Q57 57 49 57 H34') + arrow(24, 32, 'r', 30, a) },
  { id: 'admit', label: 'Admit', keys: '⇧⌘Y', cmd: 'AdmitLobbyParticipant', cat: 'calls', when: 'meeting', icon: (a) => person(26) + plus(52, 18, 7, a) },
  { id: 'speaker', label: 'Speaker', keys: '⇧⌘U', cmd: 'ToggleSpeakerMuteCurrentCall', cat: 'calls', when: 'meeting', icon: (a) => pathS('M6 24 H17 L31 12 V52 L17 40 H6 Z') + pathS('M40 23 A12 12 0 0 1 40 41', a) + pathS('M47 15 A21 21 0 0 1 47 49', a) },
  { id: 'audio-call', label: 'Audio call', keys: '⌥⌘S', cmd: 'StartAudioCallInChat', cat: 'calls', when: 'chat', icon: (a) => handset('none', W, 3.8) + pathS('M38 8 A18 18 0 0 1 56 26', a, 'none', 3.6) + pathS('M38 17 A9 9 0 0 1 47 26', a, 'none', 3.6) },
  { id: 'video-call', label: 'Video call', keys: '⇧⌘S', cmd: 'StartVideoCallInChat', cat: 'calls', when: 'chat', icon: (a) => camera(W, a) },

  // row 3 — reactions & status
  { id: 'like', label: 'Like', keys: '⌥⇧1', cmd: 'MeetingLikeReaction', cat: 'react', when: 'meeting', icon: () => rect(5, 28, 12, 27, 3, 'none', '#f0a830', 0) + pathS('M21 28 L28 11 Q30 6.5 34.5 7.5 Q39 9 38 15 L36 23 H50 Q57 23 55.5 30.5 L52.5 47 Q51.5 54 44.5 54 H21 Z', 'none', EMOJI, 0) },
  { id: 'heart', label: 'Heart', keys: '⌥⇧2', cmd: 'MeetingHeartReaction', cat: 'react', when: 'meeting', icon: () => pathS('M32 55 C10 41 5 29 11 19 C17 10 28 11 32 20 C36 11 47 10 53 19 C59 29 54 41 32 55 Z', 'none', '#ff6b8a', 0) },
  { id: 'applause', label: 'Applause', keys: '⌥⇧3', cmd: 'MeetingApplauseReaction', cat: 'react', when: 'meeting', icon: () => `<rect x="13" y="16" width="19" height="38" rx="9.5" transform="rotate(-18 22.5 35)" fill="#f0a830"/><rect x="31" y="16" width="19" height="38" rx="9.5" transform="rotate(18 40.5 35)" fill="${EMOJI}"/>` + line(10, 5, 14, 11, W, 3.2) + line(32, 2, 32, 8, W, 3.2) + line(54, 5, 50, 11, W, 3.2) },
  { id: 'laugh', label: 'Laugh', keys: '⌥⇧4', cmd: 'MeetingLaughReaction', cat: 'react', when: 'meeting', icon: () => disk(EMOJI) + pathS('M19 26 Q23.5 19 28 26', INK, 'none', 3.6) + pathS('M36 26 Q40.5 19 45 26', INK, 'none', 3.6) + pathS('M17 35 H47 Q45 51 32 51 Q19 51 17 35 Z', 'none', INK, 0) },
  { id: 'surprised', label: 'Surprised', keys: '⌥⇧5', cmd: 'MeetingSurprisedReaction', cat: 'react', when: 'meeting', icon: () => disk(EMOJI) + circ(23, 26, 3.4, 'none', INK, 0) + circ(41, 26, 3.4, 'none', INK, 0) + `<ellipse cx="32" cy="43" rx="6" ry="7.5" fill="${INK}"/>` },
  { id: 'available', label: 'Available', keys: '⌥⇧Q', cmd: 'SetPresenceStatusAvailable', cat: 'react', c: GREEN, when: 'anywhere', icon: () => circ(32, 32, 25, 'none', GREEN, 0) + poly('20,33 29,42 45,23', W, 6) },
  { id: 'busy', label: 'Busy', keys: '⌥⇧Y', cmd: 'SetPresenceStatusBusy', cat: 'react', c: RED, when: 'anywhere', icon: () => circ(32, 32, 25, 'none', RED, 0) },
  { id: 'dnd', label: 'Do not disturb', keys: '⌥⇧U', cmd: 'SetPresenceStatusDND', cat: 'react', c: RED, when: 'anywhere', icon: () => circ(32, 32, 25, 'none', RED, 0) + line(19, 32, 45, 32, W, 6.5) },

  // row 4 — chat & app
  { id: 'search', label: 'Search', keys: '⌘E', cmd: 'GoToPowerBar', cat: 'app', when: 'anywhere', icon: (a) => lens(pathS('M19 24 A9 9 0 0 1 26 18', a, 'none', 3), a) },
  { id: 'new-chat', label: 'New chat', keys: '⌘N', cmd: 'NewChat', cat: 'app', when: 'anywhere', icon: (a) => rect(6, 14, 40, 42, 9) + pathS('M26 40 L50 14 L56 20 L32 44 L24 46 Z', a) },
  { id: 'go-to', label: 'Go to', keys: '⌘G', cmd: 'SlashCommandGoto', cat: 'app', when: 'anywhere', icon: (a) => rect(6, 6, 52, 52, 13) + line(38, 18, 26, 46, a, 5) },
  { id: 'compose', label: 'Compose', keys: '⌘R', cmd: 'Compose', cat: 'app', when: 'chat', icon: (a) => rect(3, 19, 58, 26, 10) + line(13, 32, 33, 32, W, 3.4) + line(40, 25, 40, 39, a, 3.6) },
  { id: 'pop-out', label: 'Pop out', keys: '⌘O', cmd: 'PopoutConv', cat: 'app', when: 'chat', icon: (a) => rect(6, 18, 38, 38, 7) + pathS('M37 8 H56 V27', a) + line(55, 9, 33, 31, a) },
  { id: 'on-top', label: 'On top', keys: '⌃⌘T', cmd: 'ToggleWindowAlwaysOnTop', cat: 'app', when: 'anywhere', icon: (a) => rect(6, 25, 38, 31, 6) + rect(20, 8, 38, 31, 6, a, INK) + arrow(39, 24, 'u', 12, a, 3.6) },
  { id: 'settings', label: 'Settings', keys: '⌘,', cmd: 'OpenSettingsMenu', cat: 'app', when: 'anywhere', icon: (a) => gear(32, 32, 25, 19, 8) + circ(32, 32, 7.5, a) },
  { id: 'shortcuts', label: 'Shortcuts', keys: '⌘.', cmd: 'ShowShortcuts', cat: 'app', when: 'anywhere', icon: (a) => rect(8, 8, 48, 48, 10) + rect(15, 13, 34, 34, 6, W, 'none', 2) + `<text x="32" y="40" font-family="${MONO}" font-size="26" fill="${a}" stroke="${a}" stroke-width="0.8" text-anchor="middle">⌘</text>` },
];

function tile(k) {
  const a = k.c || C[k.cat];
  const bg = k.hero ? ['#302d4d', '#211f36', '#16151f'] : ['#2c2b35', '#1f1f26', '#16161b'];
  const labelSize = k.label.length > 11 ? 15.5 : 17.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#8b7cf6' : a}" stop-opacity="${k.hero ? 0.3 : 0.13}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fbcff"/><stop offset="1" stop-color="#7c6cf5"/></linearGradient>
  <linearGradient id="tb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8e7df8"/><stop offset="1" stop-color="#5543d3"/></linearGradient>
  <linearGradient id="tp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6283ff"/><stop offset="1" stop-color="#2f2596"/></linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
<rect width="144" height="80" fill="url(#sheen)"/>
<rect x="60" y="6" width="24" height="4" rx="2" fill="${k.hero ? '#a59cff' : a}"/>
<g transform="translate(40 16)" filter="url(#lift)">${k.icon(a)}</g>
<text x="72" y="107" font-family="${SANS}" font-size="${labelSize}" fill="${W}" stroke="${W}" stroke-width="0.6" text-anchor="middle" filter="url(#lift)">${k.label}</text>
<text x="72" y="128" font-family="${MONO}" font-size="15" fill="${k.hero ? '#c4bdff' : a}" stroke="${k.hero ? '#c4bdff' : a}" stroke-width="0.45" text-anchor="middle">${k.keys}</text>
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
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0e0e12"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT}`);
