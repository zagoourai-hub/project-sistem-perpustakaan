import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { toLocalDate } from '../../common/utils/date.util.js';
import type { ReportResult } from './report-queries.js';

/** Date → tanggal lokal perpustakaan (YYYY-MM-DD). */
const cell = (v: string | number | Date | null | undefined, tz: string) =>
  v instanceof Date ? toLocalDate(v, tz) : v;

const csvCell = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

@Injectable()
export class ExportService {
  // ponytail: dibangun di memori; laporan dibatasi periode/limit sehingga ukurannya kecil
  csv(report: ReportResult, tz: string): Buffer {
    const lines = [
      report.columns.map((c) => csvCell(c.label)).join(','),
      ...report.rows.map((r) =>
        report.columns.map((c) => csvCell(cell(r[c.key], tz))).join(','),
      ),
    ];
    // BOM agar Excel membaca UTF-8 dengan benar
    return Buffer.from(`﻿${lines.join('\r\n')}`, 'utf8');
  }

  async xlsx(
    report: ReportResult,
    subtitle: string,
    tz: string,
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Pustaka';
    const ws = wb.addWorksheet(report.title.slice(0, 31));
    ws.addRow([report.title]).font = { bold: true, size: 14 };
    ws.addRow([subtitle]).font = { italic: true, color: { argb: 'FF534341' } };
    ws.addRow([]);
    const header = ws.addRow(report.columns.map((c) => c.label));
    header.font = { bold: true };
    header.eachCell((cell) => {
      cell.border = { bottom: { style: 'thin' } };
    });
    for (const r of report.rows)
      ws.addRow(report.columns.map((c) => cell(r[c.key], tz) ?? null));
    report.columns.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      const longest = report.rows.reduce(
        (m, r) => Math.max(m, String(r[c.key] ?? '').length),
        c.label.length,
      );
      col.width = Math.min(50, Math.max(12, longest + 2));
      if (c.type === 'currency') col.numFmt = '"Rp"#,##0';
    });
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
