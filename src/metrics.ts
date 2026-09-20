/**
 * Practice economics — the arithmetic a managing partner runs every month.
 * Pure functions over the model; nothing here touches the DOM.
 *
 * Definitions used (stated so a reader can disagree with them):
 *   utilization     = billable hours / available hours
 *   leverage        = non-partner headcount / partner headcount
 *   realization     = billed revenue / standard-rate value of the hours worked
 *   collection rate = collected / billed
 *   margin          = (revenue − staff cost − fixed overhead) / revenue
 *   profit per partner = (revenue − staff cost − fixed overhead) / partner headcount
 */

import type { Engagement, Practice, StaffRow } from './model.ts';

const round = (v: number, dp = 0): number => Number(v.toFixed(dp));

/** Utilization for one row, as a fraction 0–1 (may exceed 1 if over-worked). */
export function rowUtilization(row: StaffRow): number {
  return row.availableHours > 0 ? row.billableHours / row.availableHours : 0;
}

/** Hours-weighted utilization across the practice, fraction 0–1. */
export function utilization(staff: StaffRow[]): number {
  let billable = 0;
  let available = 0;
  for (const r of staff) {
    billable += r.billableHours * r.headcount;
    available += r.availableHours * r.headcount;
  }
  return available > 0 ? billable / available : 0;
}

export function headcount(staff: StaffRow[]): number {
  return staff.reduce((a, r) => a + r.headcount, 0);
}

export function partners(staff: StaffRow[]): number {
  return staff.filter((r) => r.level === 'partner').reduce((a, r) => a + r.headcount, 0);
}

/** Non-partner professionals per partner. Infinity when there are no partners is unhelpful; return null. */
export function leverage(staff: StaffRow[]): number | null {
  const p = partners(staff);
  if (!p) return null;
  return (headcount(staff) - p) / p;
}

/** Standard-rate revenue implied by the billable hours actually worked. */
export function standardRevenue(staff: StaffRow[]): number {
  return staff.reduce((a, r) => a + r.billableHours * r.billRate * r.headcount, 0);
}

/** Fully loaded staff cost for all available hours (people are paid whether or not they bill). */
export function staffCost(staff: StaffRow[]): number {
  return staff.reduce((a, r) => a + r.availableHours * r.costRate * r.headcount, 0);
}

/** Standard-rate value of the hours worked on an engagement. */
export function engagementStandardValue(e: Engagement): number {
  return e.actualHours * e.standardRate;
}

/** Realization for one engagement: billed / standard value. */
export function engagementRealization(e: Engagement): number {
  const std = engagementStandardValue(e);
  return std > 0 ? e.billed / std : 0;
}

/** Hours overrun as a fraction of the estimate (positive = over). */
export function engagementOverrun(e: Engagement): number {
  return e.estimatedHours > 0 ? (e.actualHours - e.estimatedHours) / e.estimatedHours : 0;
}

/** Portfolio realization: total billed / total standard value. */
export function realization(engagements: Engagement[]): number {
  const std = engagements.reduce((a, e) => a + engagementStandardValue(e), 0);
  const billed = engagements.reduce((a, e) => a + e.billed, 0);
  return std > 0 ? billed / std : 0;
}

/** Collected / billed. */
export function collectionRate(engagements: Engagement[]): number {
  const billed = engagements.reduce((a, e) => a + e.billed, 0);
  const collected = engagements.reduce((a, e) => a + e.collected, 0);
  return billed > 0 ? collected / billed : 0;
}

export interface PracticeSummary {
  headcount: number;
  partners: number;
  leverage: number | null;
  utilization: number;
  standardRevenue: number;
  /** Standard revenue scaled by the engagement portfolio's realization. */
  realizedRevenue: number;
  realization: number;
  collectionRate: number;
  staffCost: number;
  fixedOverhead: number;
  profit: number;
  margin: number;
  profitPerPartner: number | null;
  revenuePerProfessional: number;
}

/**
 * The headline economics. Realized revenue applies the engagement
 * portfolio's realization to the staff model's standard revenue — the
 * simplification is stated on screen.
 */
export function summarize(practice: Practice): PracticeSummary {
  const hc = headcount(practice.staff);
  const p = partners(practice.staff);
  const std = standardRevenue(practice.staff);
  const real = realization(practice.engagements);
  const revenue = std * (real || 1);
  const cost = staffCost(practice.staff);
  const profit = revenue - cost - practice.fixedOverhead;
  return {
    headcount: hc,
    partners: p,
    leverage: leverage(practice.staff),
    utilization: utilization(practice.staff),
    standardRevenue: round(std),
    realizedRevenue: round(revenue),
    realization: real,
    collectionRate: collectionRate(practice.engagements),
    staffCost: round(cost),
    fixedOverhead: practice.fixedOverhead,
    profit: round(profit),
    margin: revenue > 0 ? profit / revenue : 0,
    profitPerPartner: p ? round(profit / p) : null,
    revenuePerProfessional: hc ? round(revenue / hc) : 0
  };
}

/** Per-level contribution: revenue, cost, and the multiple of cost that the bill rate represents. */
export function levelEconomics(row: StaffRow): { revenue: number; cost: number; multiple: number; utilization: number } {
  return {
    revenue: row.billableHours * row.billRate * row.headcount,
    cost: row.availableHours * row.costRate * row.headcount,
    multiple: row.costRate > 0 ? row.billRate / row.costRate : 0,
    utilization: rowUtilization(row)
  };
}

/** Problems with a staff row; empty when valid. */
export function validateStaffRow(row: StaffRow): string[] {
  const p: string[] = [];
  if (!Number.isInteger(row.headcount) || row.headcount < 0) p.push('headcount must be a non-negative integer');
  for (const k of ['costRate', 'billRate', 'availableHours', 'billableHours'] as const) {
    if (!Number.isFinite(row[k]) || row[k] < 0) p.push(`${k} must be a non-negative number`);
  }
  if (row.billableHours > row.availableHours) p.push('billableHours exceeds availableHours');
  return p;
}
