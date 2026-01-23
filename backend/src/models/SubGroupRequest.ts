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
import { SubGroup } from './SubGroup';
import { User } from './User';

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('sub_group_requests')
export class SubGroupRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string; // 최상위 큰 모임

  @Column({ type: 'uuid', nullable: true })
  parentSubGroupId: string; // 상위 소모임 (null이면 큰모임 직속)

  @Column({ type: 'uuid' })
  requesterId: string; // 요청자

  @Column({ type: 'uuid', nullable: true })
  approverId: string; // 승인/거절한 관리자

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string; // 거절 사유

  @Column({ type: 'uuid', nullable: true })
  createdSubGroupId: string; // 승인 후 생성된 소모임 ID

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => SubGroup, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentSubGroupId' })
  parentSubGroup: SubGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver: User;

  @ManyToOne(() => SubGroup, { nullable: true })
  @JoinColumn({ name: 'createdSubGroupId' })
  createdSubGroup: SubGroup;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
