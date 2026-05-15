export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateDaysOverdue(dueAt: Date, returnedAt: Date): number {
  const overdueMs = returnedAt.getTime() - dueAt.getTime();

  if (overdueMs <= 0) {
    return 0;
  }

  return Math.ceil(overdueMs / MS_PER_DAY);
}

export function calculateLoanFineAmount(
  dueAt: Date,
  returnedAt: Date,
  dailyFineRate: number,
): string {
  return (calculateDaysOverdue(dueAt, returnedAt) * dailyFineRate).toFixed(2);
}
