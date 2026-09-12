// Generates Stream Deck XL key icons for Microsoft Word as SVG + 288px PNG, plus a contact sheet.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitLabel, HERO_GLYPH } from '../../tools/tile.mjs';

// Output defaults to this profile's folder: svg/, icons/, keymap.json, sheet.png
const OUT = process.argv[2] || path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });

// Office's own face, Aptos, ships inside Word; fall back to SF Pro Rounded (resvg can't render SF Pro)
const DF = '/Applications/Microsoft Word.app/Contents/Resources/DFonts';
const aptos = ['Aptos.ttf', 'Aptos-Bold.ttf', 'Aptos-Bold-Italic.ttf'].map((f) => path.join(DF, f)).filter((f) => fs.existsSync(f));
const SANS = aptos.length === 3 ? 'Aptos' : '.SF NS Rounded';
const MONO = '.SF NS Mono';
const FONT = {
  fontFiles: [...aptos, '/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSMono.ttf'],
  loadSystemFonts: true,
  defaultFontFamily: SANS,
};

// Row accents: the page layers of Word's icon, top to bottom
const C = {
  doc: '#5fd0f6',  // cyan    — document
  fmt: '#7ea6ff',  // sky     — format text
  para: '#a393ff', // violet  — paragraph & styles
  rev: '#4f7dff',  // royal   — review & view
};
const W = '#ffffff';
const INK = '#131722';
const RED = '#ff5c5c';

