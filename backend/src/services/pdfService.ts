/**
 * Minimal dependency-free PDF writer (PDF 1.4, Helvetica core fonts).
 * Enough for invoices, LHA reports, and other tabular documents.
 */

export type PdfBlock =
  | { type: 'heading'; text: string; size?: number }
  | { type: 'text'; text: string; size?: number; muted?: boolean; bold?: boolean }
  | { type: 'kv'; label: string; value: string }
  | { type: 'rule' }
  | { type: 'spacer'; height?: number }
  | { type: 'table'; columns: string[]; rows: string[][]; widths?: number[] };

export interface PdfOptions {
  brandName?: string;
  title?: string;
  subtitle?: string;
  footer?: string;
  accent?: [number, number, number];
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const sanitize = (value: string): string =>
  value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x20-\xFF\n]/g, '?');

const escapeText = (value: string): string =>
  sanitize(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const approxWidth = (text: string, size: number) => text.length * size * 0.52;

const wrap = (text: string, size: number, maxWidth: number): string[] => {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (approxWidth(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
};

interface Page {
  ops: string[];
  cursor: number;
}

export const buildPdf = (blocks: PdfBlock[], options: PdfOptions = {}): Buffer => {
  const pages: Page[] = [];
  let page: Page = { ops: [], cursor: PAGE_HEIGHT - MARGIN };

  const newPage = () => {
    pages.push(page);
    page = { ops: [], cursor: PAGE_HEIGHT - MARGIN };
  };

  const ensure = (needed: number) => {
    if (page.cursor - needed < MARGIN + 30) newPage();
  };

  const text = (value: string, x: number, y: number, size: number, bold = false) => {
    page.ops.push(
      `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapeText(value)}) Tj ET`
    );
  };

  const [ar, ag, ab] = options.accent || [0.12, 0.23, 0.54];

  page.ops.push(`q ${ar} ${ag} ${ab} rg 0 ${(PAGE_HEIGHT - 96).toFixed(2)} ${PAGE_WIDTH.toFixed(2)} 96 re f Q`);
  page.ops.push('q 1 1 1 rg');
  text(options.brandName || 'RIGHT', MARGIN, PAGE_HEIGHT - 52, 18, true);
  text(options.title || 'Laporan', MARGIN, PAGE_HEIGHT - 72, 11);
  page.ops.push('Q');
  if (options.subtitle) {
    page.ops.push('q 0.85 0.88 0.96 rg');
    text(options.subtitle, MARGIN, PAGE_HEIGHT - 90, 9);
    page.ops.push('Q');
  }
  page.cursor = PAGE_HEIGHT - 128;

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const size = block.size || 13;
        ensure(size + 18);
        text(block.text, MARGIN, page.cursor, size, true);
        page.cursor -= size + 8;
        page.ops.push(
          `q ${ar} ${ag} ${ab} RG 0.8 w ${MARGIN} ${page.cursor.toFixed(2)} m ${(PAGE_WIDTH - MARGIN).toFixed(2)} ${page.cursor.toFixed(2)} l S Q`
        );
        page.cursor -= 14;
        break;
      }
      case 'text': {
        const size = block.size || 10;
        const lines = wrap(block.text, size, CONTENT_WIDTH);
        for (const line of lines) {
          ensure(size + 6);
          text(line, MARGIN, page.cursor, size, Boolean(block.bold));
          page.cursor -= size + 4;
        }
        page.cursor -= 4;
        break;
      }
      case 'kv': {
        ensure(18);
        text(block.label, MARGIN, page.cursor, 9);
        const valueLines = wrap(block.value, 9, CONTENT_WIDTH * 0.6);
        valueLines.forEach((line, index) => {
          text(line, MARGIN + CONTENT_WIDTH * 0.4, page.cursor - index * 13, 9, true);
        });
        page.cursor -= Math.max(16, valueLines.length * 13 + 4);
        break;
      }
      case 'rule': {
        ensure(12);
        page.ops.push(
          `q 0.85 0.88 0.94 RG 0.8 w ${MARGIN} ${page.cursor.toFixed(2)} m ${(PAGE_WIDTH - MARGIN).toFixed(2)} ${page.cursor.toFixed(2)} l S Q`
        );
        page.cursor -= 14;
        break;
      }
      case 'spacer': {
        page.cursor -= block.height || 10;
        break;
      }
      case 'table': {
        const columns = block.columns;
        const colWidths =
          block.widths && block.widths.length === columns.length
            ? block.widths.map((w) => (w <= 1 ? CONTENT_WIDTH * w : w))
            : columns.map(() => CONTENT_WIDTH / columns.length);
        const drawRow = (cells: string[], bold: boolean) => {
          const wrapped = cells.map((cell, index) => wrap(cell, 9, colWidths[index] - 10));
          const rowHeight = Math.max(...wrapped.map((lines) => lines.length)) * 12 + 8;
          ensure(rowHeight);
          if (bold) {
            page.ops.push(
              `q 0.94 0.96 1 rg ${MARGIN} ${(page.cursor - rowHeight + 6).toFixed(2)} ${CONTENT_WIDTH.toFixed(2)} ${rowHeight.toFixed(2)} re f Q`
            );
          }
          let x = MARGIN;
          wrapped.forEach((lines, index) => {
            lines.forEach((line, lineIndex) => {
              text(line, x + 5, page.cursor - 12 - lineIndex * 12, 9, bold);
            });
            x += colWidths[index];
          });
          page.cursor -= rowHeight;
          page.ops.push(
            `q 0.88 0.9 0.94 RG 0.5 w ${MARGIN} ${page.cursor.toFixed(2)} m ${(PAGE_WIDTH - MARGIN).toFixed(2)} ${page.cursor.toFixed(2)} l S Q`
          );
        };
        drawRow(columns, true);
        for (const row of block.rows) drawRow(row, false);
        page.cursor -= 10;
        break;
      }
    }
  }

  pages.push(page);

  const footerText = options.footer || `Dicetak ${new Date().toLocaleString('id-ID')}`;
  pages.forEach((item, idx) => {
    item.ops.push('q 0.45 0.5 0.58 rg');
    item.ops.push(
      `BT /F1 8 Tf ${MARGIN.toFixed(2)} 34.00 Td (${escapeText(footerText)}) Tj ET`
    );
    item.ops.push(
      `BT /F1 8 Tf ${(PAGE_WIDTH - MARGIN - 90).toFixed(2)} 34.00 Td (${escapeText(`Halaman ${idx + 1} dari ${pages.length}`)}) Tj ET`
    );
    item.ops.push('Q');
  });

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const firstPageObjectId = 3;
  pages.forEach((_, index) => pageObjectIds.push(firstPageObjectId + index * 2));
  const fontRegularId = firstPageObjectId + pages.length * 2;
  const fontBoldId = fontRegularId + 1;

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`
  );

  pages.forEach((item, index) => {
    const content = item.ops.join('\n');
    const pageId = firstPageObjectId + index * 2;
    const contentId = pageId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    objects.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
  });

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
};

export const rupiah = (value: number): string =>
  `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

export const formatDateId = (value: string | Date | null | undefined): string => {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const dateOnly = new Date(Date.UTC(year, month - 1, day, 12));
    return dateOnly.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB';
};