import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendEmailTemplateDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'welcome_email' })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiPropertyOptional({ example: { name: 'John' } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}
