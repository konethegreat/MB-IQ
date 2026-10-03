// Code written by Kone & Claude | The code does the following: " Renders a Markdown AI artifact into a
// high-quality, on-brand (navy + lime) PDF using PDFKit. It tokenises the Markdown with `marked` and
// renders real headings, paragraphs (with bold/italic/code/links), bullet & numbered lists, GFM tables,
// code blocks and horizontal rules — plus embedded diagrams: the client rasterises each ```mermaid block
// to a PNG and posts it, and image placeholders (mbiq-diagram:ID) are embedded here. Page numbers and a
// confidential footer are stamped on every page. Bytes stream straight to the HTTP response. "

/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { marked } from 'marked';

const NAVY = '#071B33';
const LIME = '#ADD135';
const INK = '#1f2d3d';
const MUTED = '#6b7a8d';
const LINE = '#e4ebf2';

const MARGIN = 56;
const LEFT = MARGIN;
const RIGHT = 595 - MARGIN; // A4 width (595pt) minus right margin
const WIDTH = RIGHT - LEFT;

export interface ReportImage { id: string; dataUrl: string }
export interface ReportOptions {
  title: string;
  subtitle?: string;
  markdown: string;
  author?: string;
  images?: ReportImage[];
}

// Code written by Kone & Claude | The code does the following: " Decodes a base64 PNG/JPEG data URL into a
// Buffer PDFKit can embed; returns null for anything malformed so the renderer can fall back gracefully. "
function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(dataUrl ?? '');
  if (!m) return null;
  try { return Buffer.from(m[1], 'base64'); } catch { return null; }
}

function inlineToText(tok: any): string {
  if (tok == null) return '';
  if (typeof tok.text === 'string' && !Array.isArray(tok.tokens)) return tok.text;
  if (Array.isArray(tok.tokens)) return tok.tokens.map(inlineToText).join('');
  return typeof tok.text === 'string' ? tok.text : '';
}

// Code written by Kone & Claude | The code does the following: " Embeds a diagram PNG centred and scaled to
// the content width; on any failure it writes a small muted placeholder instead of throwing. "
function embedImage(doc: PDFKit.PDFDocument, buf: Buffer): void {
  try {
    doc.moveDown(0.4);
    doc.image(buf, LEFT, doc.y, { fit: [WIDTH, 380], align: 'center' });
    doc.moveDown(0.6);
  } catch {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED).text('[diagram could not be embedded]');
  }
}

// Code written by Kone & Claude | The code does the following: " Renders a run of inline tokens (text,
// bold, italic, inline-code, links, line breaks) on the current line, and embeds any diagram image
// placeholders it encounters. "
function renderInline(doc: PDFKit.PDFDocument, tokens: any[], images: Map<string, Buffer>, size = 10.5, color = INK): void {
  let wrote = false;
  const endLine = () => { if (wrote) { doc.text('', { continued: false }); wrote = false; } };
  for (const t of tokens ?? []) {
    switch (t.type) {
      case 'image': {
        const id = String(t.href ?? '').replace(/^mbiq-diagram:/, '');
        const buf = images.get(id);
        endLine();
        if (buf) embedImage(doc, buf);
        else doc.font('Helvetica-Oblique').fontSize(size).fillColor(MUTED).text(t.text || '[diagram]');
        break;
      }
      case 'strong':
        doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(inlineToText(t), { continued: true }); wrote = true; break;
      case 'em':
        doc.font('Helvetica-Oblique').fontSize(size).fillColor(color).text(inlineToText(t), { continued: true }); wrote = true; break;
      case 'codespan':
        doc.font('Courier').fontSize(size - 0.5).fillColor('#0b3b6f').text(String(t.text ?? ''), { continued: true }); wrote = true; break;
      case 'link':
        doc.font('Helvetica').fontSize(size).fillColor('#0b5cab').text(inlineToText(t), { continued: true, underline: true }); wrote = true; break;
      case 'br':
        doc.text('\n', { continued: true }); break;
      default:
        doc.font('Helvetica').fontSize(size).fillColor(color).text(t.text ?? inlineToText(t), { continued: true }); wrote = true;
    }
  }
  endLine();
}

function renderList(doc: PDFKit.PDFDocument, list: any, images: Map<string, Buffer>, depth = 0): void {
  let n = typeof list.start === 'number' ? list.start : 1;
  for (const item of list.items ?? []) {
    const marker = list.ordered ? `${n++}.` : '•';
    const x = LEFT + depth * 16;
    doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(`${marker} `, x, doc.y, { continued: true });
    const text = (item.tokens ?? []).find((t: any) => t.type === 'text' || t.type === 'paragraph');
    if (text?.tokens) renderInline(doc, text.tokens, images);
    else doc.text(inlineToText(item), { continued: false });
    for (const sub of item.tokens ?? []) if (sub.type === 'list') renderList(doc, sub, images, depth + 1);
  }
  doc.moveDown(0.2);
}

function cellText(cell: any): string {
  return cell?.text ?? (Array.isArray(cell?.tokens) ? cell.tokens.map(inlineToText).join('') : '');
}

