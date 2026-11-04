import { ApiProperty } from '@nestjs/swagger';

/**
 * Access token returned after a successful sign-in.
 */
export class SignInResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.signature' })
  readonly accessToken: string;
  @ApiProperty({ example: 'Bearer' })
  readonly tokenType: 'Bearer';
  @ApiProperty({ example: '15m', description: 'Configured access-token lifetime.' })
  readonly expiresIn: string;
  constructor(accessToken: string, expiresIn: string) {
    this.accessToken = accessToken;
    this.tokenType = 'Bearer';
    this.expiresIn = expiresIn;
  }
}
