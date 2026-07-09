import PptxGenJS from 'pptxgenjs';
import type { Inspection, Observation, Phase, PhotoSlide } from '@/types';
import {
  phaseFr,
  aggregateColor,
  colorOf,
  observationFr,
  observationsFr,
  phaseObservations,
  phasePhotoCount,
  totalUnits,
  deckDisplayName,
} from '@/lib/fr';

import { boxType } from '@/config/options';
import {
  COLORS,
  CONFIDENTIAL,
  FONT,
  LAYOUT,
  LEGEND_ORDER,
  RISK_PALETTE,
  TITLE,
} from './theme';
import { encodePhotos, fitContain, type EncodedPhoto } from './imageUtils';

export interface ProgressInfo {
  phase: number;
  totalPhases: number;
  label: string;
}
type Progress = (info: ProgressInfo) => void;

export interface DeckResult {
  photosTotal: number;
  photosEmbedded: number;
}

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'inspection';
}

function reportablePhases(phases: Phase[]): Phase[] {
  return phases.filter(
    (p) => phasePhotoCount(p) > 0 || phaseObservations(p).length > 0,
  );
}

function obsPrefix(o: Observation, units: number): string {
  const fr = observationFr(o, units);
  const tag =
    o.status === 'waived' ? '[WAIVED]  ' : o.status === 'discuss' ? '[DISCUSS]  ' : '';
  return `${tag}FR ${fr.label} · ${fr.percent}  —  `;
}

export async function generateDeck(
  inspection: Inspection,
  onProgress?: Progress,
): Promise<DeckResult> {
  const units = totalUnits(inspection);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: LAYOUT.name, width: LAYOUT.width, height: LAYOUT.height });
  pptx.layout = LAYOUT.name;
  pptx.author = inspection.dri || 'FGA Inspection Studio';
  pptx.company = 'eero';
  const deckName = deckDisplayName(inspection, boxType(inspection.boxType).fileLabel);
  pptx.title = deckName;

  const phases = reportablePhases(inspection.phases);
  const totalSteps = phases.length + 3;
  let step = 0;
  const tick = (label: string) =>
    onProgress?.({ phase: ++step, totalPhases: totalSteps, label });

  tick('Building title slide');
  buildTitleSlide(pptx, inspection, deckName);

  tick('Building summary');
  buildSummarySlide(pptx, inspection);

  tick('Building findings table');
  buildFindingsTable(pptx, inspection, units);

  let photosTotal = 0;
  let photosEmbedded = 0;

  for (const phase of inspection.phases) {
    if (phasePhotoCount(phase) === 0 && phaseObservations(phase).length === 0) continue;
    tick(`Adding "${phase.title}"`);
    for (let i = 0; i < phase.slides.length; i++) {
      const slide = phase.slides[i];
      if (slide.photos.length === 0 && slide.observations.length === 0) continue;
      const encoded = await encodePhotos(slide.photos);
      photosTotal += slide.photos.length;
      photosEmbedded += encoded.length;
      buildPhaseSlide(
        pptx,
        phase,
        slide,
        encoded,
        units,
        phase.slides.length > 1 ? i + 1 : 0,
      );
    }
  }

  await pptx.writeFile({ fileName: `${sanitize(deckName)}.pptx` });
  return { photosTotal, photosEmbedded };
}

/* ----------------------------- slide builders ---------------------------- */

function buildTitleSlide(pptx: PptxGenJS, ins: Inspection, deckName: string) {
  const slide = pptx.addSlide();
  slide.background = { color: TITLE.bg };

  // Top band
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: LAYOUT.width,
    h: 1.5,
    fill: { color: TITLE.band },
    line: { type: 'none' },
  });

  // Accent bar
  slide.addShape('rect', {
    x: 0.9,
    y: 2.55,
    w: 1.6,
    h: 0.09,
    fill: { color: TITLE.accent },
    line: { type: 'none' },
  });

  // Heading = the deck name
  slide.addText(deckName, {
    x: 0.9,
    y: 2.85,
    w: 11.5,
    h: 1.9,
    fontFace: FONT.face,
    fontSize: 30,
    bold: true,
    color: TITLE.text,
    valign: 'top',
  });

  // Meta line
  slide.addText(
    [
      { text: 'Date  ', options: { color: TITLE.muted } },
      { text: ins.date, options: { color: TITLE.text } },
      { text: '        DRI  ', options: { color: TITLE.muted } },
      { text: ins.dri || '—', options: { color: TITLE.text } },
      { text: '        JIRA  ', options: { color: TITLE.muted } },
      { text: ins.fgaJira || '—', options: { color: TITLE.text } },
    ],
    {
      x: 0.9,
      y: 5.4,
      w: 11.5,
      h: 0.4,
      fontFace: FONT.face,
      fontSize: FONT.subheading,
    },
  );

  slide.addText(CONFIDENTIAL, {
    x: 0.9,
    y: 6.9,
    w: 11.5,
    h: 0.3,
    fontFace: FONT.face,
    fontSize: FONT.small,
    color: TITLE.muted,
  });
}

