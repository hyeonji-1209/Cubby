import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LessonRoom } from './LessonRoom';
import { User } from './User';
import { Group } from './Group';

export enum LessonReservationStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('lesson_room_reservations')
export class LessonRoomReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roomId: string;

  @ManyToOne(() => LessonRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: LessonRoom;

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

  // 학생 ID (1:1 수업에서 학생 추적용, nullable - 관리자 예약 시)
  @Column({ type: 'uuid', nullable: true })
  studentId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'time' })
  startTime: string; // HH:mm

  @Column({ type: 'time' })
  endTime: string; // HH:mm

  @Column({
    type: 'enum',
    enum: LessonReservationStatus,
    default: LessonReservationStatus.CONFIRMED,
  })
  status: LessonReservationStatus;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
