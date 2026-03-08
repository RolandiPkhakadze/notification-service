import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplate } from './database/entities/notification-template.entity';
import { Notification } from './database/entities/notification.entity';
import { User } from './database/entities/user.entity';
import { FirebaseModule } from './firebase/firebase.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TemplatesModule } from './templates/templates.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.getOrThrow('DB_USER'),
        password: config.getOrThrow('DB_PASSWORD'),
        database: config.getOrThrow('DB_NAME'),
        entities: [User, Notification, NotificationTemplate],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        ssl:
          config.get('DB_SSL') === 'true'
            ? { rejectUnauthorized: config.get('DB_SSL_REJECT_UNAUTHORIZED') !== 'false' }
            : false,
      }),
    }),

    FirebaseModule,
    HealthModule,
    NotificationsModule,
    TemplatesModule,
    WebhooksModule,
  ],
})
export class AppModule {}
