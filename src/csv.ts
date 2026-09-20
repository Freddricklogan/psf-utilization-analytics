/**
 * CSV import/export for the staffing table — RFC 4180 quoting, header row
 * required, every row validated, bad rows reported and skipped.
 */

import { LEVELS, type Level, type StaffRow } from './model.ts';
import { validateStaffRow } from './metrics.ts';

export interface ParsedCsv { headers: string[]; rows: Record<string, string>[]; warnings: string[] }

export function parseCsv(text: string): ParsedCsv {
  const src = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      record.push(field); field = '';
      records.push(record); record = [];
    } else field += ch;
  }
  if (field.length || record.length) { record.push(field); records.push(record); }
  const warnings: string[] = [];
  if (inQuotes) warnings.push('Unterminated quoted field; the file may be truncated.');
  const nonEmpty = records.filter((r) => r.some((f) => f.trim() !== ''));
  const first = nonEmpty[0];
  if (!first) return { headers: [], rows: [], warnings: ['File is empty.'] };
  const headers = first.map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  nonEmpty.slice(1).forEach((r, idx) => {
    if (r.length !== headers.length) {
      warnings.push(`Row ${idx + 2}: expected ${headers.length} fields, found ${r.length}; skipped.`);
      return;
    }
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
    rows.push(obj);
  });
  return { headers, rows, warnings };
}

export function csvField(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const STAFF_COLUMNS = ['level', 'headcount', 'cost_rate', 'bill_rate', 'available_hours', 'billable_hours'] as const;

export function staffToCsv(staff: StaffRow[]): string {
  const lines = [STAFF_COLUMNS.join(',')];
  for (const r of staff) {
    lines.push([r.level, r.headcount, r.costRate, r.billRate, r.availableHours, r.billableHours].map(csvField).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** Import a staffing table. One row per level; duplicate levels are rejected. */
export function importStaff(text: string): { staff: StaffRow[]; warnings: string[] } {
  const { headers, rows, warnings } = parseCsv(text);
  const missing = STAFF_COLUMNS.filter((c) => !headers.includes(c));
  if (headers.length && missing.length) return { staff: [], warnings: [`Missing required column(s): ${missing.join(', ')}.`] };
  const staff: StaffRow[] = [];
  const seen = new Set<Level>();
  rows.forEach((r, idx) => {
    const level = (r['level'] ?? '').toLowerCase() as Level;
    if (!LEVELS.includes(level)) { warnings.push(`Row ${idx + 2}: unknown level "${r['level'] ?? ''}"; skipped.`); return; }
    if (seen.has(level)) { warnings.push(`Row ${idx + 2}: duplicate level "${level}"; skipped.`); return; }
    const row: StaffRow = {
      level,
      headcount: Number(r['headcount']),
      costRate: Number(r['cost_rate']),
      billRate: Number(r['bill_rate']),
      availableHours: Number(r['available_hours']),
      billableHours: Number(r['billable_hours'])
    };
    const problems = validateStaffRow(row);
    if (problems.length) { warnings.push(`Row ${idx + 2}: ${problems.join('; ')}; skipped.`); return; }
    seen.add(level);
    staff.push(row);
  });
  return { staff, warnings };
}
