import { describe, it, expect } from 'vitest';
import {
  collectionRate, engagementOverrun, engagementRealization, headcount, leverage, levelEconomics,
  partners, realization, rowUtilization, staffCost, standardRevenue, summarize, utilization, validateStaffRow
} from '../src/metrics.ts';
import { samplePractice, type StaffRow } from '../src/model.ts';

const p = samplePractice();

describe('staff metrics', () => {
  it('utilization is hours-weighted across headcount', () => {
    const staff: StaffRow[] = [
      { level: 'partner', headcount: 1, costRate: 1, billRate: 1, availableHours: 1000, billableHours: 500 },
      { level: 'analyst', headcount: 3, costRate: 1, billRate: 1, availableHours: 1000, billableHours: 1000 }
    ];
    expect(utilization(staff)).toBeCloseTo(3500 / 4000, 10);
    expect(rowUtilization(staff[0]!)).toBe(0.5);
    expect(utilization([])).toBe(0);
    expect(rowUtilization({ ...staff[0]!, availableHours: 0 })).toBe(0);
  });
  it('headcount, partners and leverage', () => {
    expect(headcount(p.staff)).toBe(24);
    expect(partners(p.staff)).toBe(2);
    expect(leverage(p.staff)).toBe(11);
    expect(leverage(p.staff.filter((r) => r.level !== 'partner'))).toBeNull();
  });
  it('standard revenue and staff cost', () => {
    expect(standardRevenue([{ level: 'analyst', headcount: 2, costRate: 50, billRate: 100, availableHours: 1000, billableHours: 800 }])).toBe(160_000);
    expect(staffCost([{ level: 'analyst', headcount: 2, costRate: 50, billRate: 100, availableHours: 1000, billableHours: 800 }])).toBe(100_000);
  });
  it('level economics', () => {
    const e = levelEconomics(p.staff[0]!);
    expect(e.revenue).toBe(1050 * 425 * 2);
    expect(e.cost).toBe(1800 * 210 * 2);
    expect(e.multiple).toBeCloseTo(425 / 210, 6);
    expect(levelEconomics({ ...p.staff[0]!, costRate: 0 }).multiple).toBe(0);
  });
});

describe('engagement metrics', () => {
  it('realization and overrun per engagement', () => {
    const e = p.engagements[0]!; // fixed fee 134,400 vs 790h × 210 = 165,900
    expect(engagementRealization(e)).toBeCloseTo(134_400 / 165_900, 6);
    expect(engagementOverrun(e)).toBeCloseTo(150 / 640, 6);
    expect(engagementRealization({ ...e, actualHours: 0 })).toBe(0);
    expect(engagementOverrun({ ...e, estimatedHours: 0 })).toBe(0);
  });
  it('portfolio realization and collection', () => {
    const std = p.engagements.reduce((a, e) => a + e.actualHours * e.standardRate, 0);
    const billed = p.engagements.reduce((a, e) => a + e.billed, 0);
    expect(realization(p.engagements)).toBeCloseTo(billed / std, 10);
    expect(collectionRate(p.engagements)).toBeCloseTo((134_400 + 61_200 + 69_000 + 41_600 + 45_000) / billed, 10);
    expect(realization([])).toBe(0);
    expect(collectionRate([])).toBe(0);
  });
});

describe('summarize', () => {
  it('derives the headline economics from the rows', () => {
    const s = summarize(p);
    expect(s.headcount).toBe(24);
    expect(s.partners).toBe(2);
    expect(s.leverage).toBe(11);
    expect(s.utilization).toBeCloseTo(utilization(p.staff), 10);
    expect(s.standardRevenue).toBe(Math.round(standardRevenue(p.staff)));
    expect(s.realizedRevenue).toBe(Math.round(standardRevenue(p.staff) * realization(p.engagements)));
    expect(s.profit).toBe(s.realizedRevenue - s.staffCost - p.fixedOverhead);
    expect(s.margin).toBeCloseTo(s.profit / s.realizedRevenue, 6);
    expect(s.profitPerPartner).toBe(Math.round(s.profit / 2));
    expect(s.revenuePerProfessional).toBe(Math.round(s.realizedRevenue / 24));
  });
  it('handles an empty practice without dividing by zero', () => {
    const s = summarize({ name: 'x', period: 'x', staff: [], engagements: [], fixedOverhead: 0 });
    expect(s.leverage).toBeNull();
    expect(s.profitPerPartner).toBeNull();
    expect(s.margin).toBe(0);
    expect(s.revenuePerProfessional).toBe(0);
  });
  it('uses standard revenue when there are no engagements to realize against', () => {
    const s = summarize({ ...p, engagements: [] });
    expect(s.realizedRevenue).toBe(s.standardRevenue);
  });
});

describe('validateStaffRow', () => {
  it('accepts the sample rows', () => {
    for (const r of p.staff) expect(validateStaffRow(r)).toEqual([]);
  });
  it('reports every problem', () => {
    const problems = validateStaffRow({ level: 'analyst', headcount: 1.5, costRate: -1, billRate: NaN, availableHours: 100, billableHours: 200 });
    expect(problems).toHaveLength(4);
  });
});
