import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './User';
import { Group } from './Group';

@Entity('lesson_records')
@Unique(['groupId', 'memberId', 'lessonDate', 'lessonStartTime'])
export class LessonRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ type: 'uuid' })
  memberId: string; // userId of the student

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: User;

  @Column({ type: 'date' })
  lessonDate: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 5 })
  lessonStartTime: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  lessonEndTime: string; // HH:mm

  @Column({ type: 'text', nullable: true })
  previousContent: string; // 지난 수업 내용

  @Column({ type: 'text', nullable: true })
  currentContent: string; // 이번 수업 내용

  @Column({ type: 'text', nullable: true })
  homework: string; // 과제

  @Column({ type: 'text', nullable: true })
  note: string; // 비고

  @Column({ type: 'uuid', nullable: true })
  attendanceId: string; // 출석 기록 연결 (optional)

  @Column({ type: 'uuid', nullable: true })
  createdById: string; // 작성자 (선생님)

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
