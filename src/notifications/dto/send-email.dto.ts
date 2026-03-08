import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'Your order has shipped' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ example: 'Plain text body' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ example: '<h1>Hello</h1>' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ description: 'Optional userId to track notification' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
