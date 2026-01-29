import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { Group } from './Group';
import { SubGroup } from './SubGroup';
import { Schedule } from './Schedule';

export enum AbsenceRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum AbsenceType {
  PERSONAL = 'personal',     // 개인 사유
  SICK = 'sick',             // 병결
  FAMILY = 'family',         // 가정 사정
  TRAVEL = 'travel',         // 여행/출장
  EXAM = 'exam',             // 시험
  OTHER = 'other',           // 기타
}

@Entity('absence_requests')
@Index(['groupId', 'scheduleId', 'requesterId'])
@Index(['groupId', 'status'])
export class AbsenceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid', nullable: true })
  subGroupId: string; // 반(CLASS) 소그룹 ID (그룹 수업인 경우)

  @Column({ type: 'uuid', nullable: true })
  scheduleId: string; // 관련 일정 ID (특정 일정에 대한 결석 신청인 경우)

  @Column({ type: 'uuid' })
  requesterId: string; // 신청자 (본인 또는 보호자)

  @Column({ type: 'uuid', nullable: true })
  studentId: string; // 실제 학생 ID (보호자가 대신 신청하는 경우)

  @Column({ type: 'date' })
  absenceDate: Date; // 결석 날짜

  @Column({ type: 'enum', enum: AbsenceType, default: AbsenceType.PERSONAL })
  absenceType: AbsenceType;

  @Column({ type: 'text' })
  reason: string; // 결석 사유

  @Column({ type: 'enum', enum: AbsenceRequestStatus, default: AbsenceRequestStatus.PENDING })
  status: AbsenceRequestStatus;

  @Column({ type: 'text', nullable: true })
  responseNote: string; // 관리자 응답 메모

  @Column({ type: 'uuid', nullable: true })
  respondedById: string; // 응답한 관리자

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  // Relations
  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => SubGroup, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subGroupId' })
  subGroup: SubGroup;

  @ManyToOne(() => Schedule, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'respondedById' })
  respondedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
