#!/usr/bin/env python3
"""
Cross-check the KiCad-imported board against facts independently extracted from
the raw Allegro .brd. Line-based streaming so it stays fast on a 40 MB file.
"""

import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PCB = ROOT / 'kicad_import' / 'snowbird.kicad_pcb'

net_re = re.compile(r'\(net\s+"([^"]*)"\)')
ref_re = re.compile(r'\(property\s+"Reference"\s+"([A-Za-z]+)(\d+)"')
xy_re = re.compile(r'\((?:start|end|mid|center|xy)\s+(-?[\d.]+)\s+(-?[\d.]+)\)')
layer_re = re.compile(r'\(layer\s+"([^"]+)"\)')
cu_re = re.compile(r'\(\s*\d+\s+"((?:F|B|In\d+)\.Cu)"\s+\w+(?:\s+"([^"]*)")?')

nets = set()
refs = Counter()
counts = Counter()
edge_x, edge_y = [], []
layer_hits = Counter()

# Edge.Cuts geometry is emitted as a block whose (layer ...) line follows the
# coordinates, so buffer recent coordinates and commit them when we see the layer.
pending = []

with PCB.open(encoding='utf8', errors='replace') as fh:
    for line in fh:
        s = line.strip()

        m = net_re.search(s)
        if m:
            nets.add(m.group(1))

        m = ref_re.search(s)
        if m:
            refs[m.group(1)] += 1

        for tok in ('(footprint ', '(segment', '(via', '(zone', '(pad ',
                    '(gr_line', '(gr_arc', '(gr_poly', '(arc'):
            if s.startswith(tok):
                counts[tok.strip('( ')] += 1

        if s.startswith('(gr_') or s.startswith('(segment') or s.startswith('(arc'):
            pending = []
        coords = xy_re.findall(s)
        if coords:
            pending.extend(coords)

        m = layer_re.search(s)
        if m:
            layer_hits[m.group(1)] += 1
            if m.group(1) == 'Edge.Cuts' and pending:
                for x, y in pending:
                    edge_x.append(float(x))
                    edge_y.append(float(y))
            pending = []

head = PCB.read_text(encoding='utf8', errors='replace')[:4000]
cu = cu_re.findall(head)
thick = re.search(r'\(thickness\s+([\d.]+)\)', head)

print('KiCad import cross-check')
print('=' * 66)
print(f'{"copper layers":<24}: {len(cu)}')
for k, (kn, an) in enumerate(cu):
    print(f'{"":24}    {kn:<8} <- Allegro "{an}"')
print()
print(f'{"declared thickness":<24}: {thick.group(1) if thick else "?"} mm'
      '   <-- KiCad default, NOT the real value')
print(f'{"real total (from .brd)":<24}: 0.992 mm')
print()
print(f'{"unique net names":<24}: {len(nets)}')
print(f'{"footprints":<24}: {counts["footprint"]}')
print(f'{"track segments":<24}: {counts["segment"]}')
print(f'{"arcs":<24}: {counts["arc"]}')
print(f'{"vias":<24}: {counts["via"]}')
print(f'{"zones":<24}: {counts["zone"]}')
print(f'{"pads":<24}: {counts["pad"]}')
print()
if edge_x:
    w = max(edge_x) - min(edge_x)
    h = max(edge_y) - min(edge_y)
    print(f'{"Edge.Cuts size":<24}: {w:.3f} mm x {h:.3f} mm')
    print(f'{"expected (from .brd)":<24}: 125.000 mm x 103.340 mm')
    ok = abs(w - 125.0) < 0.05 and abs(h - 103.34) < 0.05
    print(f'{"match":<24}: {"YES" if ok else "CHECK"}')
print()
print('refdes prefixes:',
      ', '.join(f'{k}={v}' for k, v in refs.most_common(14)))
print()
print('sample nets by function:')
for label, keys in [('DDR4', ('DDR_DQ', 'DDR_CK', 'DDR_A')),
                    ('RF 5G', ('5G_CH0', '5G_CH1')),
                    ('PoE', ('POE',)),
                    ('USB-C', ('USBC',)),
                    ('eMMC', ('EMMC',))]:
    hits = sorted(n for n in nets if any(k in n.upper() for k in keys))
    print(f'  {label:<7} {len(hits):>4} nets   e.g. {", ".join(hits[:5])}')
