import { describe, it, expect } from 'vitest';
import { blendedRate, compareFeeModels, marginAtRate, requiredRate } from '../src/pricing.ts';

describe('requiredRate', () => {
  it('recovers idle time and the target margin', () => {
    // cost 100/h at 50% utilization = 200 per billable hour; 40% margin → 333.33
    expect(requiredRate(100, 0.4, 0.5)).toBeCloseTo(333.333, 2);
    expect(requiredRate(100, 0, 1)).toBe(100);
  });
  it('rejects impossible inputs', () => {
    expect(requiredRate(100, 1, 0.5)).toBeNull();
    expect(requiredRate(100, -0.1, 0.5)).toBeNull();
    expect(requiredRate(100, 0.3, 0)).toBeNull();
    expect(requiredRate(100, 0.3, 1.2)).toBeNull();
  });
  it('round-trips with marginAtRate', () => {
    const rate = requiredRate(95, 0.35, 0.78)!;
    expect(marginAtRate(rate, 95, 0.78)).toBeCloseTo(0.35, 10);
    expect(marginAtRate(0, 95, 0.78)).toBeNull();
    expect(marginAtRate(200, 95, 0)).toBeNull();
  });
});

describe('compareFeeModels', () => {
  it('fixed fee loses when hours overrun and wins when they come in under', () => {
    const over = compareFeeModels(100, 130, 200);
    expect(over.fixedFee).toBe(20_000);
    expect(over.tmBilling).toBe(26_000);
    expect(over.fixedAdvantage).toBe(-6_000);
    expect(over.fixedEffectiveRate).toBeCloseTo(153.85, 2);
    expect(over.breakEvenHours).toBe(100);
    const under = compareFeeModels(100, 80, 200);
    expect(under.fixedAdvantage).toBe(4_000);
  });
  it('accepts an explicit fee and tolerates zero hours', () => {
    const c = compareFeeModels(100, 0, 200, 25_000);
    expect(c.fixedFee).toBe(25_000);
    expect(c.fixedEffectiveRate).toBe(0);
    expect(compareFeeModels(100, 50, 0).breakEvenHours).toBe(0);
  });
});

describe('blendedRate', () => {
  it('is hours-weighted', () => {
    expect(blendedRate([{ hours: 10, rate: 100 }, { hours: 30, rate: 200 }])).toBe(175);
    expect(blendedRate([])).toBe(0);
  });
});
