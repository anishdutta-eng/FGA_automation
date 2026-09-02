#!/usr/bin/env python3
"""
Prove that net-level connectivity survived the Allegro -> KiCad import, which is
what makes circuit analysis in the 3D/PCB viewer possible.

For a given net, report every footprint pad on it plus how much copper carries
it on each layer. Run with a net name, or with no argument for a summary.

    python3 tools/net_trace.py DDR_DQ0
    python3 tools/net_trace.py POE_5V
    python3 tools/net_trace.py
"""

import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

PCB = Path(__file__).resolve().parent.parent / 'kicad_import' / 'snowbird.kicad_pcb'

KI2ALLEGRO = {
    'F.Cu': 'TOP', 'In1.Cu': 'LYR02_GND', 'In2.Cu': 'LYR03-S1',
    'In3.Cu': 'LYR04_PWR', 'In4.Cu': 'LYR05-S2', 'B.Cu': 'BOTTOM',
}

fp_re = re.compile(r'^\(footprint |^\t\(footprint ')
ref_re = re.compile(r'\(property "Reference" "([^"]+)"')
pad_re = re.compile(r'\(pad "([^"]*)"')
net_re = re.compile(r'\(net "([^"]*)"\)')
layer_re = re.compile(r'\(layer "([^"]+)"\)')


def parse():
    """Single streaming pass: pads-per-net (with refdes) and copper-per-net-per-layer."""
    pads = defaultdict(list)          # net -> [(refdes, pad)]
    copper = defaultdict(Counter)     # net -> Counter(layer -> n objects)
    nets = set()

    cur_ref = None
    cur_pad = None
    in_pad = False

    # context for standalone copper objects
    obj_layer = None
    obj_kind = None
    depth_stack = []

    with PCB.open(encoding='utf8', errors='replace') as fh:
        for raw in fh:
            s = raw.strip()

            if s.startswith('(footprint '):
                cur_ref = None
                continue

            m = ref_re.search(s)
            if m and cur_ref is None:
                cur_ref = m.group(1)

            if s.startswith('(pad '):
                in_pad = True
                cur_pad = pad_re.match(s).group(1) if pad_re.match(s) else '?'

            if s.startswith(('(segment', '(via', '(arc', '(zone')):
                obj_kind = s[1:].split()[0]
                obj_layer = None
                in_pad = False

            m = layer_re.search(s)
            if m:
                obj_layer = m.group(1)

            m = net_re.search(s)
            if m:
                n = m.group(1)
                nets.add(n)
                if in_pad:
                    pads[n].append((cur_ref or '?', cur_pad or '?'))
                    in_pad = False
                elif obj_kind:
                    lay = obj_layer if obj_layer in KI2ALLEGRO else (
                        'via/multi' if obj_kind == 'via' else (obj_layer or '?'))
                    copper[n][lay] += 1

    return pads, copper, nets


def main():
    pads, copper, nets = parse()

    if len(sys.argv) < 2:
        print(f'nets with connectivity : {len(nets)}')
        print(f'nets with >=1 pad      : {sum(1 for n in pads if pads[n])}')
        print(f'nets with copper       : {len(copper)}')
        print()
        top = sorted(pads.items(), key=lambda kv: -len(kv[1]))[:12]
        print('highest-fanout nets (pad count):')
        for n, p in top:
            print(f'  {n:<28} {len(p):>5} pads')
        print()
        print('try:  python3 tools/net_trace.py DDR_DQ0')
        return

    want = sys.argv[1]
    if want not in nets:
        near = [n for n in sorted(nets) if want.upper() in n.upper()][:15]
        print(f'net "{want}" not found.')
        if near:
            print('did you mean:', ', '.join(near))
        return

    p = pads.get(want, [])
    c = copper.get(want, Counter())

    print(f'NET: {want}')
    print('=' * 60)
    print(f'connected pads: {len(p)}')
    by_ref = defaultdict(list)
    for ref, pad in p:
        by_ref[ref].append(pad)
    for ref in sorted(by_ref):
        pl = ','.join(sorted(by_ref[ref]))
        print(f'  {ref:<10} pin {pl}')
    print()
    print('copper carrying this net:')
    if not c:
        print('  (none found)')
    for lay, n in sorted(c.items(), key=lambda kv: -kv[1]):
        alias = KI2ALLEGRO.get(lay)
        label = f'{lay} ({alias})' if alias else lay
        print(f'  {label:<26} {n:>5} objects')


if __name__ == '__main__':
    main()
