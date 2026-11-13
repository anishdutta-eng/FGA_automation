import { splitGraphemes } from 'unicode-segmenter/grapheme';

export const FINDINGS_TABLE_Y = 1.45;
export const FINDINGS_TABLE_BOTTOM = 6.82;
export const FINDINGS_HEADER_HEIGHT = 0.4;
export const FINDINGS_COL_WIDTHS = [2.8, 1.3, 4.2, 2.73, 1.3] as const;
export const FINDINGS_CELL_MARGIN = [0.05, 0.1, 0.05, 0.1] as const;

const FONT_SIZE_PT = 10;
const LINE_HEIGHT_IN = (FONT_SIZE_PT * 1.25) / 72;
const ROW_VERTICAL_PADDING_IN = FINDINGS_CELL_MARGIN[0] + FINDINGS_CELL_MARGIN[2];
const ROW_SAFETY_IN = 0.035;
const MIN_ROW_HEIGHT = 0.4;
const WIDTH_SAFETY = 0.88;
const CSS_PIXELS_PER_INCH = 96;
const BROWSER_FONT = `${FONT_SIZE_PT}pt "DM Sans", sans-serif`;

let measureContext: CanvasRenderingContext2D | null | undefined;

type SegmenterConstructor = new (
  locale?: string | string[],
  options?: { granularity: 'grapheme' },
) => { segment: (input: string) => Iterable<{ segment: string }> };

export const FINDINGS_DATA_HEIGHT =
  FINDINGS_TABLE_BOTTOM - FINDINGS_TABLE_Y - FINDINGS_HEADER_HEIGHT;

export interface FindingInputRow<T> {
  phaseId: string;
  phaseTitle: string;
  values: [string, string, string, string, string];
  meta: T;
}

export interface FindingPageRow<T> extends FindingInputRow<T> {
  height: number;
  sourceRowIndex: number;
  segmentIndex: number;
}

export interface FindingPage<T> {
  rows: FindingPageRow<T>[];
  dataHeight: number;
}

function graphemes(text: string): string[] {
  const Segmenter = (
    Intl as typeof Intl & { Segmenter?: SegmenterConstructor }
  ).Segmenter;
  if (!Segmenter) return Array.from(splitGraphemes(text));
  return Array.from(
    new Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    (part) => part.segment,
  );
}

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext;
  if (typeof document === 'undefined') {
    measureContext = null;
    return measureContext;
  }
  const canvas = document.createElement('canvas');
  measureContext = canvas.getContext('2d');
  if (measureContext) measureContext.font = BROWSER_FONT;
  return measureContext;
}

function measuredWidthInches(text: string): number {
  const context = getMeasureContext();
  if (context) {
    context.font = BROWSER_FONT;
    return context.measureText(text).width / CSS_PIXELS_PER_INCH;
  }
  // Node/test fallback: one full em per grapheme is intentionally conservative
  // and safely accommodates wide uppercase characters such as W/M.
  return (graphemes(text).length * FONT_SIZE_PT) / 72;
}

function splitTokenToWidth(token: string, maxWidth: number): string[] {
  const chunks: string[] = [];
  let chunk = '';
  for (const grapheme of graphemes(token)) {
    const candidate = chunk + grapheme;
    if (chunk && measuredWidthInches(candidate) > maxWidth) {
      chunks.push(chunk);
      chunk = grapheme;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks.length > 0 ? chunks : [''];
}

/**
 * Conservatively word-wrap text by rendered width. Long tokens are split only
 * at grapheme boundaries, so emoji and combined Unicode characters stay valid.
 */
export function wrapFindingText(text: string, columnWidth: number): string[] {
  if (!text) return [''];
  const maxWidth =
    Math.max(
      0.25,
      columnWidth - FINDINGS_CELL_MARGIN[1] - FINDINGS_CELL_MARGIN[3],
    ) * WIDTH_SAFETY;
  const output: string[] = [];

  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) {
      output.push('');
      continue;
    }

    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measuredWidthInches(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line) {
        output.push(line);
        line = '';
      }
      const chunks = splitTokenToWidth(word, maxWidth);
      output.push(...chunks.slice(0, -1));
      line = chunks.at(-1) ?? '';
    }
    if (line) output.push(line);
  }

  return output.length > 0 ? output : [''];
}

function heightForValues(values: readonly string[]): number {
  const maxLines = Math.max(
    1,
    ...values.map((value) => value.split('\n').length),
  );
  return Math.max(
    MIN_ROW_HEIGHT,
    maxLines * LINE_HEIGHT_IN + ROW_VERTICAL_PADDING_IN + ROW_SAFETY_IN,
  );
}

