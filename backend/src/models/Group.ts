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

// ============ 그룹 타입 ============
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

// ============ 타입별 설정 인터페이스 ============

// 학원/교육 타입 설정
export interface EducationSettings {
  // 수업 방식
  hasClasses: boolean;              // 반 운영 여부 (false = 1:1 수업)
  hasMultipleInstructors: boolean;  // 다중 강사 운영 여부

  // 기능 활성화
  hasAttendance: boolean;           // 출석 기능
  hasPracticeRooms: boolean;        // 연습실 운영
  allowGuardians: boolean;          // 보호자 가입 허용

  // 승인/변경 정책
  requiresApproval: boolean;        // 가입 승인 필요 (1:1 수업 기본 true)
  allowSameDayChange: boolean;      // 당일 일정 변경 허용

  // 운영 시간
  operatingHours?: {
    openTime: string;               // "09:00"
    closeTime: string;              // "22:00"
    closedDays?: number[];          // 휴무일 (0=일, 6=토)
  };

  // 연습실 설정
  practiceRoomSettings?: {
    openTime: string;
    closeTime: string;
    slotMinutes: number;            // 30 or 60
    maxHoursPerDay: number;
  };
}

// 교회/종교 타입 설정
export interface ReligiousSettings {
  denomination?: string;            // 교단/종파
  hasSmallGroups: boolean;          // 소그룹(셀) 운영
  worshipTimes?: {
    dayOfWeek: number;
    time: string;
    name: string;                   // "주일예배", "수요예배" 등
  }[];
}

// 동호회/커뮤니티 타입 설정
export interface CommunitySettings {
  category?: string;                // 카테고리 (운동, 취미 등)
  isPublic: boolean;                // 공개 여부
  maxMembers?: number;              // 최대 인원
  hasSchedule: boolean;             // 정기 일정 사용
  hasDues: boolean;                 // 회비 관리
}

// 회사/팀 타입 설정
export interface CompanySettings {
  department?: string;              // 부서명
  hasProjects: boolean;             // 프로젝트 관리
  hasAttendance: boolean;           // 출퇴근 관리
  workingHours?: {
    startTime: string;
    endTime: string;
  };
}

// 연인/커플 타입 설정
export interface CoupleSettings {
  anniversaryDate?: string;         // 사귄 날짜 (YYYY-MM-DD)
  partnerBirthday?: string;         // 상대방 생일
  myBirthday?: string;              // 내 생일
  myRole?: 'boyfriend' | 'girlfriend';
}

// 타입별 설정 유니온
export type GroupTypeSettings =
  | { type: 'education'; data: EducationSettings }
  | { type: 'religious'; data: ReligiousSettings }
  | { type: 'community'; data: CommunitySettings }
  | { type: 'company'; data: CompanySettings }
  | { type: 'couple'; data: CoupleSettings };

// ============ 기본 설정 팩토리 ============
export const DEFAULT_TYPE_SETTINGS: Record<GroupType, Partial<GroupTypeSettings['data']>> = {
  [GroupType.EDUCATION]: {
    hasClasses: false,
    hasMultipleInstructors: false,
    hasAttendance: false,
    hasPracticeRooms: false,
    allowGuardians: false,
    requiresApproval: true,  // 1:1 기본값
    allowSameDayChange: false,
  } as EducationSettings,
  [GroupType.RELIGIOUS]: {
    hasSmallGroups: false,
  } as ReligiousSettings,
  [GroupType.COMMUNITY]: {
    isPublic: false,
    hasSchedule: true,
    hasDues: false,
  } as CommunitySettings,
  [GroupType.COMPANY]: {
    hasProjects: false,
    hasAttendance: false,
  } as CompanySettings,
  [GroupType.COUPLE]: {} as CoupleSettings,
};

// ============ Entity ============
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

  @Column({ type: 'enum', enum: GroupStatus, default: GroupStatus.ACTIVE })
  status: GroupStatus;

  // ============ 타입별 설정 (JSON) ============
  @Column({ type: 'json', nullable: true })
  typeSettings: EducationSettings | ReligiousSettings | CommunitySettings | CompanySettings | CoupleSettings | null;

  // ============ 공통 설정 ============
  @Column({ type: 'json', nullable: true })
  settings: Record<string, unknown>;  // 기타 커스텀 설정

  @Column({ type: 'json', nullable: true })
  enabledFeatures: string[];          // 활성화된 기능 목록

  // ============ 관계 ============
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

  // ============ 헬퍼 메서드 ============

  // 타입별 설정 가져오기 (타입 안전)
  getEducationSettings(): EducationSettings | null {
    if (this.type !== GroupType.EDUCATION) return null;
    return this.typeSettings as EducationSettings;
  }

  getReligiousSettings(): ReligiousSettings | null {
    if (this.type !== GroupType.RELIGIOUS) return null;
    return this.typeSettings as ReligiousSettings;
  }

  getCommunitySettings(): CommunitySettings | null {
    if (this.type !== GroupType.COMMUNITY) return null;
    return this.typeSettings as CommunitySettings;
  }

  getCompanySettings(): CompanySettings | null {
    if (this.type !== GroupType.COMPANY) return null;
    return this.typeSettings as CompanySettings;
  }

  getCoupleSettings(): CoupleSettings | null {
    if (this.type !== GroupType.COUPLE) return null;
    return this.typeSettings as CoupleSettings;
  }

  // 교육 타입 편의 접근자 (하위 호환성)
  get hasClasses(): boolean {
    return (this.typeSettings as EducationSettings)?.hasClasses ?? false;
  }

  get hasPracticeRooms(): boolean {
    return (this.typeSettings as EducationSettings)?.hasPracticeRooms ?? false;
  }

  get allowGuardians(): boolean {
    return (this.typeSettings as EducationSettings)?.allowGuardians ?? false;
  }

  get hasAttendance(): boolean {
    return (this.typeSettings as EducationSettings)?.hasAttendance ?? false;
  }

  get hasMultipleInstructors(): boolean {
    return (this.typeSettings as EducationSettings)?.hasMultipleInstructors ?? false;
  }

  get requiresApproval(): boolean {
    return (this.typeSettings as EducationSettings)?.requiresApproval ?? false;
  }

  get allowSameDayChange(): boolean {
    return (this.typeSettings as EducationSettings)?.allowSameDayChange ?? false;
  }

  get operatingHours(): EducationSettings['operatingHours'] | null {
    return (this.typeSettings as EducationSettings)?.operatingHours ?? null;
  }

  get practiceRoomSettings(): EducationSettings['practiceRoomSettings'] | null {
    return (this.typeSettings as EducationSettings)?.practiceRoomSettings ?? null;
  }

  // JSON 직렬화 시 getter 값 포함
  toJSON() {
    return {
      ...this,
      // 교육 타입 편의 속성들 (getter 값을 명시적으로 포함)
      hasClasses: this.hasClasses,
      hasPracticeRooms: this.hasPracticeRooms,
      allowGuardians: this.allowGuardians,
      hasAttendance: this.hasAttendance,
      hasMultipleInstructors: this.hasMultipleInstructors,
      requiresApproval: this.requiresApproval,
      allowSameDayChange: this.allowSameDayChange,
      operatingHours: this.operatingHours,
      practiceRoomSettings: this.practiceRoomSettings,
    };
  }
}
