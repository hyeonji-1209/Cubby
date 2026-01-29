import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Group } from './Group';
import { User } from './User';
import { LessonRoom } from './LessonRoom';

// 반(class) 수업 스케줄 (요일 + 시간)
export interface ClassSchedule {
  dayOfWeek: number;      // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  startTime: string;      // "14:00"
  endTime: string;        // "15:00"
}

export enum SubGroupStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending', // 승인 대기
}

export enum SubGroupType {
  GENERAL = 'general',       // 일반 소그룹
  CLASS = 'class',           // 반 (그룹 수업용)
  INSTRUCTOR = 'instructor', // 강사별 소그룹 (1:1 수업용)
}

@Entity('sub_groups')
export class SubGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  parentGroupId: string;

  @Column({ type: 'uuid', nullable: true })
  parentSubGroupId: string; // 상위 소모임 (중첩 구조)

  @Column({ type: 'int', default: 0 })
  depth: number; // 0: 큰모임 직속, 1: 중간모임, 2: 작은모임...

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string;

  @Column({ type: 'uuid', nullable: true })
  leaderId: string;

  @Column({ type: 'uuid', nullable: true })
  createdById: string; // 생성 요청자

  @Column({ type: 'json', nullable: true })
  settings: Record<string, unknown>;

  @Column({ type: 'enum', enum: SubGroupStatus, default: SubGroupStatus.PENDING })
  status: SubGroupStatus;

  @Column({ type: 'enum', enum: SubGroupType, default: SubGroupType.GENERAL })
  type: SubGroupType;

  // 강사별 소그룹일 때 담당 강사의 User ID (type=INSTRUCTOR일 때 사용)
  @Column({ type: 'uuid', nullable: true })
  instructorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  // 반(class) 전용 필드들 (type=CLASS일 때 사용)
  // 수업 시간표 (복수 요일 지원)
  @Column({ type: 'json', nullable: true })
  classSchedule: ClassSchedule[];

  // 수업 수업실 ID
  @Column({ type: 'uuid', nullable: true })
  lessonRoomId: string;

  @ManyToOne(() => LessonRoom, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lessonRoomId' })
  lessonRoom: LessonRoom;

  @ManyToOne(() => Group, (group) => group.subGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentGroupId' })
  parentGroup: Group;

  @ManyToOne(() => SubGroup, (subGroup) => subGroup.childSubGroups, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentSubGroupId' })
  parentSubGroup: SubGroup;

  @OneToMany(() => SubGroup, (subGroup) => subGroup.parentSubGroup)
  childSubGroups: SubGroup[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'leaderId' })
  leader: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
