import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { Loan, LoanStatus } from './entities/loan.entity';
import { LoansService } from './loans.service';

interface MockRepository {
  update?: jest.Mock;
  findOne?: jest.Mock;
  count?: jest.Mock;
  create?: jest.Mock;
  save?: jest.Mock;
}

describe('LoansService', () => {
  const now = new Date('2026-01-15T00:00:00.000Z');
  const userId = '4aa8c1b9-4415-4f1f-9bd6-763fd130f767';
  const itemId = '592eac52-8fb7-41b4-96a4-4497c395da78';
  const loanId = 'c76003af-c048-4f56-ae94-f8ba3c581c3d';

  let service: LoansService;
  let loansRepository: MockRepository;
  let transactionLoansRepository: MockRepository;
  let usersRepository: MockRepository;
  let itemsRepository: MockRepository;
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);

    loansRepository = {
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    transactionLoansRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((loan: Partial<Loan>) => ({
        id: loanId,
        createdAt: now,
        updatedAt: now,
        ...loan,
      })),
      save: jest.fn(async (loan: Loan) => loan),
    };
    usersRepository = {
      findOne: jest.fn(),
    };
    itemsRepository = {
      findOne: jest.fn(),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === User) {
          return usersRepository;
        }

        if (entity === Item) {
          return itemsRepository;
        }

        return transactionLoansRepository;
      }),
    } as unknown as EntityManager;

    dataSource = {
      transaction: jest.fn(async (work: (manager: EntityManager) => Promise<unknown>) =>
        work(manager),
      ),
    };

    const config = {
      get: jest.fn((key: string, defaultValue?: number) => {
        const values: Record<string, number> = {
          'loans.maxActivePerUser': 3,
          'loans.dailyFineRate': 0.5,
          'loans.maxLoanDays': 30,
        };

        return values[key] ?? defaultValue;
      }),
    };

    service = new LoansService(
      loansRepository as unknown as Repository<Loan>,
      config as unknown as ConfigService,
      dataSource as unknown as DataSource,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a loan when item is available, user is under the limit, and dates are valid', async () => {
    usersRepository.findOne?.mockResolvedValue(buildUser());
    itemsRepository.findOne?.mockResolvedValue(buildItem());
    transactionLoansRepository.findOne?.mockResolvedValue(null);
    transactionLoansRepository.count?.mockResolvedValue(2);

    const dto: CreateLoanDto = {
      userId,
      itemId,
      dueAt: '2026-01-20T00:00:00.000Z',
    };

    const result = await service.create(dto);

    expect(result).toMatchObject({
      id: loanId,
      userId,
      itemId,
      status: LoanStatus.ACTIVE,
      fineAmount: '0.00',
    });
    expect(result.loanedAt).toEqual(now);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(transactionLoansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        itemId,
        loanedAt: now,
        dueAt: new Date(dto.dueAt),
        returnedAt: null,
        status: LoanStatus.ACTIVE,
      }),
    );
  });

  it('throws ConflictException when the item already has an active loan', async () => {
    usersRepository.findOne?.mockResolvedValue(buildUser());
    itemsRepository.findOne?.mockResolvedValue(buildItem());
    transactionLoansRepository.findOne?.mockResolvedValue(
      buildLoan({ id: '34ca68ba-0e8d-438a-9d90-811f16b2fe86', status: LoanStatus.ACTIVE }),
    );

    await expect(
      service.create({
        userId,
        itemId,
        dueAt: '2026-01-20T00:00:00.000Z',
      }),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.create({
        userId,
        itemId,
        dueAt: '2026-01-20T00:00:00.000Z',
      }),
    ).rejects.toThrow('34ca68ba-0e8d-438a-9d90-811f16b2fe86');
  });

  it('throws ConflictException when the user already has 3 active loans', async () => {
    usersRepository.findOne?.mockResolvedValue(buildUser());
    itemsRepository.findOne?.mockResolvedValue(buildItem());
    transactionLoansRepository.findOne?.mockResolvedValue(null);
    transactionLoansRepository.count?.mockResolvedValue(3);

    await expect(
      service.create({
        userId,
        itemId,
        dueAt: '2026-01-20T00:00:00.000Z',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('calculates the return fine for a loan that is 5 days overdue', async () => {
    const overdueLoan = buildLoan({
      dueAt: new Date('2026-01-10T00:00:00.000Z'),
      status: LoanStatus.OVERDUE,
    });

    transactionLoansRepository.findOne?.mockResolvedValue(overdueLoan);
    transactionLoansRepository.save?.mockImplementation(async (loan: Loan) => ({
      ...loan,
      updatedAt: now,
    }));

    const result = await service.returnLoan(loanId);

    expect(result).toMatchObject({
      id: loanId,
      status: LoanStatus.RETURNED,
      fineAmount: '2.50',
      returnedAt: now,
    });
    expect(transactionLoansRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: LoanStatus.RETURNED,
        returnedAt: now,
        fineAmount: '2.50',
      }),
    );
  });

  function buildUser(): User {
    return {
      id: userId,
      email: 'member@example.com',
      passwordHash: 'hash',
      firstName: 'Member',
      lastName: 'User',
      role: UserRole.MEMBER,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  function buildItem(): Item {
    return {
      id: itemId,
      code: 'BK-UNIT-001',
      title: 'Unit Testing',
      type: 'book' as Item['type'],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  function buildLoan(overrides: Partial<Loan> = {}): Loan {
    return {
      id: loanId,
      userId,
      itemId,
      user: buildUser(),
      item: buildItem(),
      loanedAt: new Date('2026-01-01T00:00:00.000Z'),
      dueAt: new Date('2026-01-20T00:00:00.000Z'),
      returnedAt: null,
      status: LoanStatus.ACTIVE,
      fineAmount: '0.00',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }
});
