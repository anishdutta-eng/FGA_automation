#!/usr/bin/env python3
"""
The KiCad Allegro importer does not carry over the physical stackup, so the
imported board claims KiCad's default 1.6 mm. Inject the real Snowbird stackup
recovered from the .brd's embedded Design.xml so the 3D view and any impedance
work are dimensionally correct.

Real stackup (6 copper layers, 0.992 mm total, FR-4 Er 4.5 / tanD 0.035):

    soldermask            0.015
    TOP        (F.Cu)     0.039
    prepreg               0.076
    LYR02_GND  (In1.Cu)   0.016
    prepreg               0.127
    LYR03-S1   (In2.Cu)   0.016
    core                  0.414
    LYR04_PWR  (In3.Cu)   0.016
    prepreg               0.127
    LYR05-S2   (In4.Cu)   0.016
    prepreg               0.076
    BOTTOM     (B.Cu)     0.039
    soldermask            0.015
"""

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PCB = ROOT / 'kicad_import' / 'snowbird.kicad_pcb'
BACKUP = PCB.with_suffix('.kicad_pcb.orig')

MASK = 0.015
ER, TD, MAT = 4.5, 0.035, 'FR4'

# (kicad layer, copper thickness, following dielectric thickness, dielectric type)
CU = [
    ('F.Cu',   0.039, 0.076, 'prepreg'),
    ('In1.Cu', 0.016, 0.127, 'prepreg'),
    ('In2.Cu', 0.016, 0.414, 'core'),
    ('In3.Cu', 0.016, 0.127, 'prepreg'),
    ('In4.Cu', 0.016, 0.076, 'prepreg'),
    ('B.Cu',   0.039, None,  None),
]

TOTAL = MASK * 2 + sum(c for _, c, _, _ in CU) + sum(d for _, _, d, _ in CU if d)


def build_stackup(indent='\t\t'):
    i, i2 = indent, indent + '\t'
    L = [f'{i}(stackup']
    L.append(f'{i2}(layer "F.SilkS" (type "Top Silk Screen"))')
    L.append(f'{i2}(layer "F.Paste" (type "Top Solder Paste"))')
    L.append(f'{i2}(layer "F.Mask" (type "Top Solder Mask") (thickness {MASK}))')

    n = 0
    for name, cu_t, di_t, di_type in CU:
        L.append(f'{i2}(layer "{name}" (type "copper") (thickness {cu_t}))')
        if di_t is not None:
            n += 1
            L.append(
                f'{i2}(layer "dielectric {n}" (type "{di_type}") '
                f'(thickness {di_t}) (material "{MAT}") '
                f'(epsilon_r {ER}) (loss_tangent {TD}))'
            )

    L.append(f'{i2}(layer "B.Mask" (type "Bottom Solder Mask") (thickness {MASK}))')
    L.append(f'{i2}(layer "B.Paste" (type "Bottom Solder Paste"))')
    L.append(f'{i2}(layer "B.SilkS" (type "Bottom Silk Screen"))')
    L.append(f'{i2}(copper_finish "ENIG")')
    L.append(f'{i2}(dielectric_constraints no)')
    L.append(f'{i})')
    return '\n'.join(L)


def main():
    if not PCB.exists():
        raise SystemExit(f'missing {PCB}')

    if not BACKUP.exists():
        shutil.copy2(PCB, BACKUP)
        print(f'backup -> {BACKUP.name}')

    text = PCB.read_text(encoding='utf8', errors='replace')

    if '(stackup' in text:
        print('stackup already present; nothing to do')
        return

    # 1. correct the overall board thickness
    new, k = re.subn(r'\(thickness 1\.6\)', f'(thickness {TOTAL:.3f})', text, count=1)
    if k:
        print(f'thickness 1.6 -> {TOTAL:.3f} mm')
    else:
        print('WARNING: could not find (thickness 1.6)')

    # 2. inject the stackup as the first child of (setup ...)
    m = re.search(r'\n(\t*)\(setup\n', new)
    if not m:
        raise SystemExit('could not locate (setup ...) block')
    indent = m.group(1) + '\t'
    at = m.end()
    new = new[:at] + build_stackup(indent) + '\n' + new[at:]
    print(f'injected stackup: 6 copper layers, {TOTAL:.3f} mm total')

    PCB.write_text(new, encoding='utf8')
    print(f'wrote {PCB.name}')


if __name__ == '__main__':
    main()
