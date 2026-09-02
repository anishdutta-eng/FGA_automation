#!/usr/bin/env python3
"""
Extract the Snowbird board outline from the QuickView geometry cache that Allegro
embeds inside the .brd file, and write it out as SVG.

This is a *preview* path only. It gives a verified board outline and top-side
silkscreen/assembly geometry without needing any EDA tool. It deliberately does
NOT attempt to be a substitute for a real import: the cache contains no nets, no
pads/vias/drills, and no inner-layer copper.

Units: the design header reports "Units: Millimeters, Accuracy: 3", i.e. Allegro
internal units are microns (1/1000 mm). Coordinates are therefore divided by 1000
to yield millimetres.
"""

import json
import math
import re
import struct
import sys
import zlib
from pathlib import Path

BRD = Path(__file__).resolve().parent.parent / '175-02000-A-20240802_0802_1009.brd'
OUT_DIR = Path(__file__).resolve().parent.parent / 'out'

UM_PER_MM = 1000.0


def find_geometry_cache(brd_path: Path) -> dict:
    """Pull the largest JSON blob out of the .brd's embedded ZIP members."""
    data = brd_path.read_bytes()
    best = None
    for m in re.finditer(b'PK\x03\x04', data):
        h = m.start()
        try:
            method = struct.unpack('<H', data[h + 8:h + 10])[0]
            csz = struct.unpack('<I', data[h + 18:h + 22])[0]
            usz = struct.unpack('<I', data[h + 22:h + 26])[0]
            nlen = struct.unpack('<H', data[h + 26:h + 28])[0]
            elen = struct.unpack('<H', data[h + 28:h + 30])[0]
            start = h + 30 + nlen + elen
            if method == 8:
                blob = data[start:start + csz] if csz else data[start:start + 8_000_000]
                raw = zlib.decompressobj(-15).decompress(blob)
            else:
                raw = data[start:start + (csz or usz)]
        except Exception:
            continue
        if raw[:1] != b'{':
            continue
        if best is None or len(raw) > len(best):
            best = raw
    if best is None:
        raise SystemExit('No JSON geometry cache found inside the .brd')
    return json.loads(best.decode('utf8', 'replace'))


def arc_to_polyline(comp, steps: int = 48):
    """Type-6 records are arcs: centre in `points`, ends in `endpts`, plus start/end angle."""
    c = comp['points'][0]
    cx, cy = c['x'], c['y']
    r = comp.get('radius', 0.0)
    a0 = comp.get('start', 0.0)
    a1 = comp.get('end', 0.0)
    clockwise = bool(comp.get('clockwise', 0))

    # Normalise sweep direction
    sweep = a1 - a0
    if clockwise:
        while sweep > 0:
            sweep -= 2 * math.pi
    else:
        while sweep < 0:
            sweep += 2 * math.pi

    pts = []
    for i in range(steps + 1):
        a = a0 + sweep * (i / steps)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def collect(comps, predicate):
    """Return list of polylines (in microns) for matching records."""
    polys = []
    for c in comps:
        if not predicate(c):
            continue
        t = c.get('type')
        if t == 6:
            polys.append(arc_to_polyline(c))
        elif t in (2, 3, 1):
            pts = [(p['x'], p['y']) for p in c.get('points', [])
                   if isinstance(p, dict) and 'x' in p]
            if len(pts) >= 2:
                polys.append(pts)
    return polys


def bounds(polys):
    xs = [x for p in polys for x, _ in p]
    ys = [y for p in polys for _, y in p]
    return min(xs), min(ys), max(xs), max(ys)


def write_svg(path: Path, layers, view):
    minx, miny, maxx, maxy = view
    w_mm = (maxx - minx) / UM_PER_MM
    h_mm = (maxy - miny) / UM_PER_MM

    def tx(x, y):
        # SVG y grows downward; Allegro y grows upward.
        return (x - minx) / UM_PER_MM, (maxy - y) / UM_PER_MM

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{w_mm:.3f}mm" height="{h_mm:.3f}mm" '
        f'viewBox="0 0 {w_mm:.3f} {h_mm:.3f}">',
        '<rect width="100%" height="100%" fill="#0b1a12"/>',
    ]
    for name, polys, stroke, width, opacity in layers:
        parts.append(f'<g id="{name}" stroke="{stroke}" stroke-width="{width}" '
                     f'fill="none" opacity="{opacity}" '
                     f'stroke-linecap="round" stroke-linejoin="round">')
        for p in polys:
            d = ' '.join(
                ('M' if i == 0 else 'L') + f'{tx(x, y)[0]:.4f},{tx(x, y)[1]:.4f}'
                for i, (x, y) in enumerate(p)
            )
            parts.append(f'<path d="{d}"/>')
        parts.append('</g>')
    parts.append('</svg>')
    path.write_text('\n'.join(parts))


def main():
    j = find_geometry_cache(BRD)
    comps = j['design']['comps']

    outline = collect(comps, lambda c: c.get('subclass') == 'DESIGN_OUTLINE')
    silk_top = collect(comps, lambda c: c.get('subclass') == 'SILKSCREEN_TOP')
    asm_top = collect(comps, lambda c: c.get('subclass') == 'ASSEMBLY_TOP')
    etch_top = collect(comps, lambda c: c.get('class') == 'ETCH'
                       and c.get('subclass') == 'TOP')

    if not outline:
        raise SystemExit('No DESIGN_OUTLINE geometry found')

    minx, miny, maxx, maxy = bounds(outline)
    w = (maxx - minx) / UM_PER_MM
    h = (maxy - miny) / UM_PER_MM

    print('Snowbird board outline (from embedded Allegro geometry cache)')
    print('-' * 60)
    print(f'  outline segments : {len(outline)}')
    print(f'  extents (um)     : X {minx} .. {maxx}   Y {miny} .. {maxy}')
    print(f'  BOARD SIZE       : {w:.3f} mm x {h:.3f} mm')
    print(f'                   : {w / 25.4:.3f} in x {h / 25.4:.3f} in')
    print(f'  area             : {w * h / 100:.2f} cm^2')
    print()
    print(f'  top silkscreen   : {len(silk_top)} polylines')
    print(f'  top assembly     : {len(asm_top)} polylines')
    print(f'  top etch         : {len(etch_top)} polylines  (preview cache only)')

    OUT_DIR.mkdir(exist_ok=True)
    view = (minx, miny, maxx, maxy)

    write_svg(OUT_DIR / 'snowbird_outline.svg',
              [('outline', outline, '#66ff99', 0.30, 1.0)], view)

    write_svg(OUT_DIR / 'snowbird_preview.svg', [
        ('etch_top', etch_top, '#d98c00', 0.08, 0.75),
        ('assembly_top', asm_top, '#4488cc', 0.05, 0.55),
        ('silk_top', silk_top, '#e8e8e8', 0.05, 0.75),
        ('outline', outline, '#66ff99', 0.25, 1.0),
    ], view)

    print()
    print(f'  wrote {OUT_DIR / "snowbird_outline.svg"}')
    print(f'  wrote {OUT_DIR / "snowbird_preview.svg"}')


if __name__ == '__main__':
    main()
