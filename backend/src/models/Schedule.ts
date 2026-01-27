import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Group } from './Group';
import { SubGroup } from './SubGroup';
import { User } from './User';

@Entity('schedules')
@Index(['groupId', 'startAt', 'endAt']) // 기간별 조회 최적화
@Index(['groupId', 'deletedAt']) // 목록 조회 최적화
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid', nullable: true })
  subGroupId: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'datetime' })
  startAt: Date;

  @Column({ type: 'datetime' })
  endAt: Date;

  @Column({ type: 'boolean', default: false })
  isAllDay: boolean;

  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string;

  @Column({ type: 'json', nullable: true })
  locationData: {
    name: string;
    address: string;
    detail?: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  };

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'json', nullable: true })
  recurrence: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    count?: number;
  };

  @ManyToOne(() => Group, (group) => group.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => SubGroup, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subGroupId' })
  subGroup: SubGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
