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

  @Column({ type: 'longtext', nullable: true })
  logoImage: string;

  @Column({ type: 'longtext', nullable: true })
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

  // 학원 타입 전용 설정
  @Column({ type: 'boolean', default: false })
  hasClasses: boolean; // 반 운영 여부

  @Column({ type: 'boolean', default: false })
  hasPracticeRooms: boolean; // 연습실 운영 여부

  @Column({ type: 'boolean', default: false })
  allowGuardians: boolean; // 보호자 허용 여부

  @Column({ type: 'json', nullable: true })
  practiceRoomSettings: {
    openTime: string; // "09:00"
    closeTime: string; // "22:00"
    slotMinutes: number; // 30 or 60
    maxHoursPerDay: number; // 2
  } | null;

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
