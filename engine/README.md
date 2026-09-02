# Snowbird PCB Debug Accelerator

An assist engine that speeds up hardware debug by tying the **real PCB geometry**
(from a KiCad import of the Snowbird board) to the **PCB debugger's diagnosis
knowledge** (test-point specs, power tree, fault trees). Enter measured
test-point values and the engine isolates the suspected rail and highlights the
components on that net at their **true physical location** on the board — so you
stop bouncing between schematic and PCB to find where to probe.

It runs *alongside* the existing PCB debugger as an accelerator, not a
replacement: the debugger still owns the diagnosis knowledge, and this engine
consumes it.

## Layout

```
engine/
  source/                     KiCad groundwork (moved from Desktop/Snowbird_schematics)
    kicad_import/             snowbird.kicad_pcb  (2340 fps, full net connectivity)
    tools/                    net_trace / survey_footprints / body_coverage / ...
    out/  render/             outline SVG + 3D renders
    *.brd, *.STEP             raw sources (git-ignored — large, only used to rebuild)
  debugger/                   copied from the Failure Analyzer (read-only inputs)
    board_pack.json           test points, power tree, fault trees, complaint branches
    schematic_index.json      OCR'd schematic index
    snowbird_debug_bible.md
  build/
    build_board_json.py       THE JOIN: board_pack.json  x  snowbird.kicad_pcb
  board.json                  generated runtime data (tracked)
  viewer/
    index.html                self-contained accelerator UI (double-click to open)
    board.data.js             generated: window.BOARD (tracked)
```

## The join (why this works)

Every debugger test point is a real footprint on the board. The build script
extracts the `TP####` token from each test point and looks up that footprint's
true `(x, y)` and its **net** in `snowbird.kicad_pcb`. The net then yields every
other footprint on that rail — the components to suspect when the rail is bad.

```
V_TP1205_POE_5V  ──TP1205──▶  footprint @ (8.585, -63.797)  ──net──▶  POE_5V
                                                                       │
                          13 components on POE_5V: Q802, C1206/1207/…, R1232-1234
```

24 of 26 test points resolve to real coordinates; the 2 that don't
(`POE_POWER_UBOOT`, `POE_POWER_QSDK`) are firmware boot-stage checks with no
physical pad — expected.

## Diagnosis logic

- A measured value is **fail** if it falls outside `[lsl, usl]` (either bound may
  be open), else **pass**.
- The `power_tree` (parent → child rail dependencies) isolates root cause: a
  failed rail whose **parent reads good** is the likely culprit; failed rails
  whose parent also failed are flagged **downstream / secondary**.
- Suspected components = the footprints on the root-cause rail's net (plane nets
  like GND, > 80 members, are excluded so the whole board doesn't light up).

## Rebuild

Whenever `board_pack.json` or the KiCad board changes:

```bash
python3 engine/build/build_board_json.py
```

This regenerates both `engine/board.json` and `engine/viewer/board.data.js`.
No third-party Python packages are required (standard library only).

## Use it

Open `engine/viewer/index.html` in a browser (double-click — it loads the
generated `board.data.js`, no server needed). Then:

1. Pick a **complaint** (DEAD / DOA / REBOOTS / NO_WIFI / …) to load the relevant
   test-point checklist, or leave on *All test points*.
2. Enter measured values. Rails turn green (pass) / red (root cause) / amber
   (secondary), and suspected components light up on the real board outline.
3. The diagnosis panel shows the culprit rail, its `fail_action`, the fault-tree
   steps, and the component shortlist. Click **Demo fault** to see a dead-PoE-5V
   walkthrough.

## Provenance of inputs

- `source/` — imported by a prior effort from the Allegro board
  `175-02000-A-…​.brd`; verified 125 × 103.34 mm, 6-layer 0.992 mm stackup.
- `debugger/board_pack.json` — copied from
  `Failure analysis tool/Failure Analyzer/programs/snowbird`; the live debugger
  is left untouched.
