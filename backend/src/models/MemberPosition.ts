import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { GroupMember } from './GroupMember';
import { GroupPosition } from './GroupPosition';

// 멤버에게 직책 할당
@Entity('member_positions')
@Unique(['memberId', 'positionId'])
export class MemberPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  memberId: string;

  @Column({ type: 'uuid' })
  positionId: string;

  @Column({ type: 'uuid', nullable: true })
  assignedById: string; // 직책을 부여한 사람

  @Column({ type: 'datetime', nullable: true })
  startDate: Date; // 임기 시작일

  @Column({ type: 'datetime', nullable: true })
  endDate: Date; // 임기 종료일

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => GroupMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: GroupMember;

  @ManyToOne(() => GroupPosition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'positionId' })
  position: GroupPosition;

  @CreateDateColumn()
  createdAt: Date;
}
