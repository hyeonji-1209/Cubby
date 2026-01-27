import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './User';

export enum LikeTargetType {
  ANNOUNCEMENT = 'announcement',
  COMMENT = 'comment',
}

@Entity('likes')
@Unique(['userId', 'targetType', 'targetId']) // 한 사용자가 같은 대상에 중복 좋아요 방지
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: LikeTargetType })
  targetType: LikeTargetType;

  @Column({ type: 'uuid' })
  targetId: string; // announcementId 또는 commentId

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
