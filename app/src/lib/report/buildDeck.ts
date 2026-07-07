import PptxGenJS from 'pptxgenjs';
import type { Inspection, Observation, Phase, RiskLevel } from '@/types';
import { phaseFr, aggregateRisk, computeFr } from '@/lib/fr';
import {
  COLORS,
  CONFIDENTIAL,
  FONT,
  LAYOUT,
  PHOTOS_PER_SLIDE,
  RISK_PALETTE,
} from './theme';
import { encodePhotos, fitContain, type EncodedPhoto } from './imageUtils';

export interface ProgressInfo {
  phase: number;
  totalPhases: number;
  label: string;
}

type Progress = (info: ProgressInfo) => void;

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'inspection';
}

/** Phases that carry any content worth putting in the deck. */
function reportablePhases(phases: Phase[]): Phase[] {
  return phases.filter((p) => p.photos.length > 0 || p.observations.length > 0);
}

function obsPrefix(o: Observation, trials: number): string {
  const parts: string[] = [];
  if (o.status === 'waived') parts.push('[WAIVED]');
  if (o.failedSamples > 0) {
    const fr = computeFr(o.failedSamples, trials);
    parts.push(`FR ${fr.label} · ${fr.percent}`);
  }
  return parts.length ? `${parts.join('  ')}  —  ` : '';
}

/** Build and download the inspection slide deck. */
export async function generateDeck(
  inspection: Inspection,
  onProgress?: Progress,
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: LAYOUT.name, width: LAYOUT.width, height: LAYOUT.height });
  pptx.layout = LAYOUT.name;
  pptx.author = inspection.dri || 'FGA Inspection Studio';
  pptx.company = 'eero';
  pptx.title = `${inspection.productName} — ${inspection.sku}`;

  const phases = reportablePhases(inspection.phases);
  const totalSteps = phases.length + 3;
  let step = 0;
  const tick = (label: string) =>
    onProgress?.({ phase: ++step, totalPhases: totalSteps, label });

  tick('Building title slide');
  buildTitleSlide(pptx, inspection);

  tick('Building summary');
  buildSummarySlide(pptx, inspection);

  tick('Building findings table');
  buildFindingsTable(pptx, inspection);

  for (const phase of inspection.phases) {
    if (phase.photos.length === 0 && phase.observations.length === 0) continue;
    tick(`Adding "${phase.title}"`);
    const encoded = await encodePhotos(phase.photos);
    buildPhaseSlides(pptx, inspection, phase, encoded);
  }

  const fileName = `FGA_${sanitize(inspection.sku)}_${inspection.date}.pptx`;
  await pptx.writeFile({ fileName });
}

/* ----------------------------- slide builders ---------------------------- */

function buildTitleSlide(pptx: PptxGenJS, ins: Inspection) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.ink };

  // Accent bar
  slide.addShape('rect', {
    x: 0,
    y: 3.05,
    w: 1.4,
    h: 0.08,
    fill: { color: COLORS.brand },
    line: { type: 'none' },
  });

  slide.addText(ins.productName || 'Inspection', {
    x: 0.9,
    y: 2.2,
    w: 11.5,
    h: 0.9,
    fontFace: FONT.face,
    fontSize: FONT.title + 6,
    bold: true,
    color: COLORS.white,
  });

  const sub = [
    ins.sku && `SKU ${ins.sku}`,
    ins.region,
    ins.fgaJira,
  ]
    .filter(Boolean)
    .join('    ·    ');

  slide.addText(sub, {
    x: 0.9,
    y: 3.25,
    w: 11.5,
    h: 0.5,
    fontFace: FONT.face,
    fontSize: FONT.heading,
    color: 'BCD3FF',
  });

  slide.addText(
    [
      { text: 'Date  ', options: { color: COLORS.muted } },
      { text: ins.date, options: { color: COLORS.white } },
      { text: '        DRI  ', options: { color: COLORS.muted } },
      { text: ins.dri || '—', options: { color: COLORS.white } },
      { text: `        Samples inspected  `, options: { color: COLORS.muted } },
      { text: String(ins.sampleCount), options: { color: COLORS.white } },
    ],
    {
      x: 0.9,
      y: 3.95,
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
    color: COLORS.muted,
  });
}

