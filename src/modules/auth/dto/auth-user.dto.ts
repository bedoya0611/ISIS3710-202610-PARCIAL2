import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserRole } from '@modules/users/entities/user.entity';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id!: string;

  @ApiProperty({ example: 'member@example.com' })
  @Expose()
  email!: string;

  @ApiProperty({ example: 'Ada' })
  @Expose()
  firstName!: string;

  @ApiProperty({ example: 'Lovelace' })
  @Expose()
  lastName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.MEMBER })
  @Expose()
  role!: UserRole;

  @ApiProperty({ example: true })
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;
}
