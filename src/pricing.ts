/**
 * Pricing arithmetic: what rate a target margin requires, and how a fixed
 * fee compares with time-and-materials once the hours come in.
 */

/**
 * Hourly rate needed to achieve `targetMargin` (fraction) over a fully
 * loaded cost rate, at a given utilization. People are paid for available
 * hours but bill only the utilized share, so the rate must recover the
 * idle time too.
 */
export function requiredRate(costRate: number, targetMargin: number, utilizationFraction: number): number | null {
  if (targetMargin >= 1 || targetMargin < 0) return null;
  if (utilizationFraction <= 0 || utilizationFraction > 1) return null;
  const costPerBillableHour = costRate / utilizationFraction;
  return costPerBillableHour / (1 - targetMargin);
}

/** Margin achieved at a given bill rate, cost rate and utilization. */
export function marginAtRate(billRate: number, costRate: number, utilizationFraction: number): number | null {
  if (billRate <= 0 || utilizationFraction <= 0) return null;
  const costPerBillableHour = costRate / utilizationFraction;
  return (billRate - costPerBillableHour) / billRate;
}

export interface FeeComparison {
  fixedFee: number;
  tmBilling: number;
  /** Positive when the fixed fee out-earned T&M at the actual hours. */
  fixedAdvantage: number;
  /** Effective hourly rate under the fixed fee. */
  fixedEffectiveRate: number;
  /** Break-even hours: above this, T&M would have earned more. */
  breakEvenHours: number;
}

/**
 * Compare a fixed fee (quoted from estimated hours at a rate) with
 * time-and-materials at the same rate, given the hours actually worked.
 */
export function compareFeeModels(estimatedHours: number, actualHours: number, rate: number, fixedFee?: number): FeeComparison {
  const fee = fixedFee ?? estimatedHours * rate;
  const tm = actualHours * rate;
  return {
    fixedFee: fee,
    tmBilling: tm,
    fixedAdvantage: fee - tm,
    fixedEffectiveRate: actualHours > 0 ? fee / actualHours : 0,
    breakEvenHours: rate > 0 ? fee / rate : 0
  };
}

/** Blended rate across a staffing mix: hours-weighted. */
export function blendedRate(mix: Array<{ hours: number; rate: number }>): number {
  const hours = mix.reduce((a, m) => a + m.hours, 0);
  if (hours <= 0) return 0;
  return mix.reduce((a, m) => a + m.hours * m.rate, 0) / hours;
}
