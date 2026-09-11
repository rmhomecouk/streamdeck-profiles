#!/usr/bin/env python3
"""Dump the menu keyboard shortcuts from a compiled macOS MainMenu.nib (NIBArchive format).

Usage: python3 tools/nib-shortcuts.py "/Applications/Safari.app/Contents/Resources/Base.lproj/MainMenu.nib"

Modern compiled nibs are NIBArchive, not property lists. Layout: "NIBArchive" magic, two
uint32 versions, then (count, offset) pairs for objects, keys, values and class names.
Integers inside the tables are varints whose final byte has the high bit set.
"""
import struct
import sys

MODS = [(1 << 18, '⌃'), (1 << 19, '⌥'), (1 << 17, '⇧'), (1 << 20, '⌘')]  # display order
KEYS = {'\x1b': 'esc', '\r': '↩', '\x7f': '⌫', '\x08': '⌫', '\t': '⇥', ' ': 'Space',
        '': '↑', '': '↓', '': '←', '': '→',
        '': 'Home', '': 'End', '': 'PgUp', '': 'PgDn'}
SIZES = {0: 1, 1: 2, 2: 4, 3: 8, 4: 0, 5: 0, 6: 4, 7: 8, 9: 0, 10: 4}
FMT = {0: '<b', 1: '<h', 2: '<i', 3: '<q', 6: '<f', 7: '<d', 10: '<I'}


def parse(path):
    b = open(path, 'rb').read()
    if b[:10] != b'NIBArchive':
        sys.exit(f'{path}: not a NIBArchive file (starts with {b[:10]!r})')
    oc, oo, kc, ko, vc, vo, cc, co = struct.unpack_from('<10I', b, 10)[2:]

    def vint(p):
        r = s = 0
        while True:
            x = b[p]; p += 1
            r |= (x & 0x7f) << s; s += 7
            if x & 0x80:
                return r, p

    keys, p = [], ko
    for _ in range(kc):
        n, p = vint(p); keys.append(b[p:p + n].decode('utf8', 'replace')); p += n
    classes, p = [], co
    for _ in range(cc):
        n, p = vint(p); extra, p = vint(p); p += 4 * extra
        classes.append(b[p:p + n].rstrip(b'\0').decode()); p += n
    values, p = [], vo
    for _ in range(vc):
        k, p = vint(p); t = b[p]; p += 1
        if t == 8:
            n, p = vint(p); v = b[p:p + n]; p += n
        else:
            raw = b[p:p + SIZES[t]]; p += SIZES[t]
            if t == 4: v = True
            elif t == 5: v = False
            elif t == 9: v = None
            elif t == 10: v = ('ref', struct.unpack(FMT[t], raw)[0])
            else: v = struct.unpack(FMT[t], raw)[0]
        values.append((keys[k], v))
    objects, p = [], oo
    for _ in range(oc):
        c, p = vint(p); vi, p = vint(p); n, p = vint(p)
        objects.append((classes[c], dict(values[vi:vi + n])))
    return objects


def main(path):
    objects = parse(path)

    def text(ref):
        if not (isinstance(ref, tuple) and ref[0] == 'ref'):
            return ref
        d = objects[ref[1]][1]
        return d['NS.bytes'].decode('utf8', 'replace') if 'NS.bytes' in d else None

    rows = []
    for _, d in objects:
        if 'NSKeyEquiv' not in d:
            continue
        key = text(d['NSKeyEquiv'])
        if not key:
            continue
        mask = d.get('NSKeyEquivModMask', 1 << 20)  # missing mask means ⌘
        if len(key) == 1 and key.isalpha() and key.isupper():
            mask |= 1 << 17  # AppKit: an uppercase key equivalent implies ⇧
        shown = KEYS.get(key, key.upper() if len(key) == 1 and key.isalpha() else key)
        menu = text(objects[d['NSMenu'][1]][1].get('NSTitle')) if isinstance(d.get('NSMenu'), tuple) else '?'
        combo = ''.join(sym for bit, sym in MODS if mask & bit) + shown
        rows.append((combo, menu or '?', text(d.get('NSTitle')) or '?', ' (alternate)' if d.get('NSIsAlternate') else ''))

    for combo, menu, title, alt in rows:
        print(f'{combo:10} {menu:>14} ▸ {title}{alt}')
    print(f'{len(rows)} shortcuts', file=sys.stderr)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
