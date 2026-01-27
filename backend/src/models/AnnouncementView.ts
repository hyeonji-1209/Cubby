import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Announcement } from './Announcement';
import { User } from './User';

@Entity('announcement_views')
@Unique(['announcementId', 'userId']) // 한 사용자당 한 공지에 한 번만 기록
export class AnnouncementView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcementId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Announcement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcementId' })
  announcement: Announcement;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  viewedAt: Date;
}