function buildSummarySlide(pptx: PptxGenJS, ins: Inspection) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  const heading = [ins.productName, ins.sku, ins.countryCode]
    .map((v) => v.trim())
    .filter(Boolean)
    .join(' ');
  slideHeading(slide, `${heading}${heading ? ' ' : ''}FGA Summary`);

  const meta: [string, string][] = [
    ['FGA JIRA', ins.fgaJira || '—'],
    ['SKU', ins.sku || '—'],
    ['Product', ins.productName || '—'],
    ['Phase gate', ins.phaseGate],
    ['Country', ins.countryCode || '—'],
    ['Box type', boxType(ins.boxType).label],
    ['Units / pack', String(ins.unitsPerPack)],
    ['Samples (boxes)', String(ins.sampleCount)],
    ['Total units (T)', String(totalUnits(ins))],
    ['DRI', ins.dri || '—'],
    ['Date', ins.date],
  ];
  slide.addTable(
    meta.map(([k, v]) => [
      { text: k, options: { color: COLORS.muted, bold: true, fontSize: FONT.small } },
      { text: v, options: { color: COLORS.ink, fontSize: FONT.small } },
    ]),
    {
      x: 0.6,
      y: 1.45,
      w: 6.0,
      colW: [2.6, 3.4],
      rowH: 0.34,
      fontFace: FONT.face,
      border: { type: 'solid', color: COLORS.line, pt: 1 },
      valign: 'middle',
    },
  );

  // Risk legend (6 entries)
  slide.addText('Risk legend', {
    x: 7.2,
    y: 1.35,
    w: 5.6,
    h: 0.4,
    fontFace: FONT.face,
    fontSize: FONT.subheading,
    bold: true,
    color: COLORS.inkSoft,
  });
  LEGEND_ORDER.forEach((key, i) => {
    const p = RISK_PALETTE[key];
    const y = 1.85 + i * 0.62;
    slide.addShape('rect', {
      x: 7.2,
      y,
      w: 0.38,
      h: 0.38,
      fill: { color: p.solid },
      line: { type: 'none' },
      rectRadius: 0.05,
    });
    slide.addText(
      [
        { text: p.label, options: { bold: true, color: COLORS.ink } },
        { text: `   ${p.desc}`, options: { color: COLORS.muted } },
      ],
      {
        x: 7.75,
        y,
        w: 5.0,
        h: 0.38,
        fontFace: FONT.face,
        fontSize: FONT.small,
        valign: 'middle',
      },
    );
  });

  // Verdict banner
  const worst = worstColor(ins);
  const vp = RISK_PALETTE[worst];
  const verdictText =
    worst === 'high'
      ? 'High-risk failures recorded — review before shipping'
      : worst === 'medium'
        ? 'Medium-risk issues recorded'
        : worst === 'low'
          ? 'Low-risk issues noted'
          : worst === 'discuss'
            ? 'Items need team discussion'
            : 'No issues found';
  slide.addShape('rect', {
    x: 0.6,
    y: 6.35,
    w: 12.1,
    h: 0.7,
    fill: { color: vp.soft },
    line: { color: vp.solid, pt: 1 },
    rectRadius: 0.1,
  });
  slide.addText(verdictText, {
    x: 0.9,
    y: 6.35,
    w: 11.5,
    h: 0.7,
    fontFace: FONT.face,
    fontSize: FONT.subheading,
    bold: true,
    color: vp.text,
    valign: 'middle',
  });
}

