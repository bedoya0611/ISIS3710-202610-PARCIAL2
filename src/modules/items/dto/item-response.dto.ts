import { ApiProperty } from '@nestjs/swagger';
import { ItemType } from '../entities/item.entity';

export class ItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'BK-0042' })
  code!: string;

  @ApiProperty({ example: 'Clean Architecture' })
  title!: string;

  @ApiProperty({ enum: ItemType, example: ItemType.BOOK })
  type!: ItemType;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
