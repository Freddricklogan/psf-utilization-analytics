/**
 * Domain model for a professional-services practice. Every figure the
 * dashboard shows is derived from these rows by `metrics.ts`, `pricing.ts`
 * and `scenario.ts`. The sample practice is illustrative — a small
 * consulting practice of the kind I am building — and is labelled as such.
 */

export type Level = 'partner' | 'principal' | 'senior' | 'consultant' | 'analyst';

export const LEVELS: readonly Level[] = ['partner', 'principal', 'senior', 'consultant', 'analyst'] as const;

export const LEVEL_LABEL: Record<Level, string> = {
  partner: 'Partner',
  principal: 'Principal',
  senior: 'Senior consultant',
  consultant: 'Consultant',
  analyst: 'Analyst'
};

/** One staffing row per level. Hours are per person per year. */
export interface StaffRow {
  level: Level;
  headcount: number;
  /** Fully loaded cost per hour (salary, benefits, allocated overhead). */
  costRate: number;
  /** Standard billing rate per hour. */
  billRate: number;
  /** Hours available for work after leave and holidays. */
  availableHours: number;
  /** Hours actually billed to clients in the period. */
  billableHours: number;
}

export type FeeModel = 'time-and-materials' | 'fixed-fee';

/** An engagement: what was quoted, what it took, what was billed. */
export interface Engagement {
  id: string;
  client: string;
  model: FeeModel;
  /** Hours estimated at proposal. */
  estimatedHours: number;
  /** Hours actually worked. */
  actualHours: number;
  /** Blended standard rate used to value the work. */
  standardRate: number;
  /** For fixed-fee: the agreed fee. For T&M: the amount billed after write-offs. */
  billed: number;
  /** Cash collected so far. */
  collected: number;
}

export interface Practice {
  name: string;
  period: string;
  staff: StaffRow[];
  engagements: Engagement[];
  /** Overhead not captured in cost rates, per year (rent, tools, insurance). */
  fixedOverhead: number;
}

export const SAMPLE_PRACTICE: Practice = {
  name: 'Sample advisory practice',
  period: 'FY26 (12 months)',
  fixedOverhead: 180_000,
  staff: [
    { level: 'partner', headcount: 2, costRate: 210, billRate: 425, availableHours: 1_800, billableHours: 1_050 },
    { level: 'principal', headcount: 3, costRate: 140, billRate: 310, availableHours: 1_800, billableHours: 1_300 },
    { level: 'senior', headcount: 6, costRate: 95, billRate: 225, availableHours: 1_800, billableHours: 1_420 },
    { level: 'consultant', headcount: 8, costRate: 68, billRate: 165, availableHours: 1_800, billableHours: 1_480 },
    { level: 'analyst', headcount: 5, costRate: 48, billRate: 115, availableHours: 1_800, billableHours: 1_390 }
  ],
  engagements: [
    { id: 'e1', client: 'State workforce agency', model: 'fixed-fee', estimatedHours: 640, actualHours: 790, standardRate: 210, billed: 134_400, collected: 134_400 },
    { id: 'e2', client: 'Community college system', model: 'time-and-materials', estimatedHours: 420, actualHours: 455, standardRate: 195, billed: 84_800, collected: 61_200 },
    { id: 'e3', client: 'Regional health network', model: 'fixed-fee', estimatedHours: 300, actualHours: 262, standardRate: 230, billed: 69_000, collected: 69_000 },
    { id: 'e4', client: 'University IT office', model: 'time-and-materials', estimatedHours: 180, actualHours: 214, standardRate: 205, billed: 41_600, collected: 41_600 },
    { id: 'e5', client: 'K-12 district', model: 'fixed-fee', estimatedHours: 500, actualHours: 610, standardRate: 180, billed: 90_000, collected: 45_000 }
  ]
};

/** Deep copy so the UI can mutate a working set. */
export function samplePractice(): Practice {
  return structuredClone(SAMPLE_PRACTICE);
}