function expandRows<T>(rows: FindingInputRow<T>[]): FindingPageRow<T>[] {
  const maxLinesPerSegment = Math.max(
    1,
    Math.floor(
      (FINDINGS_DATA_HEIGHT -
        ROW_VERTICAL_PADDING_IN -
        ROW_SAFETY_IN -
        LINE_HEIGHT_IN) /
        LINE_HEIGHT_IN,
    ),
  );
  const expanded: FindingPageRow<T>[] = [];
  const phaseRowCounts = new Map<string, number>();

  rows.forEach((row) => {
    const sourceRowIndex = phaseRowCounts.get(row.phaseId) ?? 0;
    phaseRowCounts.set(row.phaseId, sourceRowIndex + 1);

    const wrapped = row.values.map((value, column) =>
      wrapFindingText(value, FINDINGS_COL_WIDTHS[column]),
    ) as [string[], string[], string[], string[], string[]];
    const segmentCount = Math.max(
      1,
      ...wrapped.map((lines) => Math.ceil(lines.length / maxLinesPerSegment)),
    );

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
      const start = segmentIndex * maxLinesPerSegment;
      const end = start + maxLinesPerSegment;
      const values = wrapped.map((lines, column) => {
        // Repeat genuinely compact context fields when a single observation is
        // split. If a topic/FR/DRI is itself long, slice it rather than copying
        // an oversized value onto every continuation row.
        const repeatAsContext =
          segmentIndex > 0 &&
          (column === 0 || column === 1 || column === 4) &&
          lines.length <= maxLinesPerSegment;
        return (repeatAsContext ? lines : lines.slice(start, end)).join('\n');
      }) as [string, string, string, string, string];
      const height = heightForValues(values);
      if (height > FINDINGS_DATA_HEIGHT + Number.EPSILON) {
        throw new Error(
          `Finding row exceeds page capacity after splitting (${height.toFixed(3)} in)`,
        );
      }

      expanded.push({
        ...row,
        values,
        height,
        sourceRowIndex,
        segmentIndex,
      });
    }
  });

  return expanded;
}

/**
 * Pack complete logical rows into findings slides. A phase that fits on one
 * page stays together. If a large phase must span pages, its topic is repeated
 * as "(continued)" on the next page. No row is left for PptxGenJS to split.
 */
export function paginateFindingRows<T>(rows: FindingInputRow<T>[]): FindingPage<T>[] {
  const expanded = expandRows(rows);
  if (expanded.length === 0) return [{ rows: [], dataHeight: 0 }];

  const groups: FindingPageRow<T>[][] = [];
  for (const row of expanded) {
    const current = groups.at(-1);
    if (!current || current[0].phaseId !== row.phaseId) groups.push([row]);
    else current.push(row);
  }

  const pages: FindingPage<T>[] = [];
  let page: FindingPage<T> = { rows: [], dataHeight: 0 };
  const pushPage = () => {
    if (page.rows.length > 0) pages.push(page);
    page = { rows: [], dataHeight: 0 };
  };

  for (const group of groups) {
    const groupHeight = group.reduce((sum, row) => sum + row.height, 0);
    if (
      page.rows.length > 0 &&
      groupHeight <= FINDINGS_DATA_HEIGHT &&
      page.dataHeight + groupHeight > FINDINGS_DATA_HEIGHT
    ) {
      pushPage();
    }

    for (const row of group) {
      const placeOnCurrentPage = (): FindingPageRow<T> => {
        const previous = page.rows.at(-1);
        const startsVisiblePhaseGroup =
          !previous || previous.phaseId !== row.phaseId;
        const isContinuation = row.sourceRowIndex > 0 || row.segmentIndex > 0;
        const fallbackTopic =
          wrapFindingText(row.phaseTitle, FINDINGS_COL_WIDTHS[0])[0] ?? '';
        const topicBase = row.values[0] || fallbackTopic;
        const topic = startsVisiblePhaseGroup
          ? `${topicBase}${isContinuation ? '\n(continued)' : ''}`
          : '';
        const values: FindingPageRow<T>['values'] = [
          topic,
          row.values[1],
          row.values[2],
          row.values[3],
          row.values[4],
        ];
        const height = heightForValues(values);
        if (height > FINDINGS_DATA_HEIGHT + Number.EPSILON) {
          throw new Error(
            `Finding row exceeds page capacity after adding context (${height.toFixed(3)} in)`,
          );
        }
        return { ...row, values, height };
      };

      let pagedRow = placeOnCurrentPage();
      if (
        page.rows.length > 0 &&
        page.dataHeight + pagedRow.height > FINDINGS_DATA_HEIGHT
      ) {
        pushPage();
        pagedRow = placeOnCurrentPage();
      }

      page.rows.push(pagedRow);
      page.dataHeight += pagedRow.height;
    }
  }
  pushPage();

  return pages;
}
