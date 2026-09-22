/**
 * Entry point: owns the working practice, wires the editors, sliders,
 * calculator and CSV, and mounts the Executive Shell.
 */

import './shell/exec-shell.css';
import './app.css';
import { mountExecShell } from './shell/exec-shell.js';
import { samplePractice, type Practice, type StaffRow } from './model.ts';
import { summarize } from './metrics.ts';
import { marginAtRate, requiredRate } from './pricing.ts';
import { compare, NEUTRAL_SCENARIO, type Scenario } from './scenario.ts';
import { importStaff, staffToCsv } from './csv.ts';
import { fmtPct, fmtUsd, renderComparison, renderEngagements, renderStaff, renderSummary, type StaffField } from './ui.ts';

const REPO = 'https://github.com/Freddricklogan/psf-utilization-analytics';
const PAGES = 'https://freddricklogan.github.io/psf-utilization-analytics/';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
};

const state: { practice: Practice; scenario: Scenario } = {
  practice: samplePractice(),
  scenario: { ...NEUTRAL_SCENARIO }
};

function setStatus(text: string, tone: 'ok' | 'warn' | 'danger' | 'muted' = 'muted'): void {
  const s = $('status');
  s.textContent = text;
  s.dataset['tone'] = tone;
}

function render(): void {
  const p = state.practice;
  $('practice-name').textContent = p.name;
  $('practice-period').textContent = p.period;
  renderStaff($('staff-table'), p.staff, editStaff);
  renderSummary($('summary'), summarize(p), 'rent, tools, insurance — a single figure in the sample');
  renderEngagements($('engagements'), p.engagements);
  renderComparison($('comparison'), compare(p, state.scenario));
  renderCalculator();
  shell.refreshKpis();
}

function editStaff(level: StaffRow['level'], field: StaffField, value: number): void {
  const row = state.practice.staff.find((r) => r.level === level);
  if (!row) return;
  const next = { ...row, [field]: field === 'headcount' ? Math.max(0, Math.round(value)) : Math.max(0, value) };
  if (next.billableHours > next.availableHours) next.billableHours = next.availableHours;
  state.practice.staff = state.practice.staff.map((r) => (r.level === level ? next : r));
  setStatus(`Updated ${level} ${field}. Every figure recomputed.`, 'ok');
  render();
}

/* ------------------------------------------------------------- scenario */

const SLIDERS: Array<[string, keyof Scenario, (v: number) => number, (v: number) => string]> = [
  ['util', 'utilizationPts', (v) => v, (v) => `${v > 0 ? '+' : ''}${v} pts`],
  ['rate', 'ratePct', (v) => v / 100, (v) => `${v > 0 ? '+' : ''}${v}%`],
  ['lev', 'leveragePct', (v) => v / 100, (v) => `${v > 0 ? '+' : ''}${v}%`]
];
for (const [id, key, toValue, fmt] of SLIDERS) {
  const input = $<HTMLInputElement>(`sc-${id}`);
  const out = $(`sc-${id}-val`);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    state.scenario[key] = toValue(v);
    out.textContent = fmt(v);
    renderComparison($('comparison'), compare(state.practice, state.scenario));
  });
}
function setScenario(s: Scenario): void {
  state.scenario = { ...s };
  $<HTMLInputElement>('sc-util').value = String(s.utilizationPts);
  $('sc-util-val').textContent = `${s.utilizationPts > 0 ? '+' : ''}${s.utilizationPts} pts`;
  $<HTMLInputElement>('sc-rate').value = String(Math.round(s.ratePct * 100));
  $('sc-rate-val').textContent = `${s.ratePct > 0 ? '+' : ''}${Math.round(s.ratePct * 100)}%`;
  $<HTMLInputElement>('sc-lev').value = String(Math.round(s.leveragePct * 100));
  $('sc-lev-val').textContent = `${s.leveragePct > 0 ? '+' : ''}${Math.round(s.leveragePct * 100)}%`;
  renderComparison($('comparison'), compare(state.practice, state.scenario));
}
$('sc-reset').addEventListener('click', () => setScenario(NEUTRAL_SCENARIO));

/* ----------------------------------------------------------- calculator */

function renderCalculator(): void {
  const cost = Number($<HTMLInputElement>('calc-cost').value);
  const margin = Number($<HTMLInputElement>('calc-margin').value) / 100;
  const util = Number($<HTMLInputElement>('calc-util').value) / 100;
  const bill = Number($<HTMLInputElement>('calc-bill').value);
  const rate = requiredRate(cost, margin, util);
  const m = marginAtRate(bill, cost, util);
  $('calc-rate').textContent = rate == null ? '—' : fmtUsd(rate);
  $('calc-rate-note').textContent = rate == null ? 'Margin must be below 100% and utilization between 1% and 100%.' : `Cost per billable hour ${fmtUsd(cost / util)} ÷ (1 − ${fmtPct(margin)})`;
  $('calc-margin-out').textContent = m == null ? '—' : fmtPct(m, 1);
}
for (const id of ['calc-cost', 'calc-margin', 'calc-util', 'calc-bill']) $(id).addEventListener('input', renderCalculator);

