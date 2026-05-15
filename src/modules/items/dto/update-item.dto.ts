import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ItemType } from '../entities/item.entity';

export class UpdateItemDto {
  @ApiPropertyOptional({ example: 'Clean Architecture, 2nd Edition', maxLength: 255 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ enum: ItemType, example: ItemType.EQUIPMENT })
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;
}
