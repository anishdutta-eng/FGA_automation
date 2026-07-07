# FGA Inspection Studio

A browser-based tool that guides an engineer through a fixed hardware
inspection workflow — drag-and-drop photos into each phase, record risk-scored
observations, and generate a review-ready Google Slides deck.

Runs on macOS and Windows in any modern browser. Offline-capable.

## Repository layout

```
FGA_automation/
├── app/              # The web application (all source & config)
│   ├── src/          #   React + TypeScript source
│   ├── public/       #   Static assets
│   └── package.json  #   Scripts & dependencies
├── reports/          # Generated / exported inspection reports
├── knowledge-base/   # Reference material (box designs, specs, standards)
└── README.md
```

- **app/** — everything code. Nothing else lives here.
- **reports/** — inspection outputs (exported decks, JSON records) land here.
- **knowledge-base/** — source-of-truth reference documents.

## Getting started

```bash
cd app
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # type-check + production build into app/dist
npm run preview      # preview the production build
```

To demo on another device on the same network:

```bash
npm run dev -- --host   # then open the printed Network URL
```

## The workflow

1. Enter inspection metadata: FGA JIRA, SKU, eero product name, date, DRI, and
   the number of samples inspected (T).
2. Work phase by phase — drag photos in, add observations, tag each by risk
   (green = good, yellow = low risk, red = failure).
3. Failure Rate is computed automatically as `F / T` (failed samples over
   samples inspected).
4. Once all required phases are documented, generate the slide deck.

## Status

- [x] Step 1 — drag-and-drop phase engine with risk-scored observations
- [x] Step 2 — offline persistence (IndexedDB)
- [ ] Step 3 — Google sign-in + cloud sync
- [ ] Step 4 — Google Slides export
- [ ] Step 5 — SKU-to-country document matrix