function buildFindingsTable(pptx: PptxGenJS, ins: Inspection, units: number) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  const name = [ins.productName, ins.sku, ins.countryCode]
    .map((v) => v.trim())
    .filter(Boolean)
    .join(' ');
  slideHeading(slide, `FGA ${name}${name ? ' ' : ''}Summary`);

  const header = ['Topic', 'FR', 'Failure mode', 'Next steps / comment', 'DRI'].map(
    (t) => ({
      text: t,
      options: {
        bold: true,
        color: COLORS.white,
        fill: { color: COLORS.brand },
        fontSize: FONT.small,
        valign: 'middle' as const,
      },
    }),
  );

  const rows = reportablePhases(ins.phases).map((phase) => {
    const obs = phaseObservations(phase);
    const color = aggregateColor(obs) ?? 'good';
    const p = RISK_PALETTE[color];
    const fr = phaseFr(phase, units);
    const issues = obs.filter((o) => o.risk !== 'good' && o.status !== 'waived');
    const nextSteps = issues.map((o) => o.nextSteps).filter(Boolean).join('; ');
    const dri = Array.from(new Set(issues.map((o) => o.dri).filter(Boolean))).join(', ');

    // Failure-mode cell: one line per observation with its own FR.
    // Green -> the observation text; yellow/orange/red -> the failure mode.
    const modeRuns: PptxGenJS.TextProps[] =
      obs.length > 0
        ? obs.map((o) => {
            const pal = RISK_PALETTE[colorOf(o)];
            const ofr = observationFr(o, units);
            const label =
              o.risk === 'good'
                ? o.text || pal.label
                : o.failureMode || o.text || pal.label;
            const tag =
              o.status === 'waived'
                ? '[WAIVED] '
                : o.status === 'discuss'
                  ? '[DISCUSS] '
                  : '';
            return {
              text: `${tag}${ofr.label} · ${ofr.percent} — ${label}`,
              options: {
                color: pal.text,
                fontSize: 9,
                breakLine: true,
              },
            };
          })
        : [{ text: '—', options: { color: COLORS.muted, fontSize: 9 } }];

    const cell = (text: string, opts: Record<string, unknown> = {}) => ({
      text,
      options: { fontSize: FONT.small, color: COLORS.ink, valign: 'middle' as const, ...opts },
    });

    return [
      cell(phase.title, { bold: true, color: p.text, fill: { color: p.soft } }),
      cell(`${fr.label} · ${fr.percent}`, {
        align: 'center',
        color: p.text,
        fill: { color: p.soft },
      }),
      { text: modeRuns, options: { valign: 'middle' as const } },
      cell(nextSteps || '—'),
      cell(dri || '—', { align: 'center' }),
    ];
  });

  slide.addTable([header, ...rows], {
    x: 0.5,
    y: 1.45,
    w: 12.33,
    colW: [3.0, 1.5, 3.6, 2.93, 1.3],
    rowH: 0.4,
    fontFace: FONT.face,
    border: { type: 'solid', color: COLORS.line, pt: 1 },
    valign: 'middle',
    autoPage: true,
    autoPageRepeatHeader: true,
  });

  footer(slide);
}

/** Build one deck slide from a single photo-slide (its photos + observations). */
function buildPhaseSlide(
  pptx: PptxGenJS,
  phase: Phase,
  slideData: PhotoSlide,
  photos: EncodedPhoto[],
  units: number,
  slideNo: number, // 0 = the phase has a single slide (no suffix)
) {
  const color = aggregateColor(slideData.observations);
  const fr = observationsFr(slideData.observations, units);
  const frText = `${fr.label} · ${fr.percent}`;
  const showFr = slideData.observations.some(
    (o) => o.status !== 'waived' && o.risk !== 'good' && o.affectedSamples > 0,
  );

  const s = pptx.addSlide();
  s.background = { color: COLORS.paper };
  phaseHeader(s, phase, color, showFr ? frText : '', slideNo ? ` (slide ${slideNo})` : '');

  s.addText('Observations', {
    x: 0.5,
    y: 1.25,
    w: 4.0,
    h: 0.3,
    fontFace: FONT.face,
    fontSize: FONT.small,
    bold: true,
    color: COLORS.muted,
    charSpacing: 1,
  });

  const obsRuns: PptxGenJS.TextProps[] =
    slideData.observations.length > 0
      ? slideData.observations.map((o) => {
          const pal = RISK_PALETTE[colorOf(o)];
          return {
            text: `${obsPrefix(o, units)}${o.text || pal.label}`,
            options: {
              bullet: { code: '2022' },
              color: pal.text,
              fontSize: FONT.body,
              breakLine: true,
              paraSpaceAfter: 6,
            },
          };
        })
      : [
          {
            text: 'No observations recorded.',
            options: { color: COLORS.muted, italic: true, fontSize: FONT.body },
          },
        ];
  s.addText(obsRuns, {
    x: 0.5,
    y: 1.6,
    w: 4.0,
    h: 5.2,
    fontFace: FONT.face,
    valign: 'top',
  });

  if (photos.length === 0) {
    s.addText('No photos on this slide', {
      x: 4.8,
      y: 3.4,
      w: 8.0,
      h: 0.5,
      align: 'center',
      color: COLORS.muted,
      italic: true,
      fontFace: FONT.face,
      fontSize: FONT.body,
    });
  } else {
    placePhotoGrid(s, photos, 4.8, 1.3, 8.03, 5.4);
  }
  footer(s, slideNo ? `${phase.title} — slide ${slideNo}` : phase.title);
}

