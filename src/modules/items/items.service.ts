import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, LessThan, QueryFailedError, Repository } from 'typeorm';
import { LoanStatus } from '../loans/entities/loan.entity';
import { OPEN_LOAN_STATUSES } from '../loans/constants/loan-statuses';
import { Loan } from '../loans/entities/loan.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './entities/item.entity';

interface PostgresError {
  code?: string;
}

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
  ) {}

  async create(dto: CreateItemDto): Promise<ItemResponseDto> {
    const item = this.itemsRepository.create({
      code: dto.code,
      title: dto.title,
      type: dto.type,
      isActive: true,
    });

    try {
      const savedItem = await this.itemsRepository.save(item);
      return this.toItemResponse(savedItem, true);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Item code is already registered');
      }

      throw error;
    }
  }

  async findAll(query: ListItemsQueryDto): Promise<ItemResponseDto[]> {
    await this.refreshOverdueLoans();

    const where: FindOptionsWhere<Item> = { isActive: true };

    if (query.type) {
      where.type = query.type;
    }

    const items = await this.itemsRepository.find({
      where,
      order: { code: 'ASC' },
    });
    const unavailableItemIds = await this.findUnavailableItemIds(items.map((item) => item.id));

    return items.map((item) => this.toItemResponse(item, !unavailableItemIds.has(item.id)));
  }

  async findOne(id: string): Promise<ItemResponseDto> {
    await this.refreshOverdueLoans();

    const item = await this.itemsRepository.findOne({ where: { id, isActive: true } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const isAvailable = !(await this.hasOpenLoan(item.id));
    return this.toItemResponse(item, isAvailable);
  }

  async update(id: string, dto: UpdateItemDto): Promise<ItemResponseDto> {
    await this.refreshOverdueLoans();

    const item = await this.itemsRepository.findOne({ where: { id, isActive: true } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (dto.title === undefined && dto.type === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    if (dto.title !== undefined) {
      item.title = dto.title;
    }

    if (dto.type !== undefined) {
      item.type = dto.type;
    }

    const savedItem = await this.itemsRepository.save(item);
    const isAvailable = !(await this.hasOpenLoan(savedItem.id));
    return this.toItemResponse(savedItem, isAvailable);
  }

  async remove(id: string): Promise<void> {
    const item = await this.itemsRepository.findOne({ where: { id, isActive: true } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    item.isActive = false;
    await this.itemsRepository.save(item);
  }

  private async refreshOverdueLoans(): Promise<void> {
    await this.loansRepository.update(
      { status: LoanStatus.ACTIVE, dueAt: LessThan(new Date()) },
      { status: LoanStatus.OVERDUE },
    );
  }

  private async findUnavailableItemIds(itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) {
      return new Set();
    }

    const loans = await this.loansRepository.find({
      select: { itemId: true },
      where: {
        itemId: In(itemIds),
        status: In([...OPEN_LOAN_STATUSES]),
      },
    });

    return new Set(loans.map((loan) => loan.itemId));
  }

  private async hasOpenLoan(itemId: string): Promise<boolean> {
    const count = await this.loansRepository.count({
      where: {
        itemId,
        status: In([...OPEN_LOAN_STATUSES]),
      },
    });

    return count > 0;
  }

  private toItemResponse(item: Item, isAvailable: boolean): ItemResponseDto {
    return {
      id: item.id,
      code: item.code,
      title: item.title,
      type: item.type,
      isActive: item.isActive,
      isAvailable,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as PostgresError | undefined)?.code === '23505'
    );
  }
}
