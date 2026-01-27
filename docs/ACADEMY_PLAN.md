# 학원 타입 (Academy) 기능 계획

## 0. 학원 생성 시 설정 (핵심)

### 0.1 생성 플로우
```
학원 모임 생성
    ↓
기본 정보 입력 (이름, 설명, 로고 등)
    ↓
┌─────────────────────────────────────┐
│ 학원 운영 방식 설정                  │
├─────────────────────────────────────┤
│ □ 반(클래스) 운영                    │
│   → 그룹 수업이 있는 경우 체크       │
│   → 소모임 = 반으로 사용             │
│                                     │
│ □ 연습실 운영                        │
│   → 연습실이 있는 경우 체크          │
│   → 연습실 탭 활성화                 │
│                                     │
│ □ 보호자 허용                        │
│   → 학부모가 가입할 수 있게          │
│   → 만 14세 이하 수강생 대상         │
└─────────────────────────────────────┘
    ↓
생성 완료
```

### 0.2 Group 모델 확장
```typescript
// Group 테이블에 추가
@Column({ type: 'boolean', default: false })
hasClasses: boolean;  // 반 운영 여부

@Column({ type: 'boolean', default: false })
hasPracticeRooms: boolean;  // 연습실 운영 여부

@Column({ type: 'boolean', default: false })
allowGuardians: boolean;  // 보호자 허용 여부

@Column({ type: 'jsonb', nullable: true })
practiceRoomSettings: {
  openTime: string;      // "09:00"
  closeTime: string;     // "22:00"
  slotMinutes: number;   // 30 or 60
  maxHoursPerDay: number; // 2
};
```

### 0.3 설정에 따른 UI 변화
| 설정 | OFF | ON |
|------|-----|-----|
| 반 운영 | 소모임 탭 숨김 | 소모임 → "반 관리" 탭 |
| 연습실 | 연습실 탭 숨김 | "연습실" 탭 표시 |
| 보호자 | 수강생만 가입 | 보호자/수강생 선택 가입 |

---

## 1. 연습실 관리 시스템

### 1.1 설정 (Settings)
```
그룹 설정 > 연습실 관리
├── 연습실 사용 여부 (ON/OFF)
├── 연습실 목록
│   ├── 연습실 1 (이름 수정 가능)
│   ├── 연습실 2
│   └── + 연습실 추가
└── 예약 설정
    ├── 예약 가능 시간 (예: 09:00 ~ 22:00)
    ├── 예약 단위 (30분/1시간)
    └── 최대 예약 시간 (예: 2시간)
```

### 1.2 DB 모델
```typescript
// PracticeRoom - 연습실
- id, groupId, name, sortOrder, isActive

// PracticeRoomReservation - 연습실 예약
- id, roomId, userId, date, startTime, endTime, status(confirmed/cancelled)
```

### 1.3 UI/권한
| 역할 | 볼 수 있는 것 | 할 수 있는 것 |
|------|-------------|-------------|
| Owner/Admin | 모든 예약 현황 (누가, 언제, 어디) | 예약 관리, 강제 취소 |
| 강사(Leader) | 모든 예약 현황 | 본인 예약만 관리 |
| 수강생(Member) | 본인 예약 + 빈 시간 | 본인 예약 생성/취소 |

### 1.4 화면 구성
- **탭**: 연습실 (연습실 ON일 때만 표시)
- **캘린더 뷰**: 날짜별 예약 현황
- **타임테이블 뷰**: 시간대별 예약 현황 (연습실별)
- **내 예약 목록**: 본인 예약만 필터링

---

## 2. 학원 구조 (설정 기반)

### 반 운영 ON (hasClasses: true)
```
학원 (Group)
├── [반 관리] 탭
│   ├── 초급반 (SubGroup)
│   │   ├── 수업 시간: 월/수 14:00
│   │   ├── 반 공지사항
│   │   └── 수강생들
│   └── 중급반 (SubGroup)
│       └── ...
├── [회원] 탭 - 전체 회원
├── [공지사항] 탭 - 학원 전체
└── [연습실] 탭 (hasPracticeRooms: true일 때)
```

### 반 운영 OFF (hasClasses: false)
```
학원 (Group)
├── [회원] 탭
│   ├── 김OO - 개인레슨
│   ├── 이OO - 개인레슨
│   └── 회원별 일정/진도 관리
├── [공지사항] 탭
├── [일정] 탭
└── [연습실] 탭 (hasPracticeRooms: true일 때)
```

---

## 3. 보호자 시스템

