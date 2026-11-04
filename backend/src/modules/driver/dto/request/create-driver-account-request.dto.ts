import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MOBILE_NUMBER_PATTERN } from '@/common/constants/mobile-number.constant';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/common/constants/password.constant';

/**
 * Driver profile and the password the administrator assigns.
 */
export class CreateDriverAccountRequestDto {
  @ApiProperty({ description: 'Driver display name', example: 'Ahmad Ali' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
  @ApiProperty({ description: 'Driver sign-in mobile number', example: '0999765432' })
  @IsString()
  @Matches(MOBILE_NUMBER_PATTERN)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  mobileNumber!: string;
  @ApiProperty({ description: 'Initial sign-in password', example: 'driver-password', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
