import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendSmsDto {
  @ApiProperty({ example: '+14155552671' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ example: 'Your verification code is 123456' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}