### 3.1 가입 플로우
```
초대 코드 입력
    ↓
학원이 보호자 허용(allowGuardians=true)인 경우만:
    ↓
┌─────────────────────────────────────┐
│ 어떤 자격으로 가입하시나요?          │
│                                     │
│  [👤 수강생으로 가입]                │
│  직접 수업을 받는 학생입니다         │
│                                     │
│  [👨‍👩‍👧 보호자로 가입]                 │
│  자녀의 학습을 관리합니다            │
└─────────────────────────────────────┘
    ↓
[보호자 선택 시]
    ↓
┌─────────────────────────────────────┐
│ 자녀 정보 입력                       │
│                                     │
│ 자녀 이름: [          ]             │
│ 자녀 생년월일: [    년  월  일]     │
│ 관계: [어머니 ▼]                    │
│                                     │
│ ⚠️ 만 14세 이하 자녀만 등록 가능     │
│                                     │
│ ※ 기존 수강생 계정이 있으면 연결됩니다│
└─────────────────────────────────────┘
    ↓
학원 관리자 승인 대기
    ↓
승인 완료 시 보호자로 가입
```

### 3.1.1 자녀 추가 (기존 보호자)
```
설정 > 자녀 관리
    ↓
[+ 자녀 추가]
    ↓
같은 플로우로 자녀 추가
(같은 학원 또는 다른 학원)
```

### 3.2 보호자 인증 방안 (검토 필요)
1. **휴대폰 인증**: 부모 명의 휴대폰으로 인증 (비용 발생)
2. **자녀 확인**: 자녀가 앱에서 보호자 요청 승인
3. **학원 확인**: 학원 관리자가 보호자 관계 승인
4. **간편 방식**: 자녀 정보 입력만으로 연결 (보안 약함)

**추천**: 3번 (학원 확인) - 학원에서 실제 관계를 알고 있으므로

### 3.3 DB 모델
```typescript
// GuardianStudent - 보호자-자녀 관계 (다대다)
@Entity('guardian_students')
export class GuardianStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  guardianUserId: string;  // 보호자 User ID

  @Column({ type: 'uuid' })
  studentUserId: string;   // 자녀 User ID (또는 studentMemberId)

  @Column({ type: 'uuid' })
  groupId: string;         // 학원 ID

  @Column({ type: 'varchar', length: 20 })
  relationship: 'mother' | 'father' | 'guardian' | 'other';

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;      // 승인한 관리자 ID

  @CreateDateColumn()
  createdAt: Date;
}
```

### 3.4 다자녀 구조
```
보호자 A (User)
├── 자녀 1 (GuardianStudent) - 학원 X
├── 자녀 2 (GuardianStudent) - 학원 X
└── 자녀 3 (GuardianStudent) - 학원 Y (다른 학원도 가능)

보호자 B (User)
└── 자녀 1 (GuardianStudent) - 학원 X
    ↑ 같은 자녀에 보호자 2명 가능 (부모 둘 다)
```

### 3.5 보호자 홈 화면
```
┌─────────────────────────────────────┐
│ 자녀 선택: [김민수 ▼]               │
│            ├ 김민수 (피아노학원)     │
│            └ 김영희 (피아노학원)     │
├─────────────────────────────────────┤
│ 김민수의 일정                        │
│ • 1/28 (화) 14:00 피아노 레슨       │
│ • 1/29 (수) 16:00 연습실 A          │
├─────────────────────────────────────┤
│ 이번 주 과제                         │
│ • 하농 1~5번 복습                    │
├─────────────────────────────────────┤
│ 최근 공지사항                        │
│ • 설 연휴 휴원 안내                  │
└─────────────────────────────────────┘
```

### 3.6 보호자 기능
- 자녀 선택 (여러 자녀 시 드롭다운)
- 자녀 일정 확인 (읽기 전용)
- 자녀 과제/진도 확인
- 공지사항 확인
- 알림 수신 (수업 알림, 과제 알림 등)

---

## 4. 과제/진도 관리

### 4.1 DB 모델
```typescript
// StudentProgress - 수강생 진도
- id, groupId, studentId, instructorId
- week (2024-W05 형식)
- assignment: string (이번 주 과제)
- progress: string (진행 사항)
- feedback: string (피드백)
- createdAt, updatedAt

// 또는 더 상세하게
// Assignment - 과제
- id, groupId, studentId
- title, description, dueDate
- status (pending/submitted/reviewed)
- submittedAt, reviewedAt

// AssignmentSubmission - 과제 제출
- id, assignmentId
- content, attachments
- feedback, score
```

### 4.2 UI 구성
**강사 화면**:
- 회원 목록 > 회원 선택 > 진도/과제 관리
- 일괄 과제 등록 (반 전체)

**수강생 화면**:
- 내 과제 목록
- 이번 주 할 일
- 진도 현황

