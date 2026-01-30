import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './User';
import { Group } from './Group';

// ============ 멤버 역할/상태 ============
// 역할은 owner/member 두 가지만 사용
// 세부 권한은 직책(Position)으로 관리
export enum MemberRole {
  OWNER = 'owner',           // 운영자 (모든 권한)
  MEMBER = 'member',         // 멤버 (직책에 따른 권한)
}

export enum MemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

// ============ 타입별 멤버 데이터 인터페이스 ============

// 1:1 수업 스케줄 (요일 + 시간 + 수업실)
export interface LessonSchedule {
  dayOfWeek: number;        // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
  startTime: string;        // "14:00"
  endTime: string;          // "15:00"
  lessonRoomId?: string;    // 배정된 수업실 ID
  lessonRoomName?: string;  // 수업실 이름 (캐싱)
}

// 보호자의 자녀 정보
export interface ChildInfo {
  name: string;
  birthYear?: number;
  gender?: 'male' | 'female' | 'other';
  note?: string;            // 알레르기, 특이사항 등
}

// 학원/교육 타입 - 학생 데이터
export interface EducationStudentData {
  lessonSchedule?: LessonSchedule[];  // 수업 스케줄 (복수 가능)
  paymentDueDay?: number;             // 수강료 납부일 (1-31)
  instructorId?: string;              // 담당 강사 ID
}

// 학원/교육 타입 - 보호자 데이터
export interface EducationGuardianData {
  children: ChildInfo[];              // 자녀 정보 (복수)
  linkedStudentIds?: string[];        // 연결된 학생 userId 목록
}

// 학원/교육 타입 - 강사 데이터
export interface EducationInstructorData {
  payDay?: number;                    // 급여일 (1-31)
}

// 교회/종교 타입 멤버 데이터
export interface ReligiousMemberData {
  baptismDate?: string;               // 세례일
  smallGroupId?: string;              // 소그룹(셀) ID
  serviceRoles?: string[];            // 봉사 역할
}

// 동호회/커뮤니티 타입 멤버 데이터
export interface CommunityMemberData {
  skills?: string[];                  // 기술/특기
  joinReason?: string;                // 가입 동기
}

// 회사/팀 타입 멤버 데이터
export interface CompanyMemberData {
  employeeId?: string;                // 사번
  department?: string;                // 부서
  jobTitle?: string;                  // 직책
}

// 연인/커플 타입 멤버 데이터
export interface CoupleMemberData {
  role: 'boyfriend' | 'girlfriend';
  birthday?: string;
}

// 멤버 데이터 유니온
export type MemberTypeData =
  | EducationStudentData
  | EducationGuardianData
  | EducationInstructorData
  | ReligiousMemberData
  | CommunityMemberData
  | CompanyMemberData
  | CoupleMemberData;

// ============ Entity ============
@Entity('group_members')
@Unique(['groupId', 'userId'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.PENDING })
  status: MemberStatus;

  // ============ 공통 필드 ============
  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  title: string;              // 직책/직분 (본인 설정)

  @Column({ type: 'uuid', nullable: true })
  positionId: string;         // 선택한 직책 ID (GroupPosition)

  @Column({ type: 'uuid', nullable: true })
  invitedBy: string;

  // ============ 타입별 데이터 (JSON) ============
  @Column({ type: 'json', nullable: true })
  typeData: MemberTypeData | null;

  // ============ 관계 ============
  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============ 헬퍼 메서드 ============

  // 학원/교육 학생 데이터 가져오기
  // title이 '보호자'가 아니면 학생 데이터로 취급
  getEducationStudentData(): EducationStudentData | null {
    if (this.title === '보호자') return null;
    return this.typeData as EducationStudentData;
  }

  // 학원/교육 보호자 데이터 가져오기
  // title이 '보호자'인 경우에만 보호자 데이터 반환
  getEducationGuardianData(): EducationGuardianData | null {
    if (this.title !== '보호자') return null;
    return this.typeData as EducationGuardianData;
  }

  // 학원/교육 강사 데이터 가져오기
  // title이 '강사'인 경우에만 강사 데이터 반환
  getEducationInstructorData(): EducationInstructorData | null {
    if (this.title !== '강사') return null;
    return this.typeData as EducationInstructorData;
  }

  // 편의 접근자 (하위 호환성)
  get lessonSchedule(): LessonSchedule[] | null {
    return (this.typeData as EducationStudentData)?.lessonSchedule ?? null;
  }

  get paymentDueDay(): number | null {
    // 강사는 payDay 사용, 학생은 paymentDueDay 사용
    if (this.title === '강사') {
      return (this.typeData as EducationInstructorData)?.payDay ?? null;
    }
    return (this.typeData as EducationStudentData)?.paymentDueDay ?? null;
  }

  get instructorId(): string | null {
    return (this.typeData as EducationStudentData)?.instructorId ?? null;
  }

  get childInfo(): ChildInfo[] | null {
    return (this.typeData as EducationGuardianData)?.children ?? null;
  }
}
