import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class SendPushDto {
  @ApiPropertyOptional({ example: 'device_fcm_token_here' })
  @ValidateIf((o) => !o.topic)
  @IsString()
  @IsNotEmpty({ message: 'Either token or topic is required' })
  token?: string;

  @ApiPropertyOptional({ example: 'all-users' })
  @ValidateIf((o) => !o.token)
  @IsString()
  @IsNotEmpty({ message: 'Either token or topic is required' })
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
  @IsUUID()
  userId?: string;
}
