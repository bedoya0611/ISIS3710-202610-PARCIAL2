import { ApiProperty } from '@nestjs/swagger';
import { LoanStatus } from '../entities/loan.entity';

export class LoanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  itemId!: string;

  @ApiProperty({ format: 'date-time' })
  loanedAt!: Date;

  @ApiProperty({ format: 'date-time' })
  dueAt!: Date;

  @ApiProperty({ format: 'date-time', nullable: true })
  returnedAt!: Date | null;

  @ApiProperty({ enum: LoanStatus, example: LoanStatus.ACTIVE })
  status!: LoanStatus;

  @ApiProperty({ example: '0.00' })
  fineAmount!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
