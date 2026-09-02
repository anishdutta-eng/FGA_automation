#!/usr/bin/env python3
"""
build_board_json.py — the glue that makes the accelerator possible.

Joins the two halves of the Snowbird groundwork into one runtime file:

  * engine/source/kicad_import/snowbird.kicad_pcb   (real geometry + nets)
      -> refdes -> (x, y, side, value)
      -> net    -> member footprints
      -> board outline (Edge.Cuts) + size
  * engine/debugger/board_pack.json                 (diagnosis knowledge)
      -> test points w/ spec limits, phase/group, power tree, fault trees

The linchpin: every debugger test point (TP####) is a real footprint in the
KiCad board, so each test point resolves to a true (x, y) on the actual board.
A test point's net then yields the *components on that rail* — the things to
suspect when that rail reads out of spec.

Output: engine/board.json   and   engine/viewer/board.data.js  (window.BOARD)

    python3 engine/build/build_board_json.py
"""

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent            # engine/
PCB = ROOT / 'source' / 'kicad_import' / 'snowbird.kicad_pcb'
PACK = ROOT / 'debugger' / 'board_pack.json'
OUT_JSON = ROOT / 'board.json'
OUT_JS = ROOT / 'viewer' / 'board.data.js'

# Nets bigger than this are treated as planes (GND / bulk power) and excluded
# from "suspected components" so a bad rail doesn't light up half the board.
PLANE_NET_THRESHOLD = 80

FP_HEADER = re.compile(r'^\t\(footprint\s')
REF = re.compile(r'\(property "Reference" "([^"]+)"')
VAL = re.compile(r'\(property "Value" "([^"]*)"')
LAYER = re.compile(r'\(layer "([^"]+)"\)')
AT = re.compile(r'^\s*\(at\s+(-?[\d.]+)\s+(-?[\d.]+)')
NET = re.compile(r'\(net\s+"([^"]*)"\)')
GR = re.compile(r'^\s*\(gr_(line|arc|poly)\b')
XY = re.compile(r'\((?:start|end|xy)\s+(-?[\d.]+)\s+(-?[\d.]+)\)')

GROUNDISH = re.compile(r'^(GND|VSS|AGND|DGND|PGND|EARTH|CHASSIS)', re.I)


def parse_pcb():
    footprints = {}                      # ref -> {x,y,side,value,nets:set}
    net_members = defaultdict(set)       # net -> {ref}
    edges = []                           # [(x1,y1,x2,y2)] on Edge.Cuts

    cur = None          # current footprint dict
    cur_ref = None
    fp_at_taken = False
    in_gr = False
    gr_coords = []
    gr_is_edge = False

    def close_fp():
        nonlocal cur, cur_ref
        if cur and cur_ref:
            footprints[cur_ref] = cur
            for n in cur['nets']:
                net_members[n].add(cur_ref)
        cur, cur_ref = None, None

    with PCB.open(encoding='utf8', errors='replace') as fh:
        for raw in fh:
            # ---- board outline (top-level graphic on Edge.Cuts) ----
            if GR.match(raw):
                in_gr = True
                gr_coords = XY.findall(raw)
                gr_is_edge = False
                lm = LAYER.search(raw)
                if lm:
                    gr_is_edge = lm.group(1) == 'Edge.Cuts'
                    if gr_is_edge and len(gr_coords) >= 2:
                        (x1, y1), (x2, y2) = gr_coords[0], gr_coords[1]
                        edges.append((float(x1), float(y1), float(x2), float(y2)))
                    in_gr = False
                continue
            if in_gr:
                gr_coords += XY.findall(raw)
                lm = LAYER.search(raw)
                if lm:
                    if lm.group(1) == 'Edge.Cuts' and len(gr_coords) >= 2:
                        (x1, y1), (x2, y2) = gr_coords[0], gr_coords[1]
                        edges.append((float(x1), float(y1), float(x2), float(y2)))
                    in_gr = False
                continue

            # ---- footprints ----
            if FP_HEADER.match(raw):
                close_fp()
                cur = {'x': None, 'y': None, 'side': '?', 'value': '', 'nets': set()}
                cur_ref = None
                fp_at_taken = False
                lm = LAYER.search(raw)
                if lm:
                    cur['side'] = 'B' if lm.group(1).startswith('B.') else 'F'
                continue

            if cur is None:
                continue

            m = AT.match(raw)
            if m and not fp_at_taken:
                cur['x'], cur['y'] = float(m.group(1)), float(m.group(2))
                fp_at_taken = True

            m = REF.search(raw)
            if m and cur_ref is None:
                cur_ref = m.group(1)

            m = VAL.search(raw)
            if m and not cur['value']:
                cur['value'] = m.group(1)

            m = NET.search(raw)
            if m and m.group(1):
                cur['nets'].add(m.group(1))

    close_fp()

    # board bounding box from edges
    xs = [c for e in edges for c in (e[0], e[2])]
    ys = [c for e in edges for c in (e[1], e[3])]
    bbox = {
        'minx': min(xs), 'miny': min(ys), 'maxx': max(xs), 'maxy': max(ys),
    } if xs else {'minx': 0, 'miny': 0, 'maxx': 125, 'maxy': 103.34}

    return footprints, net_members, edges, bbox


