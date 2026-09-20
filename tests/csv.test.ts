import { describe, it, expect } from 'vitest';
import { csvField, importStaff, parseCsv, staffToCsv } from '../src/csv.ts';
import { samplePractice } from '../src/model.ts';

describe('parseCsv', () => {
  it('handles quotes, doubled quotes, newlines, CRLF and a BOM', () => {
    const r = parseCsv('﻿A,B\r\n"x, ""y""","l1\nl2"\r\n');
    expect(r.headers).toEqual(['a', 'b']);
    expect(r.rows).toEqual([{ a: 'x, "y"', b: 'l1\nl2' }]);
  });
  it('skips ragged rows and reports empty or truncated files', () => {
    expect(parseCsv('a,b\n1\n').warnings[0]).toMatch(/Row 2/);
    expect(parseCsv('').warnings).toEqual(['File is empty.']);
    expect(parseCsv('a\n"x').warnings[0]).toMatch(/Unterminated/);
  });
});

describe('staff CSV', () => {
  it('round-trips the sample', () => {
    const { staff } = samplePractice();
    const back = importStaff(staffToCsv(staff));
    expect(back.warnings).toEqual([]);
    expect(back.staff).toEqual(staff);
  });
  it('requires all columns', () => {
    expect(importStaff('level,headcount\npartner,1\n').warnings[0]).toMatch(/Missing required column/);
  });
  it('rejects unknown and duplicate levels and invalid numbers', () => {
    const text = [
      'level,headcount,cost_rate,bill_rate,available_hours,billable_hours',
      'partner,2,200,400,1800,1000',
      'partner,1,200,400,1800,1000',
      'wizard,1,1,1,1,1',
      'analyst,x,1,1,1,1',
      'senior,1,50,100,1000,1200'
    ].join('\n');
    const r = importStaff(text);
    expect(r.staff.map((s) => s.level)).toEqual(['partner']);
    expect(r.warnings).toHaveLength(4);
    expect(r.warnings[0]).toMatch(/duplicate level/);
    expect(r.warnings[1]).toMatch(/unknown level "wizard"/);
    expect(r.warnings[3]).toMatch(/exceeds availableHours/);
  });
  it('quotes fields only when needed', () => {
    expect(csvField('a')).toBe('a');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField(null)).toBe('');
  });
});