/* -------------------------------- helpers -------------------------------- */

function worstColor(ins: Inspection) {
  const order = ['good', 'discuss', 'low', 'medium', 'high'] as const;
  let worst: (typeof order)[number] = 'good';
  for (const phase of ins.phases) {
    const c = aggregateColor(phaseObservations(phase));
    if (!c || c === 'waived') continue;
    if (order.indexOf(c) > order.indexOf(worst)) worst = c;
  }
  return worst;
}

function slideHeading(slide: PptxGenJS.Slide, text: string) {
  slide.addText(text, {
    x: 0.5,
    y: 0.4,
    w: 12.33,
    h: 0.6,
    fontFace: FONT.face,
    fontSize: FONT.heading,
    bold: true,
    color: COLORS.ink,
  });
  slide.addShape('line', {
    x: 0.5,
    y: 1.05,
    w: 12.33,
    h: 0,
    line: { color: COLORS.line, pt: 1 },
  });
}

function phaseHeader(
  slide: PptxGenJS.Slide,
  phase: Phase,
  color: ReturnType<typeof aggregateColor>,
  frText: string,
  suffix = '',
) {
  slide.addText(`${phase.slideOrder}`, {
    x: 0.5,
    y: 0.38,
    w: 0.55,
    h: 0.55,
    align: 'center',
    valign: 'middle',
    fontFace: FONT.face,
    fontSize: FONT.subheading,
    bold: true,
    color: COLORS.white,
    fill: { color: COLORS.brand },
    rectRadius: 0.08,
  });
  slide.addText(`${phase.title}${suffix}`, {
    x: 1.2,
    y: 0.38,
    w: 8.3,
    h: 0.55,
    valign: 'middle',
    fontFace: FONT.face,
    fontSize: FONT.heading,
    bold: true,
    color: COLORS.ink,
  });

  if (color) {
    const p = RISK_PALETTE[color];
    slide.addText(p.label, {
      x: 9.7,
      y: 0.45,
      w: 1.8,
      h: 0.42,
      align: 'center',
      valign: 'middle',
      fontFace: FONT.face,
      fontSize: FONT.small,
      bold: true,
      color: p.text,
      fill: { color: p.soft },
      rectRadius: 0.2,
    });
    if (frText) {
      slide.addText(`FR ${frText}`, {
        x: 11.6,
        y: 0.45,
        w: 1.23,
        h: 0.42,
        align: 'center',
        valign: 'middle',
        fontFace: FONT.face,
        fontSize: FONT.small,
        bold: true,
        color: RISK_PALETTE.high.text,
        fill: { color: RISK_PALETTE.high.soft },
        rectRadius: 0.2,
      });
    }
  }
  slide.addShape('line', {
    x: 0.5,
    y: 1.08,
    w: 12.33,
    h: 0,
    line: { color: COLORS.line, pt: 1 },
  });
}

function placePhotoGrid(
  slide: PptxGenJS.Slide,
  photos: EncodedPhoto[],
  x0: number,
  y0: number,
  areaW: number,
  areaH: number,
) {
  const cols = photos.length <= 1 ? 1 : 2;
  const rows = Math.ceil(photos.length / cols);
  const gap = 0.18;
  const cellW = (areaW - (cols - 1) * gap) / cols;
  const cellH = (areaH - (rows - 1) * gap) / Math.max(rows, 1);

  photos.forEach((photo, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x0 + col * (cellW + gap);
    const cy = y0 + row * (cellH + gap);
    slide.addShape('rect', {
      x: cx,
      y: cy,
      w: cellW,
      h: cellH,
      fill: { color: COLORS.panel },
      line: { color: COLORS.line, pt: 1 },
      rectRadius: 0.06,
    });
    const fit = fitContain(photo.width, photo.height, cx, cy, cellW, cellH);
    slide.addImage({ data: photo.dataUrl, x: fit.x, y: fit.y, w: fit.w, h: fit.h });
  });
}

function footer(slide: PptxGenJS.Slide, left?: string) {
  if (left) {
    slide.addText(left, {
      x: 0.5,
      y: 7.05,
      w: 6,
      h: 0.3,
      fontFace: FONT.face,
      fontSize: FONT.tiny,
      color: COLORS.muted,
    });
  }
  slide.addText(CONFIDENTIAL, {
    x: 7.33,
    y: 7.05,
    w: 5.5,
    h: 0.3,
    align: 'right',
    fontFace: FONT.face,
    fontSize: FONT.tiny,
    color: COLORS.muted,
  });
}
