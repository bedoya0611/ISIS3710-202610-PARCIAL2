import { LoanStatus } from '../entities/loan.entity';

export const OPEN_LOAN_STATUSES: LoanStatus[] = [
  LoanStatus.ACTIVE,
  LoanStatus.OVERDUE,
  LoanStatus.LOST,
];

export const RETURNABLE_LOAN_STATUSES: LoanStatus[] = [LoanStatus.ACTIVE, LoanStatus.OVERDUE];
