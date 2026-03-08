import { Module } from '@nestjs/common';
import { FirebaseController } from './firebase.controller';

@Module({
  controllers: [FirebaseController],
})
export class FirebaseModule {}
