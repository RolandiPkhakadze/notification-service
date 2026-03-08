import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { NotificationChannel } from '../../database/entities/notification.entity';

export class BulkSendDto {
  @ApiProperty({ example: ['uuid1', 'uuid2'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds: string[];

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ example: 'Flash sale starts now!' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'Big Sale!' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: { discount: '20%' } })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
