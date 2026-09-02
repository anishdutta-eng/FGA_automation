#!/usr/bin/env python3
"""
Can components be populated WITHOUT obtaining any new file?

Footprint library names came through empty, so name-based mapping to KiCad's
bundled 3D library is impossible. But the Allegro importer preserved "Value" and
"Device Type" text, and eero's library uses IPC-7351 package codes that encode
body height in hundredths of a millimetre:

    CAPC0603X35L                  -> 0603 metric body, 0.35 mm tall
    RESC0603X26L                  -> 0603 metric body, 0.26 mm tall
    FBGA96C80P9X16_1040X1340X120  -> 10.40 x 13.40 x 1.20 mm

Combined with courtyard / F.Fab outlines for XY extent, that is enough to build
real component bodies with no new input file. This measures the coverage.
"""

import re
from collections import Counter
from pathlib import Path

PCB = Path(__file__).resolve().parent.parent / 'kicad_import' / 'snowbird.kicad_pcb'

FP = re.compile(r'^\t\(footprint\s+"([^"]*)"')
PROP = re.compile(r'\(property\s+"([^"]*)"\s+"([^"]*)"')

# Guard with explicit non-alphanumeric lookarounds; \b fails against '_'.
NA = r'(?<![A-Z0-9])'
PAT_XYZ = re.compile(NA + r'(\d{3,5})X(\d{3,5})X(\d{2,4})(?![0-9])')
PAT_IPC = re.compile(NA + r'[A-Z]{2,6}(\d{4})X(\d{2,3})[A-Z]?(?![0-9])')

rows = []
cur = None


def collect(raw, store):
    pm = PROP.search(raw)
    if pm:
        k, v = pm.group(1), pm.group(2)
        # prefer the first NON-EMPTY value for a key
        if v and not store.get(k):
            store[k] = v
        store.setdefault(k, v)


with PCB.open(encoding='utf8', errors='replace') as fh:
    for raw in fh:
        if FP.match(raw):
            if cur is not None:
                rows.append(cur)
            cur = {}
            continue
        if cur is not None:
            collect(raw, cur)
if cur is not None:
    rows.append(cur)

print(f'footprint instances: {len(rows)}')

nonempty = lambda k: sum(1 for r in rows if r.get(k))
for k in ('Reference', 'Value', 'Device Type'):
    print(f'  non-empty {k:<12}: {nonempty(k)}')
print()


def height_mm(*texts):
    for t in texts:
        if not t:
            continue
        u = t.upper()
        m = PAT_XYZ.search(u)
        if m:
            return int(m.group(3)) / 100.0, m.group(0), 'XYZ'
        m = PAT_IPC.search(u)
        if m:
            return int(m.group(2)) / 100.0, m.group(0), 'IPC'
    return None, None, None


resolved = 0
kinds = Counter()
heights = Counter()
tokens = Counter()
unresolved = Counter()

for r in rows:
    val, dev = r.get('Value', ''), r.get('Device Type', '')
    h, tok, kind = height_mm(dev, val)
    if h and 0.05 <= h <= 25:
        resolved += 1
        heights[round(h, 2)] += 1
        kinds[kind] += 1
        tokens[tok] += 1
    else:
        unresolved[(val or dev or '(no text)')[:60]] += 1

pct = 100 * resolved / len(rows)
print(f'height resolvable from existing text : {resolved} / {len(rows)}  ({pct:.1f}%)')
print(f'  by encoding : {dict(kinds)}')
print()
print('most common resolved heights:')
for h, n in heights.most_common(12):
    print(f'  {h:>6.2f} mm   x{n}')
print()
print('most common package tokens parsed:')
for t, n in tokens.most_common(14):
    print(f'  x{n:<5} {t}')
print()
print(f'NOT resolvable: {sum(unresolved.values())} instances, '
      f'{len(unresolved)} distinct strings')
for v, n in unresolved.most_common(12):
    print(f'  x{n:<5} {v}')
