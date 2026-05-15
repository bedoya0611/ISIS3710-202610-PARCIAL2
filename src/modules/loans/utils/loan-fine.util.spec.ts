import { calculateDaysOverdue, calculateLoanFineAmount } from './loan-fine.util';

describe('loan fine calculation', () => {
  const dailyFineRate = 0.5;

  it.each([
    ['same date', '2026-01-10T00:00:00.000Z', '2026-01-10T00:00:00.000Z', 0, '0.00'],
    ['one day late', '2026-01-10T00:00:00.000Z', '2026-01-11T00:00:00.000Z', 1, '0.50'],
    ['five days late', '2026-01-10T00:00:00.000Z', '2026-01-15T00:00:00.000Z', 5, '2.50'],
    ['ceil partial days', '2026-01-10T00:00:00.000Z', '2026-01-12T12:00:00.000Z', 3, '1.50'],
    ['one minute late', '2026-01-10T00:00:00.000Z', '2026-01-10T00:01:00.000Z', 1, '0.50'],
  ])(
    'calculates %s',
    (_caseName, dueAtIso, returnedAtIso, expectedDaysOverdue, expectedFineAmount) => {
      const dueAt = new Date(dueAtIso);
      const returnedAt = new Date(returnedAtIso);

      expect(calculateDaysOverdue(dueAt, returnedAt)).toBe(expectedDaysOverdue);
      expect(calculateLoanFineAmount(dueAt, returnedAt, dailyFineRate)).toBe(expectedFineAmount);
    },
  );
});