function buildSummarySlide(pptx: PptxGenJS, ins: Inspection) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  slideHeading(slide, 'Inspection Summary');

  // Left: metadata rows
  const meta: [string, string][] = [
    ['FGA JIRA', ins.fgaJira || '—'],
    ['SKU', ins.sku || '—'],
    ['Product', ins.productName || '—'],
    ['Region', ins.region || '—'],
    ['DRI', ins.dri || '—'],
    ['Samples inspected (T)', String(ins.sampleCount)],
    ['Date', ins.date],
  ];
  slide.addTable(
    meta.map(([k, v]) => [
      { text: k, options: { color: COLORS.muted, bold: true, fontSize: FONT.body } },
      { text: v, options: { color: COLORS.ink, fontSize: FONT.body } },
    ]),
    {
      x: 0.9,
      y: 1.5,
      w: 6.0,
      colW: [2.6, 3.4],
      rowH: 0.42,
      fontFace: FONT.face,
      border: { type: 'solid', color: COLORS.line, pt: 1 },
      align: 'left',
      valign: 'middle',
    },
  );

  // Right: risk legend
  slide.addText('Risk legend', {
    x: 7.4,
    y: 1.4,
    w: 5.0,
    h: 0.4,
    fontFace: FONT.face,
    fontSize: FONT.subheading,
    bold: true,
    color: COLORS.inkSoft,
  });

  (['good', 'low', 'fail'] as RiskLevel[]).forEach((r, i) => {
    const p = RISK_PALETTE[r];
    const y = 1.95 + i * 0.75;
    slide.addShape('rect', {
      x: 7.4,
      y,
      w: 0.42,
      h: 0.42,
      fill: { color: p.solid },
      line: { type: 'none' },
      rectRadius: 0.06,
    });
    slide.addText(
      [
        { text: `${p.label}`, options: { bold: true, color: COLORS.ink } },
        {
          text:
            r === 'good'
              ? '   Pass / verified'
              : r === 'low'
                ? '   Minor issue, ships'
                : '   Failure, review before ship',
          options: { color: COLORS.muted },
        },
      ],
      {
        x: 8.0,
        y,
        w: 4.4,
        h: 0.42,
        fontFace: FONT.face,
        fontSize: FONT.body,
        valign: 'middle',
      },
    );
  });

  // Overall verdict banner
  const anyFail = ins.phases.some((p) => aggregateRisk(p.observations) === 'fail');
  const anyLow = ins.phases.some((p) => aggregateRisk(p.observations) === 'low');
  const verdict: RiskLevel = anyFail ? 'fail' : anyLow ? 'low' : 'good';
  const vp = RISK_PALETTE[verdict];
  const verdictText = anyFail
    ? 'Failures recorded — review before shipping'
    : anyLow
      ? 'Low-risk issues noted'
      : 'No issues found';
  slide.addShape('rect', {
    x: 7.4,
    y: 4.6,
    w: 5.0,
    h: 0.9,
    fill: { color: vp.soft },
    line: { color: vp.solid, pt: 1 },
    rectRadius: 0.1,
  });
  slide.addText(verdictText, {
    x: 7.6,
    y: 4.6,
    w: 4.6,
    h: 0.9,
    fontFace: FONT.face,
    fontSize: FONT.subheading,
    bold: true,
    color: vp.text,
    valign: 'middle',
  });

  footer(slide);
}

function buildFindingsTable(pptx: PptxGenJS, ins: Inspection) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  slideHeading(slide, 'Findings by Phase');

  const header = ['Phase', 'FR', 'Failure mode', 'Next steps / comment', 'DRI'].map(
    (t) => ({
      text: t,
      options: {
        bold: true,
        color: COLORS.white,
        fill: { color: COLORS.ink },
        fontSize: FONT.small,
        valign: 'middle' as const,
      },
    }),
  );

  const rows = reportablePhases(ins.phases).map((phase) => {
    const risk = aggregateRisk(phase.observations) ?? 'good';
    const p = RISK_PALETTE[risk];
    const fr = phaseFr(phase, ins.sampleCount);
    const issues = phase.observations.filter(
      (o) => o.risk !== 'good' && o.status !== 'waived',
    );
    const failureMode = issues.map((o) => o.failureMode || o.text).filter(Boolean).join('; ');
    const nextSteps = issues.map((o) => o.nextSteps).filter(Boolean).join('; ');
    const dri = Array.from(new Set(issues.map((o) => o.dri).filter(Boolean))).join(', ');

    const cell = (text: string, opts: Record<string, unknown> = {}) => ({
      text,
      options: {
        fontSize: FONT.small,
        color: COLORS.ink,
        valign: 'middle' as const,
        ...opts,
      },
    });

    return [
      cell(phase.title, { bold: true, color: p.text, fill: { color: p.soft } }),
      cell(`${fr.label} · ${fr.percent}`, {
        align: 'center',
        color: p.text,
        fill: { color: p.soft },
      }),
      cell(failureMode || '—'),
      cell(nextSteps || '—'),
      cell(dri || '—', { align: 'center' }),
    ];
  });

  slide.addTable([header, ...rows], {
    x: 0.5,
    y: 1.45,
    w: 12.33,
    colW: [3.2, 1.6, 3.0, 3.13, 1.4],
    rowH: 0.4,
    fontFace: FONT.face,
    border: { type: 'solid', color: COLORS.line, pt: 1 },
    align: 'left',
    autoPage: true,
    autoPageRepeatHeader: true,
    autoPageLineWeight: -0.5,
  });

  footer(slide);
}

