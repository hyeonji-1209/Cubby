import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Group } from './Group';

export enum NotificationType {
  // 소모임 관련
  SUBGROUP_REQUEST = 'subgroup_request',           // 소모임 생성 요청
  SUBGROUP_APPROVED = 'subgroup_approved',         // 소모임 승인됨
  SUBGROUP_REJECTED = 'subgroup_rejected',         // 소모임 거절됨
  SUBGROUP_CREATED_NOTIFY = 'subgroup_created_notify', // 하위 소모임 생성 알림 (상위 관리자용)

  // 멤버 관련
  MEMBER_JOINED = 'member_joined',                 // 새 멤버 가입
  MEMBER_LEFT = 'member_left',                     // 멤버 탈퇴
  ROLE_CHANGED = 'role_changed',                   // 역할 변경

  // 공지/일정
  NEW_ANNOUNCEMENT = 'new_announcement',           // 새 공지사항
  NEW_SCHEDULE = 'new_schedule',                   // 새 일정
  SCHEDULE_REMINDER = 'schedule_reminder',         // 일정 리마인더

  // 시스템
  SYSTEM = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string; // 받는 사람

  @Column({ type: 'uuid', nullable: true })
  groupId: string; // 관련 모임

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, unknown>; // 추가 데이터 (링크, ID 등)

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Group, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @CreateDateColumn()
  createdAt: Date;
}
