import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './User';
import { Group } from './Group';

export enum MemberRole {
  OWNER = 'owner',           // 운영자/관리자
  ADMIN = 'admin',           // 관리자
  LEADER = 'leader',         // 리더/담당자
  MEMBER = 'member',         // 멤버/구성원
  GUARDIAN = 'guardian',     // 보호자
}

export enum MemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

// 보호자의 자녀 정보
export interface ChildInfo {
  name: string;           // 자녀 이름
  birthYear?: number;     // 출생년도
  gender?: 'male' | 'female' | 'other';
  note?: string;          // 메모 (알레르기, 특이사항 등)
}

// 1:1 수업 스케줄 (요일 + 시간 + 수업실)
export interface LessonSchedule {
  dayOfWeek: number;      // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  startTime: string;      // "14:00"
  endTime: string;        // "15:00"
  lessonRoomId?: string;  // 배정된 수업실 ID
  lessonRoomName?: string; // 수업실 이름 (표시용, 저장 시점에 캐싱)
}

@Entity('group_members')
@Unique(['groupId', 'userId'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.PENDING })
  status: MemberStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  title: string; // 직책/직분 (본인이 설정)

  @Column({ type: 'uuid', nullable: true })
  positionId: string; // 선택한 직책 ID (GroupPosition)

  @Column({ type: 'json', nullable: true })
  childInfo: ChildInfo[]; // 보호자인 경우 자녀 정보 (복수)

  // 1:1 교육 그룹 전용 필드
  @Column({ type: 'json', nullable: true })
  lessonSchedule: LessonSchedule[]; // 수업 스케줄 (복수 가능)

  @Column({ type: 'int', nullable: true })
  paymentDueDay: number; // 수강료 납부일 (1-31)

  @Column({ type: 'uuid', nullable: true })
  instructorId: string; // 담당 강사 ID (다중 강사 모드에서 사용)

  @Column({ type: 'uuid', nullable: true })
  invitedBy: string;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
