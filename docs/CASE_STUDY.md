# Case Study — PSF Utilization Analytics

**Repository:** [psf-utilization-analytics](https://github.com/Freddricklogan/psf-utilization-analytics) · **Live demo:** [freddricklogan.github.io/psf-utilization-analytics](https://freddricklogan.github.io/psf-utilization-analytics/) · **Author:** Freddrick Logan

---

## 1. Who has this problem

The managing partner of a small professional-services practice — consulting, advisory, a boutique law or accounting firm, an evaluation shop serving school districts — who sets rates by looking at competitors and discovers the margin at year end. I am one of them: I am launching a consulting practice in cloud, security and education technology, and the Oxford Saïd programme on leading professional service firms taught me the arithmetic most small practices never run. This is that arithmetic, made editable.

## 2. The problem, as a scenario

A small advisory practice has a full order book. Two fixed-fee engagements for public-sector clients ran a third over their estimated hours; the partners absorbed the overrun as "relationship investment". A time-and-materials client is ninety days behind on payment. Senior consultants are at 79% utilization and partners at 58%, which everyone agrees is fine because partners sell. At the annual review the accountant reports a margin nobody can explain. The practice has been busy for a year and cannot say which fact cost it most, because it never computed any of them.

## 3. What it costs to leave it alone

Underpricing compounds quietly: a rate set without the utilization term looks profitable per hour and loses money per person. Fixed fees quoted from hopeful estimates move the overrun risk onto the practice, one engagement at a time. Slow collection turns paper profit into a credit line. I will not attach a figure; it varies with the practice and the sample here is illustrative. The realistic cost is the one in the scenario — a year of work that produced a margin nobody chose — and, for a practice serving institutions on grant budgets, a rate card that cannot be defended to a procurement officer.

## 4. The approach, and the alternative I rejected

I built the practice model as an editable table — headcount, cost rate, bill rate and billable hours per level — with an engagement portfolio beside it, and computed everything from those rows: utilization, leverage, standard and realized revenue, staff cost, margin, profit per partner, collection. A scenario panel applies changes in utilization, rates and headcount and reports the deltas. A rate calculator prices from cost, target margin and utilization. The definitions are printed on screen so a reader can disagree with them.

The alternative I rejected was a spreadsheet template. Spreadsheets are where this arithmetic usually lives and usually breaks: a formula copied one row short, a rate typed over a formula, no test that cost is charged for available hours rather than billable ones. Typed, tested functions mean every definition is checked, and the same functions drive the tour so a reviewer sees them run.

## 5. What the code does today

Real: the practice model, every metric, the fee-model comparison, the required-rate and margin calculators, the what-if scenario engine, and CSV import and export with row-level validation. All of it is strict-mode TypeScript with unit tests, separated from a rendering layer that builds the page through `textContent` only.

Simulated: the practice. Levels, rates, hours, engagements and overhead are an illustrative sample, plausible for a small advisory firm and taken from no real one. The page says so.

Worth knowing: realized revenue is standard revenue from the staffing table scaled by the realization observed across the engagement portfolio — a stated simplification, since a real practice reconciles the two through a time-and-billing system, and the screen labels it. The sample partner level runs at 58% utilization with cost above revenue: the honest picture for partners who sell rather than bill, and the reason leverage is on the dashboard.

## 6. Evidence

Measured in continuous integration and a headless-browser smoke test of the built site: 29 unit tests passing across four files, 100% statement coverage over the five pure modules, type-checked ESLint and `tsc --noEmit` clean, HTML validation clean, CodeQL and dependency scanning enabled. The Vite build emits no inline script or style, so the `default-src 'none'` policy holds in production. In the browser: zero console errors; the tour's fourth step applies five points of utilization and reports +$405,192 realized revenue and +$202,596 profit per partner on the sample; the fifth prices a $95-per-hour cost at 35% margin and 78% utilization at $187 per hour. No horizontal scroll at 400 pixels.

## 7. What it would take to run this in production

For one practice it already runs: static hosting, a CSV in, decisions out. As a practice-management tool it would need a time-and-billing feed — hours by person and engagement, so realization is measured rather than applied; monthly snapshots so utilization is a trend, not a point; per-partner and per-engagement drill-down; and a rate-card export for clients. That is a small authenticated service with a database and one integration, a few weeks of work, most of it in the integration. The model itself is done and tested.

## 8. Limits and next steps

One period, one currency, no seasonality, no pipeline or backlog, no working-capital model beyond a collection rate, a single overhead figure. Next: a monthly time series with utilization trend, a pipeline module turning proposals into expected hours, and a working-capital view — days sales outstanding by client — since collection is the problem most likely to hurt a new practice first.

## 9. Who should look at this

**Hiring manager:** evidence that I turn a business-school framework into tested software, and apply it to my own practice before recommending it to anyone.
**Consulting client:** the model I use to price my own work — bring your staffing table as a CSV and we can see what your rate card actually earns.
**Engineer:** read `src/metrics.ts` and `src/pricing.ts` for the definitions, `tests/` for the boundary cases, and `vite.config.ts` for a bundle that keeps a strict CSP.
