/**
 * What-if scenarios: apply percentage deltas to the practice and report the
 * change in the headline economics against the baseline.
 */

import type { Practice, StaffRow } from './model.ts';
import { summarize, type PracticeSummary } from './metrics.ts';

export interface Scenario {
  /** Change in utilization, in percentage points of available hours (e.g. +5 → +0.05). */
  utilizationPts: number;
  /** Change in bill rates, as a fraction (e.g. 0.08 → +8%). */
  ratePct: number;
  /** Change in non-partner headcount, as a fraction (0.25 → +25%, applied per level and rounded). */
  leveragePct: number;
}

export const NEUTRAL_SCENARIO: Scenario = { utilizationPts: 0, ratePct: 0, leveragePct: 0 };

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** Apply a scenario to a copy of the practice. */
export function applyScenario(practice: Practice, s: Scenario): Practice {
  const staff: StaffRow[] = practice.staff.map((r) => {
    const util = clamp(r.billableHours / (r.availableHours || 1) + s.utilizationPts / 100, 0, 1);
    const headcount = r.level === 'partner' ? r.headcount : Math.max(0, Math.round(r.headcount * (1 + s.leveragePct)));
    return {
      ...r,
      headcount,
      billRate: Math.max(0, r.billRate * (1 + s.ratePct)),
      billableHours: Math.round(util * r.availableHours)
    };
  });
  return { ...practice, staff };
}

export interface Comparison {
  baseline: PracticeSummary;
  scenario: PracticeSummary;
  deltas: { revenue: number; profit: number; margin: number; profitPerPartner: number | null; utilization: number; leverage: number | null };
}

export function compare(practice: Practice, s: Scenario): Comparison {
  const baseline = summarize(practice);
  const scenario = summarize(applyScenario(practice, s));
  return {
    baseline,
    scenario,
    deltas: {
      revenue: scenario.realizedRevenue - baseline.realizedRevenue,
      profit: scenario.profit - baseline.profit,
      margin: scenario.margin - baseline.margin,
      profitPerPartner: scenario.profitPerPartner == null || baseline.profitPerPartner == null ? null : scenario.profitPerPartner - baseline.profitPerPartner,
      utilization: scenario.utilization - baseline.utilization,
      leverage: scenario.leverage == null || baseline.leverage == null ? null : scenario.leverage - baseline.leverage
    }
  };
}
