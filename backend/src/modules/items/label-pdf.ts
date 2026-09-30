import bwipjs from 'bwip-js';
import PDFDocument from 'pdfkit';

export interface LabelData {
  barcode: string;
  title: string;
  callNumber: string | null;
  shelf: string | null;
}

// A4 portrait, grid 3 × 8 (label 70 × 37 mm umum di toko ATK).
const MM = 72 / 25.4;
const COLS = 3;
const ROWS = 8;
const PAGE = { w: 210 * MM, h: 297 * MM };
const MARGIN = { x: 0, y: 4.5 * MM };
const CELL = { w: PAGE.w / COLS, h: (PAGE.h - 2 * MARGIN.y) / ROWS };
const PAD = 3 * MM;

/** Lembar label siap cetak (FR-B7): Code128 + barcode + nomor panggil + judul. */
export async function renderLabelsPdf(labels: LabelData[]): Promise<Buffer> {
  const images = await Promise.all(
    labels.map((l) =>
      bwipjs.toBuffer({
        bcid: 'code128',
        text: l.barcode,
        scale: 3,
        height: 9,
        includetext: false,
      }),
    ),
  );

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: { Title: 'Label barcode', Creator: 'Pustaka' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );

  labels.forEach((l, i) => {
    const slot = i % (COLS * ROWS);
    if (i > 0 && slot === 0) doc.addPage();
    const x = MARGIN.x + (slot % COLS) * CELL.w + PAD;
    const y = MARGIN.y + Math.floor(slot / COLS) * CELL.h + PAD;
    const w = CELL.w - 2 * PAD;

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(l.callNumber ?? '', x, y, { width: w, lineBreak: false });
    if (l.shelf)
      doc.font('Helvetica').fontSize(7).text(`Rak ${l.shelf}`, x, y, {
        width: w,
        align: 'right',
        lineBreak: false,
      });
    doc.image(images[i], x, y + 12, { fit: [w, 13 * MM], align: 'center' });
    doc
      .font('Courier')
      .fontSize(8)
      .text(l.barcode, x, y + 12 + 13 * MM + 2, {
        width: w,
        align: 'center',
        lineBreak: false,
      });
    doc
      .font('Helvetica')
      .fontSize(6.5)
      .text(l.title, x, y + 12 + 13 * MM + 12, {
        width: w,
        align: 'center',
        height: 9,
        ellipsis: true,
        lineBreak: false,
      });
  });
  doc.end();
  return done;
}