def tp_label(key, tp_field, loc):
    """Pull the TP#### token that ties a debugger test point to a footprint."""
    for src in (key, loc, tp_field):
        if not src:
            continue
        m = re.search(r'TP\d+', src)
        if m:
            return m.group(0)
    return None


def signal_net(nets):
    """Choose the rail net for a test point: prefer a non-ground net."""
    real = [n for n in nets if not GROUNDISH.match(n)]
    pool = real or list(nets)
    return sorted(pool)[0] if pool else None


def main():
    pack = json.loads(PACK.read_text(encoding='utf8'))
    footprints, net_members, edges, bbox = parse_pcb()

    net_size = {n: len(m) for n, m in net_members.items()}

    tps_in = pack.get('test_points', {})
    test_points = []
    resolved = 0

    for key, tp in tps_in.items():
        label = tp_label(key, tp.get('tp'), tp.get('loc'))
        fp = footprints.get(label) if label else None
        net = signal_net(fp['nets']) if fp else None

        # components on this rail (skip plane nets to stay focused)
        components = []
        if net and net_size.get(net, 0) <= PLANE_NET_THRESHOLD:
            for ref in sorted(net_members.get(net, [])):
                if ref == label:
                    continue
                f = footprints.get(ref, {})
                components.append({
                    'ref': ref, 'x': f.get('x'), 'y': f.get('y'),
                    'side': f.get('side', '?'), 'value': f.get('value', ''),
                })

        entry = {
            'id': key,
            'label': label,
            'name': tp.get('name'),
            'unit': tp.get('unit'),
            'lsl': tp.get('lsl'), 'nom': tp.get('nom'), 'usl': tp.get('usl'),
            'phase': tp.get('phase'), 'group': tp.get('group'),
            'subsystem': tp.get('subsystem'),
            'fail_action': tp.get('fail_action'),
            'loc': tp.get('loc'),
            'net': net,
            'net_size': net_size.get(net) if net else None,
            'x': fp['x'] if fp else None,
            'y': fp['y'] if fp else None,
            'side': fp['side'] if fp else None,
            'resolved': bool(fp),
            'components': components,
        }
        if fp:
            resolved += 1
        test_points.append(entry)

    board = {
        'program': pack.get('program', 'Snowbird'),
        'product': pack.get('product', {}),
        'generated_from': {
            'pcb': str(PCB.relative_to(ROOT)),
            'board_pack': str(PACK.relative_to(ROOT)),
        },
        'stats': {
            'footprints': len(footprints),
            'nets': len(net_members),
            'edge_segments': len(edges),
            'test_points': len(test_points),
            'test_points_resolved': resolved,
        },
        'bbox': bbox,
        'size_mm': {
            'w': round(bbox['maxx'] - bbox['minx'], 3),
            'h': round(bbox['maxy'] - bbox['miny'], 3),
        },
        'outline': [[round(x, 4) for x in e] for e in edges],
        'phases': pack.get('phases', {}),
        'power_tree': pack.get('power_tree', {}),
        'power_tree_root': pack.get('power_tree_root'),
        'boot_critical': pack.get('boot_critical', []),
        'complaint_branches': pack.get('complaint_branches', {}),
        'fault_trees': pack.get('fault_trees', {}),
        'schematic': pack.get('schematic', {}),
        'led_codes': pack.get('led_codes', {}),
        'test_points': test_points,
    }

    OUT_JSON.write_text(json.dumps(board, indent=2), encoding='utf8')
    OUT_JS.parent.mkdir(parents=True, exist_ok=True)
    OUT_JS.write_text(
        '// AUTO-GENERATED by engine/build/build_board_json.py — do not edit.\n'
        'window.BOARD = ' + json.dumps(board) + ';\n',
        encoding='utf8',
    )

    print('board.json built')
    print('=' * 60)
    for k, v in board['stats'].items():
        print(f'  {k:<22}: {v}')
    print(f'  board size            : {board["size_mm"]["w"]} x {board["size_mm"]["h"]} mm')
    print()
    unresolved = [t['id'] for t in test_points if not t['resolved']]
    if unresolved:
        print(f'unresolved test points ({len(unresolved)}): {", ".join(unresolved)}')
    print()
    print('sample resolved test points:')
    shown = 0
    for t in test_points:
        if t['resolved']:
            print(f'  {t["label"]:<8} {str(t["name"])[:28]:<28} '
                  f'@({t["x"]},{t["y"]}) net={t["net"]} '
                  f'components={len(t["components"])}')
            shown += 1
            if shown >= 12:
                break
    print(f'\nwrote {OUT_JSON}')
    print(f'wrote {OUT_JS}')


if __name__ == '__main__':
    main()
