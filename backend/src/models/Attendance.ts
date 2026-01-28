import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Schedule } from './Schedule';
import { User } from './User';
import { Group } from './Group';

export enum AttendanceStatus {
  PRESENT = 'present',       // 출석
  ABSENT = 'absent',         // 결석
  LATE = 'late',             // 지각
  EXCUSED = 'excused',       // 사유 결석
  EARLY_LEAVE = 'early_leave', // 조퇴
}

@Entity('attendances')
@Unique(['scheduleId', 'userId'])
export class Attendance {
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
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'timestamp', nullable: true })
  checkedAt: Date; // QR 스캔 시각 (출석)

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date; // 퇴장 시각 (조퇴 시)

  @Column({ type: 'text', nullable: true })
  note: string; // 비고 (지각/결석 사유 등)

  @Column({ type: 'uuid', nullable: true })
  checkedById: string; // 출석 처리한 관리자 (수동 처리 시)

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checkedById' })
  checkedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
