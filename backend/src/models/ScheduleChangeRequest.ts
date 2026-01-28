import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './User';
import { Schedule } from './Schedule';
import { Group } from './Group';

export enum ScheduleChangeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('schedule_change_requests')
export class ScheduleChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  scheduleId: string;

  @ManyToOne(() => Schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule;

  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ type: 'uuid' })
  requesterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  // 변경 요청 내용
  @Column({ type: 'timestamp', nullable: true })
  requestedStartAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  requestedEndAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string; // 요청 사유

  @Column({
    type: 'simple-enum',
    enum: ScheduleChangeRequestStatus,
    default: ScheduleChangeRequestStatus.PENDING,
  })
  status: ScheduleChangeRequestStatus;

  @Column({ type: 'text', nullable: true })
  responseNote: string; // 관리자 응답 메모

  @Column({ type: 'uuid', nullable: true })
  respondedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'respondedById' })
  respondedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
