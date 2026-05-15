import { LoanStatus } from '../entities/loan.entity';

export const OPEN_LOAN_STATUSES: LoanStatus[] = [LoanStatus.ACTIVE, LoanStatus.OVERDUE];

export const RETURNABLE_LOAN_STATUSES: LoanStatus[] = [LoanStatus.ACTIVE, LoanStatus.OVERDUE];

export const TERMINAL_LOAN_STATUSES: LoanStatus[] = [LoanStatus.RETURNED, LoanStatus.LOST];
