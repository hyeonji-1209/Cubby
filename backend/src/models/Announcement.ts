import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Group } from './Group';
import { SubGroup } from './SubGroup';
import { User } from './User';

@Entity('announcements')
@Index(['groupId', 'isPinned', 'createdAt']) // 홈탭 조회 최적화
@Index(['groupId', 'isPublished', 'deletedAt']) // 목록 조회 최적화
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid', nullable: true })
  subGroupId: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Column({ type: 'boolean', default: false })
  isAdminOnly: boolean;

  @Column({ type: 'json', nullable: true })
  attachments: { name: string; url: string; type: string }[];

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @ManyToOne(() => Group, (group) => group.announcements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => SubGroup, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subGroupId' })
  subGroup: SubGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
