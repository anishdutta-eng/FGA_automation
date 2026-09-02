#!/usr/bin/env python3
"""
What identifying / dimensional data does each imported footprint actually carry?

This decides whether components can be populated with 3D bodies, and by what key.
Footprints are top-level "\t(footprint" blocks; walk with paren depth so we
attribute properties and geometry to the right instance.
"""

import re
from collections import Counter, defaultdict
from pathlib import Path

PCB = Path(__file__).resolve().parent.parent / 'kicad_import' / 'snowbird.kicad_pcb'

FP = re.compile(r'^\t\(footprint\s+"([^"]*)"')
PROP = re.compile(r'\(property\s+"([^"]*)"\s+"([^"]*)"')
LAYER = re.compile(r'\(layer\s+"([^"]+)"\)')
XY = re.compile(r'\((?:start|end|mid|center|xy|at)\s+(-?[\d.]+)\s+(-?[\d.]+)')
PADLINE = re.compile(r'^\s*\(pad\s+"([^"]*)"\s+(\S+)\s+(\S+)')
SIZE = re.compile(r'\(size\s+([\d.]+)\s+([\d.]+)\)')

names = Counter()
prop_keys = Counter()
n_fp = 0
n_named = 0
n_ref = 0
n_model = 0
have_crtyd = 0
have_fab = 0
have_pads = 0

prop_examples = defaultdict(list)
per_fp = []          # (name, ref, props, crtyd_wh, pad_bbox_wh, npads)

cur = None


def flush():
    global have_crtyd, have_fab, have_pads, n_named, n_ref, n_model
    if cur is None:
        return
    if cur['name']:
        n_named += 1
    if cur['props'].get('Reference'):
        n_ref += 1
    if cur['model']:
        n_model += 1
    cw = None
    if cur['crtyd_x']:
        have_crtyd += 1
        cw = (max(cur['crtyd_x']) - min(cur['crtyd_x']),
              max(cur['crtyd_y']) - min(cur['crtyd_y']))
    if cur['fab_x']:
        have_fab += 1
    pw = None
    if cur['pad_x']:
        have_pads += 1
        pw = (max(cur['pad_x']) - min(cur['pad_x']),
              max(cur['pad_y']) - min(cur['pad_y']))
    per_fp.append((cur['name'], cur['props'].get('Reference', ''),
                   dict(cur['props']), cw, pw, cur['npads']))


def new_fp(name):
    return {'name': name, 'props': {}, 'model': False, 'npads': 0,
            'crtyd_x': [], 'crtyd_y': [], 'fab_x': [], 'fab_y': [],
            'pad_x': [], 'pad_y': []}


with PCB.open(encoding='utf8', errors='replace') as fh:
    pending = []
    ctx = None
    for raw in fh:
        m = FP.match(raw)
        if m:
            flush()
            cur = new_fp(m.group(1))
            n_fp += 1
            names[m.group(1)] += 1
            pending, ctx = [], None
            continue
        if cur is None:
            continue

        s = raw.strip()

        pm = PROP.search(s)
        if pm:
            cur['props'][pm.group(1)] = pm.group(2)
            prop_keys[pm.group(1)] += 1
            if pm.group(2) and len(prop_examples[pm.group(1)]) < 6:
                prop_examples[pm.group(1)].append(pm.group(2))

        if '(model ' in s:
            cur['model'] = True

        pl = PADLINE.match(raw)
        if pl:
            cur['npads'] += 1
            ctx = 'pad'
            pending = []
        elif s.startswith('(fp_'):
            ctx = 'graphic'
            pending = []

        if ctx == 'pad':
            am = re.search(r'\(at\s+(-?[\d.]+)\s+(-?[\d.]+)', s)
            sm = SIZE.search(s)
            if am:
                cur['_px'], cur['_py'] = float(am.group(1)), float(am.group(2))
            if sm and '_px' in cur:
                hw, hh = float(sm.group(1)) / 2, float(sm.group(2)) / 2
                cur['pad_x'] += [cur['_px'] - hw, cur['_px'] + hw]
                cur['pad_y'] += [cur['_py'] - hh, cur['_py'] + hh]
                ctx = None
        elif ctx == 'graphic':
            pending += XY.findall(s)
            lm = LAYER.search(s)
            if lm:
                if lm.group(1) in ('F.CrtYd', 'B.CrtYd'):
                    for x, y in pending:
                        cur['crtyd_x'].append(float(x)); cur['crtyd_y'].append(float(y))
                elif lm.group(1) in ('F.Fab', 'B.Fab'):
                    for x, y in pending:
                        cur['fab_x'].append(float(x)); cur['fab_y'].append(float(y))
                pending, ctx = [], None

flush()

print('IMPORTED FOOTPRINT SURVEY')
print('=' * 68)
print(f'footprint instances      : {n_fp}')
print(f'  with library name       : {n_named}   <-- mapping key by name')
print(f'  with Reference (refdes) : {n_ref}')
print(f'  with (model ...) 3D     : {n_model}')
print(f'  with courtyard geometry : {have_crtyd}')
print(f'  with F.Fab/B.Fab body   : {have_fab}')
print(f'  with pads (bbox usable) : {have_pads}')
print()
print('property keys present across footprints:')
for k, v in prop_keys.most_common():
    ex = ', '.join(repr(e) for e in prop_examples[k][:3]) or '(all empty)'
    print(f'  {k:<22} {v:>6}   e.g. {ex[:90]}')
print()
nonempty = [n for n in names if n]
print(f'unique library names (non-empty): {len(nonempty)}')
for n in sorted(nonempty)[:20]:
    print('   ', n)
print()
# Can we size bodies?
sized = [f for f in per_fp if f[3] or f[4]]
print(f'footprints with usable XY footprint size: {len(sized)} / {n_fp}')
print()
print('examples (ref, courtyard WxH, padbbox WxH, npads):')
shown = 0
for name, ref, props, cw, pw, npads in per_fp:
    if ref and (cw or pw):
        c = f'{cw[0]:.2f}x{cw[1]:.2f}' if cw else '-'
        p = f'{pw[0]:.2f}x{pw[1]:.2f}' if pw else '-'
        print(f'  {ref:<9} crtyd {c:<14} pads {p:<14} n={npads}')
        shown += 1
        if shown >= 15:
            break