function renderTable(doc: PDFKit.PDFDocument, table: any, _images: Map<string, Buffer>): void {
  const header: any[] = table.header ?? [];
  const rows: any[][] = table.rows ?? [];
  const cols = Math.max(1, header.length);
  const colW = WIDTH / cols;
  doc.moveDown(0.3);

  const drawRow = (cells: any[], bold: boolean) => {
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    let maxH = 0;
    cells.forEach((c) => {
      const h = doc.font(font).fontSize(9.5).heightOfString(cellText(c), { width: colW - 8 });
      maxH = Math.max(maxH, h);
    });
    if (doc.y + maxH + 10 > doc.page.height - 70) doc.addPage();
    const y = doc.y;
    cells.forEach((c, i) => {
      doc.font(font).fontSize(9.5).fillColor(bold ? NAVY : INK).text(cellText(c), LEFT + i * colW + 4, y + 4, { width: colW - 8 });
    });
    doc.y = y + maxH + 8;
    doc.strokeColor(LINE).lineWidth(0.7).moveTo(LEFT, doc.y - 3).lineTo(RIGHT, doc.y - 3).stroke();
  };

  drawRow(header, true);
  for (const r of rows) drawRow(r, false);
  doc.moveDown(0.4);
}

function renderCodeBlock(doc: PDFKit.PDFDocument, text: string): void {
  doc.moveDown(0.3);
  const top = doc.y;
  const h = doc.font('Courier').fontSize(9).heightOfString(text, { width: WIDTH - 16 });
  doc.save().rect(LEFT, top, WIDTH, h + 12).fill('#f4f7fa').restore();
  doc.font('Courier').fontSize(9).fillColor('#23303d').text(text, LEFT + 8, top + 6, { width: WIDTH - 16 });
  doc.y = top + h + 14;
  doc.moveDown(0.2);
}

// Code written by Kone & Claude | The code does the following: " Walks the block-level Markdown tokens and
// renders each to the PDF, adding a page when a heading would otherwise be orphaned near the page bottom. "
function renderTokens(doc: PDFKit.PDFDocument, tokens: any[], images: Map<string, Buffer>): void {
  const headingSizes: Record<number, number> = { 1: 16, 2: 13.5, 3: 12, 4: 11, 5: 10.5, 6: 10.5 };
  for (const tok of tokens ?? []) {
    switch (tok.type) {
      case 'heading': {
        const size = headingSizes[tok.depth] ?? 11;
        if (doc.y + 40 > doc.page.height - 70) doc.addPage();
        doc.moveDown(tok.depth <= 2 ? 0.6 : 0.4);
        renderInline(doc, tok.tokens, images, size, NAVY);
        if (tok.depth === 1) {
          doc.strokeColor(LIME).lineWidth(2).moveTo(LEFT, doc.y + 2).lineTo(LEFT + 60, doc.y + 2).stroke();
        }
        doc.moveDown(0.25);
        break;
      }
      case 'paragraph':
        doc.moveDown(0.15);
        renderInline(doc, tok.tokens, images);
        break;
      case 'list': renderList(doc, tok, images); break;
      case 'table': renderTable(doc, tok, images); break;
      case 'code': renderCodeBlock(doc, String(tok.text ?? '')); break;
      case 'blockquote':
        doc.moveDown(0.2);
        renderTokens(doc, tok.tokens ?? [], images);
        break;
      case 'hr':
        doc.moveDown(0.4);
        doc.strokeColor(LINE).lineWidth(1).moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).stroke();
        doc.moveDown(0.4);
        break;
      case 'space': doc.moveDown(0.35); break;
      default:
        if (typeof tok.text === 'string' && tok.text.trim()) {
          doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(tok.text);
        }
    }
  }
}

// Code written by Kone & Claude | The code does the following: " Builds the PDF (branded header, title
// block, rendered Markdown body with embedded diagrams, page-numbered footer) and pipes it to the
// response so the browser downloads it. "
export function streamReportPdf(res: Response, options: ReportOptions): void {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });

  const safeName = options.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName || 'mb-iq-report'}.pdf"`);
  doc.pipe(res);

  // Brand band.
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(20).text('MB IQ', { continued: true });
  doc.fillColor(MUTED).font('Helvetica').fontSize(12).text('   Demo Engineering Command Centre');
  doc.moveDown(0.5);
  doc.strokeColor(LIME).lineWidth(2).moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).stroke();
  doc.moveDown(1);

  // Title block.
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18).text(options.title);
  if (options.subtitle) doc.moveDown(0.2).fillColor(MUTED).font('Helvetica').fontSize(11).text(options.subtitle);
  doc.moveDown(0.2).fillColor('#9aa7b4').font('Helvetica').fontSize(9)
    .text(`Generated: ${new Date().toLocaleString()}   ·   Prepared by: ${options.author ?? 'MB IQ AI Assistant'}`);
  doc.moveDown(0.8);

  // Body.
  const images = new Map<string, Buffer>();
  for (const img of options.images ?? []) {
    const buf = dataUrlToBuffer(img.dataUrl);
    if (buf) images.set(img.id, buf);
  }
  const tokens = marked.lexer(options.markdown ?? '');
  renderTokens(doc, tokens as any[], images);

  // Page-numbered footer on every page.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const y = doc.page.height - 38;
    doc.font('Helvetica').fontSize(8).fillColor('#9aa7b4');
    doc.text('Confidential — internal IT division use only. Built by Kone & Claude.', LEFT, y, { width: WIDTH, align: 'left', lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, LEFT, y, { width: WIDTH, align: 'right', lineBreak: false });
  }

  doc.end();
}
