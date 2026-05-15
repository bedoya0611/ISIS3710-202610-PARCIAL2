import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ItemIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
