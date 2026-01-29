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
import { Group } from './Group';
import { User } from './User';

export enum HolidayType {
  REGULAR = 'regular',       // 정기 휴일 (매주 특정 요일)
  SPECIFIC = 'specific',     // 특정 날짜 휴일
  RANGE = 'range',           // 기간 휴일 (방학 등)
}

@Entity('holidays')
@Index(['groupId', 'date'])
@Index(['groupId', 'startDate', 'endDate'])
export class Holiday {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'enum', enum: HolidayType, default: HolidayType.SPECIFIC })
  type: HolidayType;

  @Column({ type: 'varchar', length: 100 })
  name: string; // 휴일 이름 (예: 설날, 여름방학)

  @Column({ type: 'text', nullable: true })
  description: string;

  // 특정 날짜 휴일용
  @Column({ type: 'date', nullable: true })
  date: string;

  // 기간 휴일용
  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  // 정기 휴일용 (매주 특정 요일)
  @Column({ type: 'simple-array', nullable: true })
  recurringDays: number[]; // 0=일, 1=월, ... 6=토

  // 알림 관련
  @Column({ type: 'boolean', default: true })
  notifyMembers: boolean; // 멤버들에게 알림 발송 여부

  @Column({ type: 'boolean', default: false })
  notificationSent: boolean; // 알림 발송 완료 여부

  @Column({ type: 'timestamp', nullable: true })
  notificationSentAt: Date;

  // 보강 관련 (그룹 수업용)
  @Column({ type: 'boolean', default: false })
  requiresMakeup: boolean; // 보강 필요 여부

  @Column({ type: 'uuid', nullable: true })
  createdById: string;

  // Relations
  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
