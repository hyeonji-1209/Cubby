import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Group } from './Group';
import { MemberPosition } from './MemberPosition';

// 직책 권한 플래그
export interface PositionPermissions {
  canManageMembers?: boolean;      // 멤버 관리
  canManageSubGroups?: boolean;    // 소모임 관리
  canManageAnnouncements?: boolean; // 공지 관리
  canManageSchedules?: boolean;    // 일정 관리
  canManageFinance?: boolean;      // 재정 관리 (회비 등)
  canApproveRequests?: boolean;    // 요청 승인
  customPermissions?: string[];    // 기타 커스텀 권한
}

@Entity('group_positions')
export class GroupPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid', nullable: true })
  subGroupId: string; // 소모임 전용 직책인 경우

  @Column({ type: 'varchar', length: 50 })
  name: string; // 재정담당자, 강사, 총무 등

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string; // 직책 뱃지 색상

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string; // 직책 아이콘

  @Column({ type: 'int', default: 0 })
  sortOrder: number; // 정렬 순서

  @Column({ type: 'json', nullable: true })
  permissions: PositionPermissions;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @OneToMany(() => MemberPosition, (mp) => mp.position)
  memberPositions: MemberPosition[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