// ---------- drawing helpers (64x64 icon space) ----------
const sw = 4.2;
const line = (x1, y1, x2, y2, c = W, w = sw) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const poly = (pts, c = W, w = sw) => `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r, c = W, fill = 'none', s = sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${c}" stroke-width="${s}"/>`;
const pathS = (d, c = W, fill = 'none', w = sw) => `<path d="${d}" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, c = W, fill = 'none', w = sw) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${c}" stroke-width="${w}"/>`;
const dot = (cx, cy, r, c) => circ(cx, cy, r, 'none', c, 0);
const txt = (x, y, s, c, size, { w = 700, style = 'normal', anchor = 'middle', font = SANS } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${w}" font-style="${style}" fill="${c}" text-anchor="${anchor}">${s}</text>`;
const lens = (cx, cy, r, c) => circ(cx, cy, r) + line(cx + r * 0.72, cy + r * 0.72, cx + r * 1.55, cy + r * 1.55, c, 6);
const page = (c = W) => pathS('M12 4 H40 L54 18 V60 H12 Z', c) + poly('40,4 40,18 54,18', c, 3);
const lines = (ys, x1, x2s, c = W, w = 4) => ys.map((y, i) => line(x1[i] ?? x1, y, x2s[i], y, c, w)).join('');
const floppy = (c = W, a = W) => pathS('M8 12 Q8 6 14 6 H44 L56 18 V50 Q56 56 50 56 H14 Q8 56 8 50 Z', c) + rect(18, 6, 22, 14, 2, a, `${a}44`, 3.2) + rect(17, 34, 30, 22, 3, c, 'none', 3.4);
const badge = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="${INK}"/>`;
// undo / redo: a hooked arrow
const hook = (a, flip) => `<g ${flip ? 'transform="translate(64 0) scale(-1 1)"' : ''}>${pathS('M18 24 H40 Q56 24 56 40 Q56 56 40 56 H26', a, 'none', 5)}${poly('27,13 16,24 27,35', a, 5)}</g>`;
// the format painter's brush
const brush = (a) => rect(10, 6, 40, 16, 5, a, `${a}44`) + pathS('M50 14 H56 V30 H32 V38', W) + rect(27, 38, 10, 20, 3, W, 'none', 3.6);

// Word's icon: three page layers (cyan, violet, deep blue) behind the W badge
function wordMark() {
  return `<defs>
  <linearGradient id="l1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fd6f8"/><stop offset="1" stop-color="#b3a9f5"/></linearGradient>
  <linearGradient id="l2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3c86e0"/><stop offset="1" stop-color="#7466e0"/></linearGradient>
  <linearGradient id="l3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b3cc0"/><stop offset="1" stop-color="#2452d8"/></linearGradient>
  <linearGradient id="wb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d63d8"/><stop offset="1" stop-color="#132c8f"/></linearGradient>
</defs>
<rect x="16" y="36" width="46" height="26" rx="7" fill="url(#l3)"/>
<rect x="16" y="19" width="46" height="26" rx="7" fill="url(#l2)"/>
<rect x="16" y="2" width="46" height="26" rx="7" fill="url(#l1)"/>
<rect x="0" y="23" width="32" height="32" rx="8" fill="url(#wb)" stroke="#0b1650" stroke-opacity="0.5" stroke-width="1"/>
${txt(16, 47, 'W', '#f4f6ff', 25, { w: 700 })}`;
}

// ---------- the 32 keys (8 x 4, row-major) ----------
// src = the Word command bound to the key, as Word 16.112's own key table reports it (find key), plus the menu item where there is one
const KEYS = [
  // row 1 — document
  { id: 'word', label: 'Word', keys: 'main', src: 'Switch Profile → Main', cat: 'doc', when: 'anywhere', hero: true, icon: () => wordMark() },
  { id: 'save', label: 'Save', keys: '⌘S', src: 'FileSave · File ▸ Save', cat: 'doc', when: 'document', icon: (a) => floppy(W, a) },
  { id: 'save-as', label: 'Save as', keys: '⇧⌘S', src: 'FileSaveAs · File ▸ Save As…', cat: 'doc', when: 'document', icon: (a) => floppy(W, a) + badge(50, 50, 10) + pathS('M42 58 L43 52 L54 41 L59 46 L48 57 Z', a, INK, 3.4) },
  { id: 'print', label: 'Print', keys: '⌘P', src: 'FilePrint · File ▸ Print…', cat: 'doc', when: 'document', icon: (a) => rect(18, 4, 28, 16, 2) + pathS('M14 46 H8 Q4 46 4 42 V26 Q4 20 10 20 H54 Q60 20 60 26 V42 Q60 46 56 46 H50') + rect(18, 36, 28, 22, 2, a, INK) + dot(50, 28, 3, a) },
  { id: 'undo', label: 'Undo', keys: '⌘Z', src: 'EditUndo · Edit ▸ Undo', cat: 'doc', when: 'document', icon: (a) => hook(a, false) },
  { id: 'redo', label: 'Redo', keys: '⇧⌘Z', src: 'EditRedo', cat: 'doc', when: 'document', icon: (a) => hook(a, true) },
  { id: 'find', label: 'Find', keys: '⌘F', src: 'EditFind · Edit ▸ Find ▸ Find…', cat: 'doc', when: 'document', icon: (a) => lens(27, 27, 17, a) + `<path d="M18 23 A10 10 0 0 1 26 16" fill="none" stroke="${a}" stroke-width="3.4" stroke-linecap="round"/>` },
  { id: 'go-to', label: 'Go to', keys: '⌥⌘G', src: 'EditGoTo · Edit ▸ Find ▸ Go To…', cat: 'doc', when: 'document', icon: (a) => page() + line(22, 30, 44, 30, '#ffffff66', 3.4) + line(22, 50, 38, 50, '#ffffff66', 3.4) + `<rect x="0" y="34" width="36" height="12" fill="${INK}" opacity="0"/>` + line(2, 40, 34, 40, a, 5) + poly('26,32 34,40 26,48', a, 5) },

  // row 2 — format text
  { id: 'bold', label: 'Bold', keys: '⌘B', src: 'Bold', cat: 'fmt', when: 'text', icon: (a) => txt(32, 52, 'B', a, 58, { w: 700 }) },
  { id: 'italic', label: 'Italic', keys: '⌘I', src: 'Italic', cat: 'fmt', when: 'text', icon: (a) => txt(32, 52, 'I', a, 58, { w: 700, style: 'italic' }) },
  { id: 'underline', label: 'Underline', keys: '⌘U', src: 'Underline', cat: 'fmt', when: 'text', icon: (a) => txt(32, 46, 'U', W, 50, { w: 700 }) + line(14, 57, 50, 57, a, 5) },
  { id: 'strikethrough', label: 'Strikethrough', keys: '⇧⌘X', src: 'Strikethrough', cat: 'fmt', when: 'text', icon: (a) => txt(32, 48, 'ab', W, 42, { w: 700 }) + line(4, 34, 60, 34, a, 5) },
  { id: 'smaller', label: 'Smaller', keys: '⌘[', src: 'ShrinkFontOnePoint', cat: 'fmt', when: 'text', icon: (a) => txt(24, 54, 'A', W, 40, { w: 700 }) + poly('44,18 52,26 60,18', a, 5) },
  { id: 'bigger', label: 'Bigger', keys: '⌘]', src: 'GrowFontOnePoint', cat: 'fmt', when: 'text', icon: (a) => txt(24, 58, 'A', W, 54, { w: 700 }) + poly('44,26 52,18 60,26', a, 5) },
  { id: 'copy-format', label: 'Copy format', keys: '⌥⌘C', src: 'CopyFormat', cat: 'fmt', when: 'text', icon: (a) => brush(a) },
  { id: 'paste-format', label: 'Paste format', keys: '⌥⌘V', src: 'PasteFormat', cat: 'fmt', when: 'text', icon: (a) => `<g transform="translate(-6 -2) scale(0.8)">${brush(a)}</g>` + line(34, 44, 60, 44, a, 4) + line(34, 54, 54, 54, W, 3.4) },

  // row 3 — paragraph & styles
  { id: 'heading-1', label: 'Heading 1', keys: '⌥⌘1', src: 'ApplyHeading1', cat: 'para', when: 'text', icon: (a) => txt(24, 50, 'H', W, 46, { w: 700 }) + txt(50, 50, '1', a, 34, { w: 700 }) },
  { id: 'heading-2', label: 'Heading 2', keys: '⌥⌘2', src: 'ApplyHeading2', cat: 'para', when: 'text', icon: (a) => txt(24, 50, 'H', W, 46, { w: 700 }) + txt(50, 50, '2', a, 34, { w: 700 }) },
  { id: 'heading-3', label: 'Heading 3', keys: '⌥⌘3', src: 'ApplyHeading3', cat: 'para', when: 'text', icon: (a) => txt(24, 50, 'H', W, 46, { w: 700 }) + txt(50, 50, '3', a, 34, { w: 700 }) },
  { id: 'normal', label: 'Normal', keys: '⇧⌘N', src: 'NormalStyle', cat: 'para', when: 'text', icon: (a) => txt(30, 46, 'Aa', W, 40, { w: 400 }) + line(10, 57, 54, 57, a, 4) },
  { id: 'bullets', label: 'Bullets', keys: '⇧⌘L', src: 'ApplyListBullet', cat: 'para', when: 'text', icon: (a) => [14, 32, 50].map((y) => dot(10, y, 5, a) + line(24, y, 58, y)).join('') },
  { id: 'align-left', label: 'Align left', keys: '⌘L', src: 'LeftPara', cat: 'para', when: 'text', icon: (a) => line(6, 10, 58, 10) + line(6, 24, 40, 24, a) + line(6, 38, 58, 38) + line(6, 52, 34, 52, a) },
  { id: 'center', label: 'Center', keys: '⌘E', src: 'CenterPara', cat: 'para', when: 'text', icon: (a) => line(6, 10, 58, 10) + line(16, 24, 48, 24, a) + line(6, 38, 58, 38) + line(20, 52, 44, 52, a) },
  { id: 'page-break', label: 'Page break', keys: '⌘↩', src: 'InsertPageBreak · Insert ▸ Break ▸ Page Break', cat: 'para', when: 'text', icon: (a) => pathS('M12 4 V22 H52 V4') + pathS('M12 60 V42 H52 V60') + line(4, 32, 60, 32, a, 3.6).replace('/>', ' stroke-dasharray="5 6"/>') },

  // row 4 — review & view
  { id: 'track-changes', label: 'Track changes', keys: '⇧⌘E', src: 'ToolsRevisionMarksToggle', cat: 'rev', when: 'document', icon: (a) => page() + line(22, 30, 44, 30, '#ffffff88', 3.4) + line(22, 40, 44, 40, a, 3.4) + line(22, 50, 38, 50, '#ffffff88', 3.4) + line(4, 34, 4, 46, RED, 4) },
  { id: 'comment', label: 'Comment', keys: '⌥⌘A', src: 'InsertAnnotation', cat: 'rev', when: 'document', icon: (a) => pathS('M12 6 H52 Q58 6 58 12 V40 Q58 46 52 46 H26 L14 57 V46 H12 Q6 46 6 40 V12 Q6 6 12 6 Z', a, `${a}33`) + line(18, 20, 46, 20, W, 3.4) + line(18, 32, 38, 32, W, 3.4) },
  { id: 'footnote', label: 'Footnote', keys: '⌥⌘F', src: 'InsertFootnoteNow', cat: 'rev', when: 'text', icon: (a) => line(6, 10, 46, 10) + line(6, 24, 40, 24) + txt(54, 22, '1', a, 22, { w: 700 }) + line(6, 40, 26, 40, '#ffffff77', 3) + txt(10, 58, '1', a, 16, { w: 700 }) + line(20, 53, 54, 53, a, 3.4) },
  { id: 'spelling', label: 'Spelling', keys: '⌥⌘L', src: 'ToolsProofing', cat: 'rev', when: 'document', icon: (a) => txt(32, 34, 'abc', W, 30, { w: 700 }) + pathS('M6 46 Q10 40 14 46 T22 46 T30 46 T38 46', RED, 'none', 3.2) + poly('38,50 46,58 60,40', a, 5) },
  { id: 'thesaurus', label: 'Thesaurus', keys: '⌃⌥⌘R', src: 'ToolsThesaurusRR · Tools ▸ Thesaurus…', cat: 'rev', when: 'text', icon: (a) => pathS('M32 12 Q20 6 6 8 V54 Q20 52 32 58 Q44 52 58 54 V8 Q44 6 32 12 Z') + line(32, 12, 32, 58, a) + line(14, 22, 24, 23, '#ffffff88', 3) + line(40, 23, 50, 22, '#ffffff88', 3) },
  { id: 'focus', label: 'Focus', keys: '⌃⇧⌘F', src: 'ToggleFocusMode · View ▸ Focus', cat: 'rev', when: 'document', icon: (a) => poly('6,20 6,6 20,6', a, 5) + poly('44,6 58,6 58,20', a, 5) + poly('58,44 58,58 44,58', a, 5) + poly('20,58 6,58 6,44', a, 5) + line(20, 24, 44, 24, W, 3.6) + line(20, 32, 44, 32, W, 3.6) + line(20, 40, 36, 40, W, 3.6) },
  { id: 'styles-pane', label: 'Styles pane', keys: '⌥⇧⌘S', src: 'ToggleStylesPane', cat: 'rev', when: 'document', icon: (a) => rect(4, 6, 56, 52, 8) + line(38, 8, 38, 56) + txt(21, 40, 'Aa', W, 22, { w: 700 }) + line(44, 20, 54, 20, a, 3.6) + line(44, 32, 54, 32, a, 3.6) + line(44, 44, 54, 44, a, 3.6) },
  { id: 'copilot', label: 'Copilot', keys: '⌃⌘I', src: 'SetFocusToCopilot', cat: 'rev', when: 'document', icon: (a) => pathS('M28 6 Q31 24 48 28 Q31 32 28 50 Q25 32 8 28 Q25 24 28 6 Z', a, `${a}55`) + pathS('M48 38 Q49.5 46 56 47.5 Q49.5 49 48 57 Q46.5 49 40 47.5 Q46.5 46 48 38 Z', W, W, 2) },
];

function tile(k) {
  const a = k.c || C[k.cat];
  const bg = k.hero ? ['#232a40', '#151a29', '#0a0c13'] : ['#1d2232', '#141824', '#0b0d14'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
<defs>
  <radialGradient id="bg" cx="50%" cy="20%" r="95%">
    <stop offset="0" stop-color="${bg[0]}"/><stop offset="0.55" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/>
  </radialGradient>
  <radialGradient id="wash" cx="50%" cy="34%" r="44%">
    <stop offset="0" stop-color="${k.hero ? '#6fd6f8' : a}" stop-opacity="${k.hero ? 0.16 : 0.14}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#000" flood-opacity="0.5"/>
  </filter>
</defs>
<rect width="144" height="144" fill="url(#bg)"/>
<rect width="144" height="144" fill="url(#wash)"/>
${k.hero ? '' : `<g opacity="0.55">${txt(17, 26, '¶', a, 17, { w: 700 })}</g>`}
<g transform="${k.hero ? HERO_GLYPH : 'translate(40 14)'}" filter="url(#lift)">${k.icon(a)}</g>
${k.hero ? '' : fitLabel(k.label, { family: SANS, weight: 700, font: FONT }).map((l) => `<text x="72" y="${l.y}" font-family="${SANS}" font-size="${l.size}" font-weight="700" fill="${W}" stroke="${W}" stroke-width="0.25" text-anchor="middle" filter="url(#lift)">${l.text}</text>`).join('\n')}
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
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" rx="36" fill="#0a0c12"/>${imgs}</svg>`;
fs.writeFileSync(path.join(OUT, 'sheet.png'), new Resvg(sheet, { fitTo: { mode: 'width', value: sheetW } }).render().asPng());
console.log(`wrote ${KEYS.length} keys to ${OUT} (labels in ${SANS})`);