**보호자 화면**:
- 자녀의 과제/진도 읽기 전용

---

## 5. 홈 화면 개인화

### 수강생 홈
```
┌─────────────────────────┐
│ 오늘의 일정             │
│ • 14:00 피아노 레슨     │
│ • 16:00 연습실 A 예약   │
├─────────────────────────┤
│ 이번 주 과제            │
│ • 하농 1~5번 연습       │
│ • 체르니 30번 1곡       │
├─────────────────────────┤
│ 캘린더 (내 일정만)      │
│ [====== 달력 ======]    │
└─────────────────────────┘
```

---

## 6. 구현 우선순위

### Phase 1: 연습실 관리 (기본)
- [ ] PracticeRoom 모델
- [ ] PracticeRoomReservation 모델
- [ ] 연습실 설정 UI
- [ ] 연습실 예약 캘린더
- [ ] 예약 CRUD API

### Phase 2: 회원 관리 강화
- [ ] 회원별 상세 페이지
- [ ] 개인 일정 관리
- [ ] 진도/과제 기본 기능

### Phase 3: 보호자 시스템
- [ ] Guardian 모델
- [ ] 보호자 가입 플로우
- [ ] 보호자-자녀 연결
- [ ] 보호자 전용 뷰

### Phase 4: 과제/진도 고도화
- [ ] 상세 과제 관리
- [ ] 제출/피드백 기능
- [ ] 알림 시스템

---

## 7. 결정된 사항 ✅

1. **학원 구조**: 생성 시 설정으로 선택 (반 운영 ON/OFF)
2. **보호자 인증**: 학원 관리자 승인 방식
3. **다자녀**: 한 보호자가 여러 자녀 연결 가능 (GuardianStudent 테이블)
4. **연습실**: 생성 시 설정으로 ON/OFF

---

## 7.1 담당강사 질문/문의 기능

### 구조
```
수강생/보호자
    ↓
[담당강사에게 질문하기]
    ↓
┌─────────────────────────────────────┐
│ 질문 작성                            │
│                                     │
│ 받는 강사: 김선생님 (자동 설정)       │
│                                     │
│ 제목: [                           ] │
│ 내용: [                           ] │
│       [                           ] │
│                                     │
│ [첨부파일]              [보내기]    │
└─────────────────────────────────────┘
```

### DB 모델
```typescript
// InstructorQuestion - 강사 질문
@Entity('instructor_questions')
export class InstructorQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  studentId: string;       // 수강생 (질문자 또는 질문 대상 자녀)

  @Column({ type: 'uuid' })
  askerId: string;         // 실제 질문 작성자 (수강생 또는 보호자)

  @Column({ type: 'uuid' })
  instructorId: string;    // 담당 강사

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  answer: string;          // 강사 답변

  @Column({ type: 'timestamp', nullable: true })
  answeredAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'answered' | 'closed';

  @CreateDateColumn()
  createdAt: Date;
}
```

### 화면
**수강생/보호자 뷰:**
```
내 문의 내역
├── [답변 대기] 연습 방법 문의 (1/27)
├── [답변 완료] 다음 수업 시간 변경 (1/25)
└── [+ 새 질문하기]
```

**강사 뷰:**
```
받은 질문 (3)
├── 🔴 김민수 - 연습 방법 문의 (new)
├── 🔴 이영희 (보호자) - 수업료 문의 (new)
└── ✅ 박철수 - 교재 문의 (답변완료)
```

---

## 8. 추가 검토 필요

- [ ] 출석 체크 기능 필요한지?
- [ ] 수강료/결제 관리 필요한지?
- [ ] 수강생끼리 소통 기능 필요한지?
- [ ] 푸시 알림 구현할지?

---

## 9. 최종 구현 순서

### Phase 1: 학원 설정 기반 구조
- [ ] Group 모델 확장 (hasClasses, hasPracticeRooms, allowGuardians)
- [ ] 학원 생성 시 설정 UI
- [ ] 설정에 따른 탭 표시/숨김

### Phase 2: 연습실 시스템
- [ ] PracticeRoom 모델
- [ ] PracticeRoomReservation 모델
- [ ] 연습실 설정 UI
- [ ] 예약 캘린더/타임테이블

### Phase 3: 보호자 시스템
- [ ] GuardianStudent 모델
- [ ] 가입 시 수강생/보호자 선택
- [ ] 자녀 연결 플로우
- [ ] 관리자 승인 UI
- [ ] 보호자 전용 홈 (자녀 선택)

### Phase 4: 회원/진도 관리
- [ ] 회원 상세 페이지
- [ ] 진도/과제 기능
- [ ] 보호자 뷰 연동
