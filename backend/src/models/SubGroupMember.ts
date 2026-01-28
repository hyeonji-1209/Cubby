import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { SubGroup } from './SubGroup';
import { GroupMember } from './GroupMember';

export enum SubGroupMemberRole {
  LEADER = 'leader',     // 소그룹 리더 (강사)
  MEMBER = 'member',     // 소그룹 멤버 (학생)
}

@Entity('sub_group_members')
@Unique(['subGroupId', 'groupMemberId'])
export class SubGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subGroupId: string;

  @Column({ type: 'uuid' })
  groupMemberId: string;  // GroupMember의 ID (User ID가 아님)

  @Column({ type: 'enum', enum: SubGroupMemberRole, default: SubGroupMemberRole.MEMBER })
  role: SubGroupMemberRole;

  @ManyToOne(() => SubGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subGroupId' })
  subGroup: SubGroup;

  @ManyToOne(() => GroupMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupMemberId' })
  groupMember: GroupMember;

  @CreateDateColumn()
  joinedAt: Date;
}
