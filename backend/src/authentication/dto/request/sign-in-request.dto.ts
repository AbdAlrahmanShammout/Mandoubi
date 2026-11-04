import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MOBILE_NUMBER_PATTERN } from '@/common/constants/mobile-number.constant';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/common/constants/password.constant';

/**
 * Mobile number and password presented at sign-in.
 */
export class SignInRequestDto {
  @ApiProperty({ description: 'Account mobile number', example: '0999000000' })
  @IsString()
  @Matches(MOBILE_NUMBER_PATTERN)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  mobileNumber!: string;
  @ApiProperty({ description: 'Account password', example: 'replace-with-a-long-password', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
