import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './Group';

@Entity('lesson_rooms')
export class LessonRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'varchar', length: 50 })
  name: string; // 레슨실 이름 (예: A실, B실, 1번방)

  @Column({ type: 'int', default: 0 })
  order: number; // 정렬 순서

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 활성화 여부

  @Column({ type: 'int', default: 1 })
  capacity: number; // 수용 인원 (보통 1:1 레슨은 1~2명)

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string; // 시간표에서 구분용 색상

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
