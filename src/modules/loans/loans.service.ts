import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, IsNull, LessThan, Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { User } from '../users/entities/user.entity';
import {
  OPEN_LOAN_STATUSES,
  RETURNABLE_LOAN_STATUSES,
  TERMINAL_LOAN_STATUSES,
} from './constants/loan-statuses';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ListLoansQueryDto } from './dto/list-loans-query.dto';
import { LoanResponseDto } from './dto/loan-response.dto';
import { Loan, LoanStatus } from './entities/loan.entity';
import { calculateLoanFineAmount, MS_PER_DAY } from './utils/loan-fine.util';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateLoanDto): Promise<LoanResponseDto> {
    await this.refreshOverdueLoans();

    const loanedAt = new Date();
    const dueAt = new Date(dto.dueAt);

    if (Number.isNaN(dueAt.getTime()) || dueAt <= loanedAt) {
      throw new BadRequestException('dueAt must be greater than the current date');
    }

    this.ensureLoanWindowIsAllowed(loanedAt, dueAt);

    return this.dataSource.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const itemsRepository = manager.getRepository(Item);
      const loansRepository = manager.getRepository(Loan);

      const user = await usersRepository.findOne({
        where: { id: dto.userId, isActive: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const item = await itemsRepository.findOne({
        where: { id: dto.itemId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!item) {
        throw new NotFoundException('Item not found');
      }

      const openLoanForItem = await loansRepository.findOne({
        where: {
          itemId: item.id,
          status: In([...OPEN_LOAN_STATUSES]),
        },
      });

      if (openLoanForItem) {
        throw new ConflictException(
          `Item is not available; blocked by loanId ${openLoanForItem.id}`,
        );
      }

      const activeLoansForUser = await loansRepository.count({
        where: {
          userId: user.id,
          status: In([...OPEN_LOAN_STATUSES]),
        },
      });

      if (activeLoansForUser >= this.getMaxActiveLoans()) {
        throw new ConflictException('User has reached the maximum number of active loans');
      }

      const loan = loansRepository.create({
        userId: user.id,
        itemId: item.id,
        loanedAt,
        dueAt,
        returnedAt: null,
        status: LoanStatus.ACTIVE,
        fineAmount: '0.00',
      });

      const savedLoan = await loansRepository.save(loan);
      return this.toLoanResponse(savedLoan);
    });
  }

  async findAll(query: ListLoansQueryDto): Promise<LoanResponseDto[]> {
    await this.refreshOverdueLoans();

    const where: FindOptionsWhere<Loan> = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.itemId) {
      where.itemId = query.itemId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const loans = await this.loansRepository.find({
      where,
      order: { loanedAt: 'DESC' },
    });

    return loans.map((loan) => this.toLoanResponse(loan));
  }

  async findOne(id: string): Promise<LoanResponseDto> {
    await this.refreshOverdueLoans();

    const loan = await this.loansRepository.findOne({ where: { id } });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return this.toLoanResponse(loan);
  }

  async returnLoan(id: string): Promise<LoanResponseDto> {
    await this.refreshOverdueLoans();

    return this.dataSource.transaction(async (manager) => {
      const loansRepository = manager.getRepository(Loan);
      const loan = await loansRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!loan) {
        throw new NotFoundException('Loan not found');
      }

      if (TERMINAL_LOAN_STATUSES.includes(loan.status)) {
        throw new BadRequestException('Loan is terminal and cannot be returned');
      }

      if (!RETURNABLE_LOAN_STATUSES.includes(loan.status)) {
        throw new ConflictException('Loan cannot be returned from its current status');
      }

      const returnedAt = new Date();
      loan.returnedAt = returnedAt;
      loan.status = LoanStatus.RETURNED;
      loan.fineAmount = calculateLoanFineAmount(loan.dueAt, returnedAt, this.getDailyFineRate());

      const savedLoan = await loansRepository.save(loan);
      return this.toLoanResponse(savedLoan);
    });
  }

  async markLost(id: string): Promise<LoanResponseDto> {
    await this.refreshOverdueLoans();

    return this.dataSource.transaction(async (manager) => {
      const loansRepository = manager.getRepository(Loan);
      const loan = await loansRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!loan) {
        throw new NotFoundException('Loan not found');
      }

      if (TERMINAL_LOAN_STATUSES.includes(loan.status)) {
        throw new BadRequestException('Loan is terminal and cannot be marked as lost');
      }

      loan.status = LoanStatus.LOST;

      const savedLoan = await loansRepository.save(loan);
      return this.toLoanResponse(savedLoan);
    });
  }

  private async refreshOverdueLoans(): Promise<void> {
    await this.loansRepository.update(
      { status: LoanStatus.ACTIVE, dueAt: LessThan(new Date()), returnedAt: IsNull() },
      { status: LoanStatus.OVERDUE },
    );
  }

  private ensureLoanWindowIsAllowed(loanedAt: Date, dueAt: Date): void {
    const maxDueAt = new Date(loanedAt.getTime() + this.getMaxLoanDays() * MS_PER_DAY);

    if (dueAt > maxDueAt) {
      throw new BadRequestException(`Loan duration cannot exceed ${this.getMaxLoanDays()} days`);
    }
  }

  private getMaxActiveLoans(): number {
    return this.config.get<number>('loans.maxActivePerUser', 3);
  }

  private getDailyFineRate(): number {
    return this.config.get<number>('loans.dailyFineRate', 0.5);
  }

  private getMaxLoanDays(): number {
    return this.config.get<number>('loans.maxLoanDays', 30);
  }

  private toLoanResponse(loan: Loan): LoanResponseDto {
    return {
      id: loan.id,
      userId: loan.userId,
      itemId: loan.itemId,
      loanedAt: loan.loanedAt,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
      status: loan.status,
      fineAmount: Number(loan.fineAmount).toFixed(2),
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    };
  }
}
