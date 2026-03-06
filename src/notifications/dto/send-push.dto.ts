import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SendPushDto {
  @ApiPropertyOptional({ example: 'device_fcm_token_here' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ example: 'all-users' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ example: 'New message' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'You have a new message from John' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: { orderId: '123' } })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}