/* ------------------------------------------------------------------ CSV */

function download(filename: string, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
$('export-staff').addEventListener('click', () => download('staff.csv', staffToCsv(state.practice.staff)));
$('import-staff').addEventListener('click', () => $<HTMLInputElement>('file-staff').click());
$<HTMLInputElement>('file-staff').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  file.text().then((text) => {
    const { staff, warnings } = importStaff(text);
    if (!staff.length) { setStatus(`Import failed: ${warnings[0] ?? 'no valid rows.'}`, 'danger'); return; }
    state.practice.staff = staff;
    setStatus(warnings.length ? `Imported ${staff.length} levels with ${warnings.length} warning(s): ${warnings[0]}` : `Imported ${staff.length} staffing levels.`, warnings.length ? 'warn' : 'ok');
    render();
  }).catch(() => setStatus('Import failed: could not read the file.', 'danger'));
});
$('reset').addEventListener('click', () => { state.practice = samplePractice(); setScenario(NEUTRAL_SCENARIO); setStatus('Sample practice restored.', 'ok'); render(); });

/* ---------------------------------------------------------------- shell */

const shell = mountExecShell({
  theme: 'midnight',
  title: 'PSF Utilization Analytics',
  tagline: 'Utilization, leverage, realization and pricing economics for a consulting practice — every figure computed from an editable staffing table and engagement portfolio. Sample data; illustrative.',
  repo: REPO,
  pagesUrl: PAGES,
  badges: [
    { label: 'Computed economics', tone: 'accent' },
    { label: 'What-if scenarios', dot: true },
    { label: 'Client-side only', dot: true }
  ],
  kpis: [
    { label: 'Professionals', compute: () => summarize(state.practice).headcount, tone: 'accent' },
    { label: 'Utilization', compute: () => fmtPct(summarize(state.practice).utilization, 1), tone: 'ok' },
    { label: 'Leverage', compute: () => { const l = summarize(state.practice).leverage; return l == null ? '—' : `${l.toFixed(1)}×`; } },
    { label: 'Realization', compute: () => fmtPct(summarize(state.practice).realization, 1), tone: 'warn' },
    { label: 'Margin', compute: () => fmtPct(summarize(state.practice).margin, 1), tone: 'danger' }
  ],
  tour: [
    {
      selector: '#staff-table',
      title: 'The staffing table drives everything',
      body: 'Headcount, cost and bill rates and billable hours per level. Every number on the page — including the strip above — is computed from these rows. This step resets the sample.',
      action: () => { state.practice = samplePractice(); setScenario(NEUTRAL_SCENARIO); render(); }
    },
    {
      selector: '#summary',
      title: 'Realization, not just rates',
      body: 'Standard revenue is what the hours would be worth at rate card. Realization — billed over standard, from the engagement portfolio — is what the practice actually earned of it. Profit per partner is the figure a managing partner reads first.',
      action: () => {}
    },
    {
      selector: '#engagements',
      title: 'Fixed fees carry the overrun',
      body: 'Two fixed-fee engagements ran over their estimate; the "Fixed vs T&M" column shows what that cost against billing the hours. One T&M engagement is only partly collected.',
      action: () => {}
    },
    {
      selector: '#scenario',
      title: 'What five points of utilization is worth',
      body: 'This applies +5 points of utilization across every level and shows the change in revenue, profit, margin and profit per partner against the baseline.',
      action: () => setScenario({ utilizationPts: 5, ratePct: 0, leveragePct: 0 })
    },
    {
      selector: '#calculator',
      title: 'Price from cost, margin and utilization',
      body: 'A rate must recover idle time as well as cost. At $95/h cost, 78% utilization and a 35% target margin, the calculator gives the rate to quote — and the margin any other rate would produce.',
      action: () => {
        $<HTMLInputElement>('calc-cost').value = '95';
        $<HTMLInputElement>('calc-margin').value = '35';
        $<HTMLInputElement>('calc-util').value = '78';
        $<HTMLInputElement>('calc-bill').value = '225';
        renderCalculator();
      }
    }
  ]
});

setScenario(NEUTRAL_SCENARIO);
render();
setStatus('Sample practice loaded. Edit any cell in the staffing table; every figure recomputes.');
