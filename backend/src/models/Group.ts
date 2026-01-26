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
import { User } from './User';
import { GroupMember } from './GroupMember';
import { SubGroup } from './SubGroup';
import { Announcement } from './Announcement';
import { Schedule } from './Schedule';

export enum GroupType {
  EDUCATION = 'education',     // 학원/교육
  RELIGIOUS = 'religious',     // 교회/종교
  COMMUNITY = 'community',     // 동호회/커뮤니티
  COMPANY = 'company',         // 회사/팀
  COUPLE = 'couple',           // 연인/커플
}

export enum GroupStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: GroupType })
  type: GroupType;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoImage: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImage: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  inviteCode: string;

  @Column({ type: 'timestamp', nullable: true })
  inviteCodeExpiresAt: Date;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  enabledFeatures: string[];

  @Column({ type: 'enum', enum: GroupStatus, default: GroupStatus.ACTIVE })
  status: GroupStatus;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, (user) => user.ownedGroups)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @OneToMany(() => SubGroup, (subGroup) => subGroup.parentGroup)
  subGroups: SubGroup[];

  @OneToMany(() => Announcement, (announcement) => announcement.group)
  announcements: Announcement[];

  @OneToMany(() => Schedule, (schedule) => schedule.group)
  schedules: Schedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
