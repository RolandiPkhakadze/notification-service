import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Notification } from './notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  fcmToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Notification, (n) => n.user)
  notifications: Notification[];
}
