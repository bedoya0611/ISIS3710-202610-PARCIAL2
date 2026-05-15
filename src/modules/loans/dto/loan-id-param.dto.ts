import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LoanIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
