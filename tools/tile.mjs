// Shared tile layout for every deck's gen.mjs.
//
// A key tile is a 144-unit square: the 64-unit glyph group at translate(40 14) (or 40 16), then the key's name
// underneath, as large as it fits. The shortcut isn't printed on the key; the mockup page and README list it.
// The top-left tile has no text: its app mark is scaled to fill the key, and the launcher reuses that tile as is.
import { Resvg } from '@resvg/resvg-js';

// transform for the top-left tile's mark group (64 units → 120 units, 12 units from each edge)
export const HERO_GLYPH = 'translate(12 12) scale(1.875)';

// the space under the glyph, in tile units
const ZONE = { top: 84, bottom: 134, width: 118 };
const CAP = 0.7; // cap height as a share of the font size, close enough for every face the decks use
const LEAD = 1.06; // baseline-to-baseline distance for two lines, as a share of the font size

const widths = new Map();
// width of `text` set at 100 units in the given face, measured by resvg itself so it matches the render
function width100(text, { family, weight = 400, font }) {
  const key = `${family}|${weight}|${text}`;
  if (!widths.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="200"><text x="10" y="150" font-family="${family}" font-weight="${weight}" font-size="100">${text}</text></svg>`;
    const box = new Resvg(svg, { font }).getBBox();
    widths.set(key, box ? box.width : text.length * 60);
  }
  return widths.get(key);
}

// Lays a key's name out under its glyph. Returns [{ text, size, y }], one or two lines, centred in the zone.
// One line is used when it fits at `min` or larger; otherwise the name splits at the space that gives the
// biggest pair of lines. Nothing grows past `max`.
export function fitLabel(text, face, { max = 24, min = 22, glyphBottom = 78 } = {}) {
  const top = Math.max(ZONE.top, glyphBottom + 6);
  const fit = (s) => Math.min(max, (ZONE.width * 100) / width100(s, face));
  const one = fit(text);
  const words = text.split(' ');
  let two = null;
  if (one < min && words.length > 1) {
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const size = Math.min(fit(a), fit(b));
      // on a tie (both lines at `max`), keep the lines as even as possible
      const long = Math.max(width100(a, face), width100(b, face));
      if (!two || size > two.size + 0.05 || (Math.abs(size - two.size) <= 0.05 && long < two.long)) two = { a, b, size, long };
    }
  }
  const mid = (top + ZONE.bottom) / 2;
  const r = (v) => Math.round(v * 10) / 10;
  if (!two || two.size <= one) {
    const size = r(one);
    return [{ text, size, y: r(mid + (size * CAP) / 2) }];
  }
  const size = r(Math.min(two.size, (ZONE.bottom - top) / (CAP + LEAD)));
  const y1 = mid - (size * (CAP + LEAD)) / 2 + size * CAP;
  return [{ text: two.a, size, y: r(y1) }, { text: two.b, size, y: r(y1 + size * LEAD) }];
}
