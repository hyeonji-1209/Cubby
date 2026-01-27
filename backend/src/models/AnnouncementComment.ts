import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Announcement } from './Announcement';
import { User } from './User';

@Entity('announcement_comments')
export class AnnouncementComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  announcementId: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null; // 대댓글인 경우 부모 댓글 ID

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Announcement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcementId' })
  announcement: Announcement;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => AnnouncementComment, (comment) => comment.replies, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent: AnnouncementComment | null;

  @OneToMany(() => AnnouncementComment, (comment) => comment.parent)
  replies: AnnouncementComment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
