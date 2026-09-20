/**
 * DOM rendering. `textContent` and `createElement` only — client names and
 * levels can come from an imported CSV.
 */

import { LEVEL_LABEL, type Engagement, type Practice, type StaffRow } from './model.ts';
import { engagementOverrun, engagementRealization, levelEconomics, summarize, type PracticeSummary } from './metrics.ts';
import { compareFeeModels } from './pricing.ts';
import type { Comparison } from './scenario.ts';

type Props = Record<string, string | number | boolean | null | undefined>;

export function el(tag: string, props: Props = {}, kids: Array<Node | string | null | undefined> = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export const fmtUsd = (v: number): string => `$${Math.round(v).toLocaleString('en-US')}`;
export const fmtPct = (v: number | null, dp = 0): string => (v == null ? '—' : `${(v * 100).toFixed(dp)}%`);
const fmtX = (v: number | null, dp = 1): string => (v == null ? '—' : `${v.toFixed(dp)}×`);
const signed = (v: number, f: (n: number) => string): string => (v > 0 ? `+${f(v)}` : v < 0 ? `−${f(-v)}` : f(0));

export type StaffField = 'headcount' | 'costRate' | 'billRate' | 'billableHours';

export function renderStaff(host: HTMLElement, staff: StaffRow[], onEdit: (level: StaffRow['level'], field: StaffField, value: number) => void): void {
  clear(host);
  host.append(el('thead', {}, [el('tr', {}, ['Level', 'Headcount', 'Cost rate', 'Bill rate', 'Billable h / person', 'Utilization', 'Multiple', 'Revenue', 'Cost'].map((h) => el('th', { scope: 'col', text: h })))]));
  const body = el('tbody');
  for (const r of staff) {
    const e = levelEconomics(r);
    const input = (field: StaffField, step: string, min: string, max?: string): HTMLElement => {
      const i = el('input', { type: 'number', class: 'psf-input', value: String(r[field]), step, min, max: max ?? null, 'aria-label': `${LEVEL_LABEL[r.level]} ${field}` }) as HTMLInputElement;
      i.addEventListener('change', () => { const v = Number(i.value); if (Number.isFinite(v)) onEdit(r.level, field, v); });
      return i;
    };
    body.append(el('tr', {}, [
      el('th', { scope: 'row', text: LEVEL_LABEL[r.level] }),
      el('td', {}, [input('headcount', '1', '0')]),
      el('td', {}, [input('costRate', '1', '0')]),
      el('td', {}, [input('billRate', '1', '0')]),
      el('td', {}, [input('billableHours', '10', '0', String(r.availableHours))]),
      el('td', { 'data-tone': e.utilization >= 0.75 ? 'ok' : e.utilization >= 0.6 ? 'warn' : 'danger', text: fmtPct(e.utilization) }),
      el('td', { text: fmtX(e.multiple) }),
      el('td', { text: fmtUsd(e.revenue) }),
      el('td', { text: fmtUsd(e.cost) })
    ]));
  }
  host.append(body);
}

export function renderSummary(host: HTMLElement, s: PracticeSummary, overheadNote: string): void {
  clear(host);
  const rows: Array<[string, string, string?]> = [
    ['Standard-rate revenue', fmtUsd(s.standardRevenue), 'billable hours × bill rate'],
    ['Realization', fmtPct(s.realization, 1), 'billed ÷ standard value, from the engagement portfolio'],
    ['Realized revenue', fmtUsd(s.realizedRevenue), 'standard revenue × realization'],
    ['Staff cost', fmtUsd(s.staffCost), 'available hours × cost rate — people are paid for idle time'],
    ['Fixed overhead', fmtUsd(s.fixedOverhead), overheadNote],
    ['Profit', fmtUsd(s.profit)],
    ['Margin', fmtPct(s.margin, 1)],
    ['Profit per partner', s.profitPerPartner == null ? '—' : fmtUsd(s.profitPerPartner), 'the PSF headline'],
    ['Revenue per professional', fmtUsd(s.revenuePerProfessional)],
    ['Collection rate', fmtPct(s.collectionRate, 1), 'collected ÷ billed']
  ];
  for (const [k, v, note] of rows) {
    host.append(el('div', { class: 'psf-kv' }, [
      el('dt', {}, [el('span', { text: k }), note ? el('span', { class: 'psf-note', text: note }) : null]),
      el('dd', { text: v, 'data-tone': k === 'Profit' || k === 'Margin' ? (s.profit >= 0 ? 'ok' : 'danger') : null })
    ]));
  }
}

export function renderEngagements(host: HTMLElement, engagements: Engagement[]): void {
  clear(host);
  host.append(el('thead', {}, [el('tr', {}, ['Client', 'Model', 'Est. h', 'Actual h', 'Overrun', 'Realization', 'Fixed vs T&M', 'Collected'].map((h) => el('th', { scope: 'col', text: h })))]));
  const body = el('tbody');
  for (const e of engagements) {
    const over = engagementOverrun(e);
    const real = engagementRealization(e);
    const cmp = e.model === 'fixed-fee' ? compareFeeModels(e.estimatedHours, e.actualHours, e.standardRate, e.billed) : null;
    body.append(el('tr', {}, [
      el('td', { text: e.client }),
      el('td', { text: e.model === 'fixed-fee' ? 'Fixed fee' : 'T&M' }),
      el('td', { text: String(e.estimatedHours) }),
      el('td', { text: String(e.actualHours) }),
      el('td', { 'data-tone': over > 0.1 ? 'danger' : over > 0 ? 'warn' : 'ok', text: signed(over, (n) => fmtPct(n)) }),
      el('td', { 'data-tone': real >= 0.95 ? 'ok' : real >= 0.85 ? 'warn' : 'danger', text: fmtPct(real) }),
      el('td', { 'data-tone': cmp ? (cmp.fixedAdvantage >= 0 ? 'ok' : 'danger') : null, text: cmp ? signed(cmp.fixedAdvantage, fmtUsd) : 'n/a' }),
      el('td', { text: `${fmtPct(e.billed > 0 ? e.collected / e.billed : 0)}` })
    ]));
  }
  host.append(body);
}

export function renderComparison(host: HTMLElement, c: Comparison): void {
  clear(host);
  host.append(el('thead', {}, [el('tr', {}, ['Measure', 'Baseline', 'Scenario', 'Change'].map((h) => el('th', { scope: 'col', text: h })))]));
  const body = el('tbody');
  const rows: Array<[string, string, string, string, number]> = [
    ['Utilization', fmtPct(c.baseline.utilization, 1), fmtPct(c.scenario.utilization, 1), signed(c.deltas.utilization * 100, (n) => `${n.toFixed(1)} pts`), c.deltas.utilization],
    ['Leverage', fmtX(c.baseline.leverage), fmtX(c.scenario.leverage), c.deltas.leverage == null ? '—' : signed(c.deltas.leverage, (n) => `${n.toFixed(1)}×`), c.deltas.leverage ?? 0],
    ['Realized revenue', fmtUsd(c.baseline.realizedRevenue), fmtUsd(c.scenario.realizedRevenue), signed(c.deltas.revenue, fmtUsd), c.deltas.revenue],
    ['Profit', fmtUsd(c.baseline.profit), fmtUsd(c.scenario.profit), signed(c.deltas.profit, fmtUsd), c.deltas.profit],
    ['Margin', fmtPct(c.baseline.margin, 1), fmtPct(c.scenario.margin, 1), signed(c.deltas.margin * 100, (n) => `${n.toFixed(1)} pts`), c.deltas.margin],
    ['Profit per partner', c.baseline.profitPerPartner == null ? '—' : fmtUsd(c.baseline.profitPerPartner), c.scenario.profitPerPartner == null ? '—' : fmtUsd(c.scenario.profitPerPartner), c.deltas.profitPerPartner == null ? '—' : signed(c.deltas.profitPerPartner, fmtUsd), c.deltas.profitPerPartner ?? 0]
  ];
  for (const [k, b, s, d, raw] of rows) {
    body.append(el('tr', {}, [el('th', { scope: 'row', text: k }), el('td', { text: b }), el('td', { text: s }), el('td', { 'data-tone': raw > 0 ? 'ok' : raw < 0 ? 'danger' : 'muted', text: d })]));
  }
  host.append(body);
}

export function summaryFor(p: Practice): PracticeSummary {
  return summarize(p);
}
