import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ItemType } from '../entities/item.entity';

export class CreateItemDto {
  @ApiProperty({ example: 'BK-0042', maxLength: 32 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'Clean Architecture', maxLength: 255 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ enum: ItemType, example: ItemType.BOOK })
  @IsEnum(ItemType)
  type!: ItemType;
}