function buildPhaseSlides(
  pptx: PptxGenJS,
  ins: Inspection,
  phase: Phase,
  photos: EncodedPhoto[],
) {
  const risk = aggregateRisk(phase.observations);
  const fr = phaseFr(phase, ins.sampleCount);

  // First slide: header + observations (left) + first photo chunk (right)
  const first = pptx.addSlide();
  first.background = { color: COLORS.paper };
  phaseHeader(first, phase, risk, `${fr.label} · ${fr.percent}`);

  // Observations column
  const obsRuns: PptxGenJS.TextProps[] =
    phase.observations.length > 0
      ? phase.observations.map((o) => {
          const pal = RISK_PALETTE[o.risk];
          return {
            text: `${obsPrefix(o, ins.sampleCount)}${o.text || pal.label}`,
            options: {
              bullet: { code: '2022' },
              color: o.status === 'waived' ? COLORS.muted : pal.text,
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

  first.addText('Observations', {
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
  first.addText(obsRuns, {
    x: 0.5,
    y: 1.6,
    w: 4.0,
    h: 5.2,
    fontFace: FONT.face,
    valign: 'top',
  });

  const chunks = chunk(photos, PHOTOS_PER_SLIDE);
  if (chunks.length === 0) {
    first.addText('No photos captured', {
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
    placePhotoGrid(first, chunks[0], 4.8, 1.3, 8.03, 5.4);
  }
  footer(first, phase.title);

  // Continuation slides for remaining photo chunks (full width grid)
  for (let i = 1; i < chunks.length; i++) {
    const cont = pptx.addSlide();
    cont.background = { color: COLORS.paper };
    phaseHeader(cont, phase, risk, `${fr.label} · ${fr.percent}`, ' (cont.)');
    placePhotoGrid(cont, chunks[i], 0.5, 1.3, 12.33, 5.4);
    footer(cont, phase.title);
  }
}

/* -------------------------------- helpers -------------------------------- */

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
  risk: RiskLevel | null,
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
    fill: { color: COLORS.ink },
    rectRadius: 0.08,
  });
  slide.addText(`${phase.title}${suffix}`, {
    x: 1.2,
    y: 0.38,
    w: 8.5,
    h: 0.55,
    valign: 'middle',
    fontFace: FONT.face,
    fontSize: FONT.heading,
    bold: true,
    color: COLORS.ink,
  });

  if (risk) {
    const p = RISK_PALETTE[risk];
    slide.addText(p.label, {
      x: 9.9,
      y: 0.45,
      w: 1.5,
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
    if (phase.observations.some((o) => o.status !== 'waived' && o.failedSamples > 0)) {
      slide.addText(`FR ${frText}`, {
        x: 11.5,
        y: 0.45,
        w: 1.33,
        h: 0.42,
        align: 'center',
        valign: 'middle',
        fontFace: FONT.face,
        fontSize: FONT.small,
        bold: true,
        color: RISK_PALETTE.fail.text,
        fill: { color: RISK_PALETTE.fail.soft },
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
  const cols = photos.length <= 2 ? photos.length || 1 : photos.length <= 4 ? 2 : 3;
  const rows = Math.ceil(photos.length / cols);
  const gap = 0.15;
  const cellW = (areaW - (cols - 1) * gap) / cols;
  const cellH = (areaH - (rows - 1) * gap) / Math.max(rows, 1);

  photos.forEach((photo, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x0 + col * (cellW + gap);
    const cy = y0 + row * (cellH + gap);

    // Cell backdrop
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
    slide.addImage({
      data: photo.dataUrl,
      x: fit.x,
      y: fit.y,
      w: fit.w,
      h: fit.h,
    });
  });
}

function footer(slide: PptxGenJS.Slide, left?: string) {
  slide.addText(
    [
      ...(left ? [{ text: left, options: { color: COLORS.muted } }] : []),
    ],
    { x: 0.5, y: 7.05, w: 6, h: 0.3, fontFace: FONT.face, fontSize: FONT.tiny },
  );
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
