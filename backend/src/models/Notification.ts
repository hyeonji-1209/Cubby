import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { Group } from './Group';

export enum NotificationType {
  // 멤버 관련
  MEMBER_JOIN_REQUEST = 'member_join_request',      // 가입 신청
  MEMBER_APPROVED = 'member_approved',              // 가입 승인됨
  MEMBER_REJECTED = 'member_rejected',              // 가입 거절됨
  MEMBER_REMOVED = 'member_removed',                // 멤버 제외됨
  MEMBER_JOINED = 'member_joined',                  // 새 멤버 가입
  MEMBER_LEFT = 'member_left',                      // 멤버 탈퇴
  ROLE_CHANGED = 'role_changed',                    // 역할 변경

  // 소모임 관련
  SUBGROUP_REQUEST = 'subgroup_request',            // 소모임 생성 요청
  SUBGROUP_APPROVED = 'subgroup_approved',          // 소모임 승인됨
  SUBGROUP_REJECTED = 'subgroup_rejected',          // 소모임 거절됨
  SUBGROUP_CREATED_NOTIFY = 'subgroup_created_notify', // 하위 소모임 생성 알림

  // 일정 관련
  SCHEDULE_CREATED = 'schedule_created',            // 새 일정 등록
  SCHEDULE_UPDATED = 'schedule_updated',            // 일정 변경
  SCHEDULE_CANCELLED = 'schedule_cancelled',        // 일정 취소
  SCHEDULE_REMINDER = 'schedule_reminder',          // 일정 리마인더
  NEW_SCHEDULE = 'new_schedule',                    // 새 일정 (하위 호환)

  // 일정 변경 요청 관련
  SCHEDULE_CHANGE_REQUEST = 'schedule_change_request',   // 일정 변경 요청
  SCHEDULE_CHANGE_APPROVED = 'schedule_change_approved', // 일정 변경 승인
  SCHEDULE_CHANGE_REJECTED = 'schedule_change_rejected', // 일정 변경 거절

  // 결석 관련
  ABSENCE_REQUEST = 'absence_request',              // 결석 신청
  ABSENCE_APPROVED = 'absence_approved',            // 결석 승인
  ABSENCE_REJECTED = 'absence_rejected',            // 결석 거절

  // 수업실 예약 관련
  RESERVATION_CREATED = 'reservation_created',      // 예약 생성
  RESERVATION_CANCELLED = 'reservation_cancelled',  // 예약 취소
  RESERVATION_REMINDER = 'reservation_reminder',    // 예약 리마인더

  // 공지사항
  ANNOUNCEMENT_NEW = 'announcement_new',            // 새 공지
  NEW_ANNOUNCEMENT = 'new_announcement',            // 새 공지사항 (하위 호환)

  // 그룹 관련
  GROUP_SETTINGS_UPDATED = 'group_settings_updated', // 그룹 설정 변경

  // 시스템
  SYSTEM = 'system',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string; // 알림 받는 사용자

  @Column({ type: 'uuid', nullable: true })
  groupId: string; // 관련 그룹 (있는 경우)

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, unknown>; // 추가 데이터 (링크, ID 등)

  @Column({ type: 'enum', enum: NotificationPriority, default: NotificationPriority.NORMAL })
  priority: NotificationPriority;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'uuid', nullable: true })
  actorId: string; // 알림 발생시킨 사용자 (있는 경우)

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Group, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @CreateDateColumn()
  createdAt: Date;
}
