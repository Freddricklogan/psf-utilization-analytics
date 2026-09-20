import { describe, it, expect } from 'vitest';
import { applyScenario, compare, NEUTRAL_SCENARIO } from '../src/scenario.ts';
import { samplePractice } from '../src/model.ts';
import { summarize } from '../src/metrics.ts';

const p = samplePractice();

describe('applyScenario', () => {
  it('neutral scenario leaves the practice unchanged', () => {
    expect(summarize(applyScenario(p, NEUTRAL_SCENARIO))).toEqual(summarize(p));
  });
  it('raises utilization in points, capped at 100%', () => {
    const s = applyScenario(p, { ...NEUTRAL_SCENARIO, utilizationPts: 5 });
    expect(s.staff[1]!.billableHours).toBe(Math.round((1300 / 1800 + 0.05) * 1800));
    const capped = applyScenario(p, { ...NEUTRAL_SCENARIO, utilizationPts: 90 });
    expect(capped.staff.every((r) => r.billableHours <= r.availableHours)).toBe(true);
    const floored = applyScenario(p, { ...NEUTRAL_SCENARIO, utilizationPts: -100 });
    expect(floored.staff.every((r) => r.billableHours === 0)).toBe(true);
  });
  it('scales bill rates and non-partner headcount, never partners', () => {
    const s = applyScenario(p, { utilizationPts: 0, ratePct: 0.1, leveragePct: 0.5 });
    expect(s.staff[0]!.billRate).toBeCloseTo(425 * 1.1, 6);
    expect(s.staff[0]!.headcount).toBe(2);
    expect(s.staff[4]!.headcount).toBe(Math.round(5 * 1.5));
    const shrunk = applyScenario(p, { utilizationPts: 0, ratePct: -2, leveragePct: -1 });
    expect(shrunk.staff.every((r) => r.billRate === 0)).toBe(true);
    expect(shrunk.staff.filter((r) => r.level !== 'partner').every((r) => r.headcount === 0)).toBe(true);
  });
  it('does not mutate the input', () => {
    applyScenario(p, { utilizationPts: 10, ratePct: 0.2, leveragePct: 0.3 });
    expect(p).toEqual(samplePractice());
  });
});

describe('compare', () => {
  it('reports deltas against the baseline', () => {
    const c = compare(p, { utilizationPts: 5, ratePct: 0, leveragePct: 0 });
    expect(c.deltas.revenue).toBeGreaterThan(0);
    expect(c.deltas.profit).toBe(c.scenario.profit - c.baseline.profit);
    expect(c.deltas.utilization).toBeCloseTo(0.05, 6);
    expect(c.deltas.leverage).toBe(0);
  });
  it('null deltas when partners are absent', () => {
    const noPartners = { ...p, staff: p.staff.filter((r) => r.level !== 'partner') };
    const c = compare(noPartners, NEUTRAL_SCENARIO);
    expect(c.deltas.profitPerPartner).toBeNull();
    expect(c.deltas.leverage).toBeNull();
  });
});
