import { useState, useEffect } from 'react';
import { Modal, Dropdown } from '@/components';
import { getIconById } from '@/assets/icons';
import { GROUP_TYPE_LABELS } from '@/constants/labels';
import type { Group, GroupMember, User, LessonSchedule, MemberRole } from '@/types';
import type { LessonRoom } from '@/api/lessonRoom.api';
import type { TabType } from '../tabs';

// 요일 짧은 이름
const SHORT_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 시간에 1시간 추가하는 헬퍼 함수
const addOneHour = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const newHours = Math.min(hours + 1, 23); // 최대 23시
  return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// 그룹 헤더 컴포넌트
interface GroupDetailHeaderProps {
  currentGroup: Group;
  currentMember?: GroupMember;
  user: User | null;
  isOwner: boolean;
  onCopyInviteCode: () => void;
}

export const GroupDetailHeader = ({
  currentGroup,
  currentMember,
  user,
  isOwner,
  onCopyInviteCode,
}: GroupDetailHeaderProps) => (
  <div
    className="group-detail__header"
    style={currentGroup.color ? {
      background: `linear-gradient(145deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%), ${currentGroup.color}`
    } : undefined}
  >
    <div className="group-detail__info">
      {currentGroup.logoImage ? (
        <img src={currentGroup.logoImage} alt={currentGroup.name} className="group-detail__logo" />
      ) : currentGroup.icon && getIconById(currentGroup.icon) ? (
        <div className="group-detail__logo group-detail__logo--icon">
          <img src={getIconById(currentGroup.icon)} alt="" />
        </div>
      ) : (
        <div className="group-detail__logo group-detail__logo--default">
          {currentGroup.name.charAt(0)}
        </div>
      )}
      <div className="group-detail__text">
        <h1 className="group-detail__name">
          {currentGroup.name}
          {currentMember && (
            <span className="group-detail__member-info">
              {currentMember.nickname || user?.name}
              {currentMember.title && ` ${currentMember.title}`}님
            </span>
          )}
        </h1>
        <span className="group-detail__type">
          {GROUP_TYPE_LABELS[currentGroup.type] || currentGroup.type}
        </span>
        {currentGroup.description && (
          <p className="group-detail__desc">{currentGroup.description}</p>
        )}
      </div>
    </div>

    {isOwner && (
      <div className="group-detail__actions">
        <button className="group-detail__invite-btn" onClick={onCopyInviteCode}>
          초대 코드 복사
        </button>
      </div>
    )}
  </div>
);

// 탭 네비게이션 컴포넌트
interface GroupDetailTabsProps {
  currentGroup: Group;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isAdmin: boolean;
  isOwner: boolean;
  membersCount: number;
  subGroupsCount: number;
  activeLessonMember?: GroupMember | null;
  isInstructorWithStudents?: boolean; // 학생이 배정된 강사인지
}

export const GroupDetailTabs = ({
  currentGroup,
  activeTab,
  setActiveTab,
  isAdmin,
  isOwner,
  membersCount,
  subGroupsCount,
  activeLessonMember,
  isInstructorWithStudents,
}: GroupDetailTabsProps) => (
  <div className="group-detail__tabs">
    {/* 수업 중인 멤버가 있으면 수업 탭 표시 (홈 앞에) */}
    {activeLessonMember && (
      <button
        className={`group-detail__tab group-detail__tab--lesson ${activeTab === 'lesson' ? 'active' : ''}`}
        onClick={() => setActiveTab('lesson')}
      >
        {activeLessonMember.nickname || activeLessonMember.user?.name} 수업
      </button>
    )}
    <button
      className={`group-detail__tab ${activeTab === 'home' ? 'active' : ''}`}
      onClick={() => setActiveTab('home')}
    >
      홈
    </button>
    {isAdmin && (
      <button
        className={`group-detail__tab ${activeTab === 'members' ? 'active' : ''}`}
        onClick={() => setActiveTab('members')}
      >
        멤버 ({membersCount > 0 ? membersCount : currentGroup?.memberCount ?? 0})
      </button>
    )}
    {isAdmin && (currentGroup?.type !== 'education' || currentGroup?.hasClasses) && (
      <button
        className={`group-detail__tab ${activeTab === 'subgroups' ? 'active' : ''}`}
        onClick={() => setActiveTab('subgroups')}
      >
        {currentGroup?.type === 'education' && currentGroup?.hasClasses
          ? `반 관리 (${subGroupsCount > 0 ? subGroupsCount : currentGroup?.subGroupCount ?? 0})`
          : `소모임 (${subGroupsCount > 0 ? subGroupsCount : currentGroup?.subGroupCount ?? 0})`}
      </button>
    )}
    {currentGroup?.type === 'education' && currentGroup?.hasPracticeRooms && (
      <button
        className={`group-detail__tab ${activeTab === 'practicerooms' ? 'active' : ''}`}
        onClick={() => setActiveTab('practicerooms')}
      >
        클래스 예약
      </button>
    )}
    {/* 수업 관리 탭 - 1:1 교육 그룹에서 원장 또는 학생이 배정된 강사에게만 표시 */}
    {currentGroup?.type === 'education' && !currentGroup?.hasClasses && (isOwner || isInstructorWithStudents) && (
      <button
        className={`group-detail__tab ${activeTab === 'lesson-management' ? 'active' : ''}`}
        onClick={() => setActiveTab('lesson-management')}
      >
        수업 관리
      </button>
    )}
    <button
      className={`group-detail__tab ${activeTab === 'announcements' ? 'active' : ''}`}
      onClick={() => setActiveTab('announcements')}
    >
      공지사항
    </button>
    <button
      className={`group-detail__tab ${activeTab === 'schedules' ? 'active' : ''}`}
      onClick={() => setActiveTab('schedules')}
    >
      일정
    </button>
    <button
      className={`group-detail__tab ${activeTab === 'settings' ? 'active' : ''}`}
      onClick={() => setActiveTab('settings')}
    >
      설정
    </button>
  </div>
);

// 소모임 생성 모달
interface SubGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGroup: Group;
  isAdmin: boolean;
  subGroupName: string;
  setSubGroupName: (name: string) => void;
  subGroupDesc: string;
  setSubGroupDesc: (desc: string) => void;
  subGroupLoading: boolean;
  onSubmit: () => void;
}

export const SubGroupModal = ({
  isOpen,
  onClose,
  currentGroup,
  isAdmin,
  subGroupName,
  setSubGroupName,
  subGroupDesc,
  setSubGroupDesc,
  subGroupLoading,
  onSubmit,
}: SubGroupModalProps) => {
  const isClassMode = currentGroup?.type === 'education' && currentGroup?.hasClasses;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isClassMode ? '반 만들기' : '소모임 만들기'}
      description={
        isClassMode
          ? (isAdmin ? '새 반이 바로 생성됩니다.' : '관리자의 승인 후 반이 생성됩니다.')
          : (isAdmin ? '새 소모임이 바로 생성됩니다.' : '관리자의 승인 후 소모임이 생성됩니다.')
      }
      actions={
        <>
          <button className="modal__cancel" onClick={onClose}>
            취소
          </button>
          <button
            className="modal__submit"
            onClick={onSubmit}
            disabled={!subGroupName.trim() || subGroupLoading}
          >
            {subGroupLoading ? '처리 중...' : isAdmin ? '생성하기' : '요청 보내기'}
          </button>
        </>
      }
    >
      <div className="modal__field">
        <label className="modal__label">
          {isClassMode ? '반 이름' : '소모임 이름'} *
        </label>
        <input
          type="text"
          className="modal__input"
          placeholder={isClassMode
            ? '예: 초급반, 중급반, 피아노반'
            : '예: 청년부, 수학반, 개발팀'}
          value={subGroupName}
          onChange={(e) => setSubGroupName(e.target.value)}
          maxLength={100}
        />
      </div>
      <div className="modal__field">
        <label className="modal__label">설명 (선택)</label>
        <textarea
          className="modal__textarea"
          placeholder={isClassMode
            ? '반에 대한 간단한 설명 (수업 시간, 대상 등)'
            : '소모임에 대한 간단한 설명'}
          value={subGroupDesc}
          onChange={(e) => setSubGroupDesc(e.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
};

// 멤버 관리 모달
interface MemberAttendanceStats {
  stats: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    earlyLeave: number;
  };
}

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMember: GroupMember | null;
  roleLoading: boolean;
  onUpdateRole: () => void;
  onRemoveMember: () => void;
  // 1:1 수업용 추가 props
  showAttendanceStats?: boolean;
  attendanceStats?: MemberAttendanceStats | null;
  // 1:1 교육 그룹용 수업 정보
  showLessonInfo?: boolean;
  lessonSchedule?: LessonSchedule[];
  setLessonSchedule?: (schedule: LessonSchedule[]) => void;
  paymentDueDay?: number | null;
  setPaymentDueDay?: (day: number | null) => void;
  onSaveLessonInfo?: () => void;
  lessonInfoLoading?: boolean;
  // 수업실 목록 (1:1 수업 전용)
  lessonRooms?: LessonRoom[];
  // 운영시간 (스케줄 폼에서 사용)
  operatingHours?: { openTime: string; closeTime: string; closedDays?: number[] };
  // 강사용 추가 props
  instructorStudentCount?: number;
  onGoToSettings?: () => void;
  // 권한 관련
  isOwner?: boolean;
}

export const MemberModal = ({
  isOpen,
  onClose,
  selectedMember,
  roleLoading,
  onUpdateRole,
  onRemoveMember,
  showAttendanceStats,
  attendanceStats,
  showLessonInfo,
  lessonSchedule,
  setLessonSchedule,
  paymentDueDay,
  setPaymentDueDay,
  onSaveLessonInfo,
  lessonInfoLoading,
  lessonRooms,
  operatingHours,
  instructorStudentCount,
  onGoToSettings,
  isOwner = true,
}: MemberModalProps) => {
  // 강사 체크 (title이 '강사'인 경우)
  const isInstructor = selectedMember?.title === '강사';

  // 운영 가능한 요일 (휴일 제외)
  const availableDays = SHORT_DAYS.map((day, i) => ({ value: String(i), label: day }))
    .filter(option => !operatingHours?.closedDays?.includes(Number(option.value)));

  // 기본 시작시간 (운영시간 기준)
  const defaultStartTime = operatingHours?.openTime || '14:00';

  const [addingSchedule, setAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState<LessonSchedule>({
    dayOfWeek: availableDays[0] ? Number(availableDays[0].value) : 1,
    startTime: defaultStartTime,
    endTime: addOneHour(defaultStartTime),
    lessonRoomId: undefined,
    lessonRoomName: undefined,
  });

  // 수업 스케줄 추가 확정
  const handleAddSchedule = () => {
    if (setLessonSchedule) {
      setLessonSchedule([...(lessonSchedule || []), newSchedule]);
      setAddingSchedule(false);
      setNewSchedule({
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '15:00',
        lessonRoomId: undefined,
        lessonRoomName: undefined,
      });
    }
  };

  // 수업실 변경 핸들러
  const handleRoomChange = (roomId: string) => {
    const selectedRoom = lessonRooms?.find(r => r.id === roomId);
    setNewSchedule({
      ...newSchedule,
      lessonRoomId: roomId || undefined,
      lessonRoomName: selectedRoom?.name || undefined,
    });
  };

  // 수업 스케줄 삭제
  const handleRemoveSchedule = (index: number) => {
    if (setLessonSchedule && lessonSchedule) {
      setLessonSchedule(lessonSchedule.filter((_, i) => i !== index));
    }
  };

  // 시간 포맷
  const formatTime = (time: string) => time.replace(':', ':');

  return (
    <Modal
      isOpen={isOpen && !!selectedMember}
      onClose={onClose}
      title="멤버 관리"
      size="lg"
      actions={
        <>
          <button className="modal__submit modal__submit--danger" onClick={onRemoveMember}>
            내보내기
          </button>
          <button
            className="modal__submit"
            onClick={() => {
              onUpdateRole();
              if (showLessonInfo && onSaveLessonInfo) {
                onSaveLessonInfo();
              }
            }}
            disabled={roleLoading || lessonInfoLoading}
          >
            {roleLoading || lessonInfoLoading ? '저장 중...' : '저장'}
          </button>
        </>
      }
    >
      {selectedMember && (
        <>
          <div className="modal__member-info">
            <div className="modal__member-avatar">
              {selectedMember.user?.name?.charAt(0) || '?'}
            </div>
            <div className="modal__member-details">
              <p className="modal__member-name">{selectedMember.user?.name}</p>
              <p className="modal__member-email">{selectedMember.user?.email}</p>
            </div>
            {/* 직책(title)은 설정 탭에서 관리 */}
            {selectedMember.title && (
              <div className="modal__member-title">
                {selectedMember.title}
              </div>
            )}
          </div>

          {/* 1:1 수업 정보 */}
          {showLessonInfo && (
            <div className="modal__lesson-info">
              {/* 강사 전용 섹션 */}
              {isInstructor && (
                <>
                  <div className="modal__field">
                    <label className="modal__label">담당 학생</label>
                    <div className="modal__info-row">
                      <span className="modal__info-value">{instructorStudentCount ?? 0}명</span>
                      {onGoToSettings && (
                        <button type="button" className="modal__info-link" onClick={onGoToSettings}>
                          학생 배정 →
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="modal__field">
                    <label className="modal__label">급여일</label>
                    <div className="modal__salary-btns">
                      {[1, 10, 15, 25].map((day) => (
                        <button
                          key={day}
                          type="button"
                          className={`modal__salary-btn ${paymentDueDay === day ? 'active' : ''}`}
                          onClick={() => setPaymentDueDay?.(paymentDueDay === day ? null : day)}
                        >
                          {day}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`modal__salary-btn ${paymentDueDay === 31 ? 'active' : ''}`}
                        onClick={() => setPaymentDueDay?.(paymentDueDay === 31 ? null : 31)}
                      >
                        말일
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 수업 스케줄 - 학생만 표시 (강사는 제외) */}
              {!isInstructor && (
                <>
                  <div className="modal__lesson-header">
                    <label className="modal__label">수업 스케줄</label>
                  </div>

                  {/* 등록된 스케줄 표시 (컴팩트한 태그 형태) */}
                  <div className="modal__schedule-tags">
                {lessonSchedule && lessonSchedule.length > 0 ? (
                  lessonSchedule.map((schedule, index) => (
                    <div key={index} className="modal__schedule-tag">
                      <span className="modal__schedule-tag-day">{SHORT_DAYS[schedule.dayOfWeek]}</span>
                      <span className="modal__schedule-tag-time">
                        {formatTime(schedule.startTime)}-{formatTime(schedule.endTime)}
                      </span>
                      {schedule.lessonRoomName && (
                        <span className="modal__schedule-tag-room">{schedule.lessonRoomName}</span>
                      )}
                      <button
                        type="button"
                        className="modal__schedule-tag-remove"
                        onClick={() => handleRemoveSchedule(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="modal__empty-text">등록된 스케줄 없음</span>
                )}
                {!addingSchedule && (
                  <button
                    type="button"
                    className="modal__schedule-add-btn"
                    onClick={() => setAddingSchedule(true)}
                  >
                    + 추가
                  </button>
                )}
              </div>

              {/* 새 스케줄 추가 폼 */}
              {addingSchedule && (
                <div className="modal__approval-schedule-form">
                  <div className="modal__approval-schedule-form-row">
                    <Dropdown
                      className="modal__dropdown--sm"
                      value={String(newSchedule.dayOfWeek)}
                      onChange={(value) => setNewSchedule({ ...newSchedule, dayOfWeek: Number(value) })}
                      options={availableDays}
                    />
                    <input
                      type="time"
                      className="modal__approval-input-time"
                      value={newSchedule.startTime}
                      min={operatingHours?.openTime}
                      max={operatingHours?.closeTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setNewSchedule({
                          ...newSchedule,
                          startTime: newStartTime,
                          endTime: addOneHour(newStartTime),
                        });
                      }}
                    />
                    <span>~</span>
                    <input
                      type="time"
                      className="modal__approval-input-time"
                      value={newSchedule.endTime}
                      min={operatingHours?.openTime}
                      max={operatingHours?.closeTime}
                      onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                    />
                    {lessonRooms && lessonRooms.length > 0 && (
                      <Dropdown
                        className="modal__dropdown--sm"
                        value={newSchedule.lessonRoomId || ''}
                        onChange={handleRoomChange}
                        placeholder="수업실"
                        options={[
                          { value: '', label: '수업실' },
                          ...lessonRooms.map((room) => ({
                            value: room.id,
                            label: room.name,
                          })),
                        ]}
                      />
                    )}
                  </div>
                  <div className="modal__approval-schedule-form-actions">
                    <button className="modal__approval-btn-sm" onClick={handleAddSchedule}>추가</button>
                    <button className="modal__approval-btn-sm modal__approval-btn-sm--secondary" onClick={() => setAddingSchedule(false)}>취소</button>
                  </div>
                </div>
              )}
                </>
              )}

              {/* 학생: 납부일 (원장만 볼 수 있음) */}
              {!isInstructor && isOwner && (
                <div className="modal__field">
                  <label className="modal__label">수강료 납부일</label>
                  <div className="modal__salary-btns">
                    {[1, 10, 25].map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`modal__salary-btn ${paymentDueDay === day ? 'active' : ''}`}
                        onClick={() => setPaymentDueDay?.(paymentDueDay === day ? null : day)}
                      >
                        {day}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`modal__salary-btn ${paymentDueDay === 31 ? 'active' : ''}`}
                      onClick={() => setPaymentDueDay?.(paymentDueDay === 31 ? null : 31)}
                    >
                      말일
                    </button>
                    <input
                      type="number"
                      className="modal__salary-input"
                      min={1}
                      max={31}
                      placeholder="작성"
                      value={paymentDueDay && ![1, 10, 25, 31].includes(paymentDueDay) ? paymentDueDay : ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 1 && val <= 31) {
                          setPaymentDueDay?.(val);
                        } else if (!e.target.value) {
                          setPaymentDueDay?.(null);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1:1 수업 출석 통계 - 학생만 표시 (강사 제외) */}
          {showAttendanceStats && attendanceStats && !isInstructor && (
            <div className="modal__attendance-stats">
              <label className="modal__label">출석 현황</label>
              <div className="modal__stats-grid">
                <div className="modal__stat-item modal__stat-item--present">
                  <span className="modal__stat-value">{attendanceStats.stats.present}</span>
                  <span className="modal__stat-label">출석</span>
                </div>
                <div className="modal__stat-item modal__stat-item--late">
                  <span className="modal__stat-value">{attendanceStats.stats.late}</span>
                  <span className="modal__stat-label">지각</span>
                </div>
                <div className="modal__stat-item modal__stat-item--absent">
                  <span className="modal__stat-value">{attendanceStats.stats.absent}</span>
                  <span className="modal__stat-label">결석</span>
                </div>
                <div className="modal__stat-item modal__stat-item--excused">
                  <span className="modal__stat-value">{attendanceStats.stats.excused}</span>
                  <span className="modal__stat-label">사유</span>
                </div>
                <div className="modal__stat-item modal__stat-item--early-leave">
                  <span className="modal__stat-value">{attendanceStats.stats.earlyLeave}</span>
                  <span className="modal__stat-label">조퇴</span>
                </div>
              </div>
              <p className="modal__stats-total">총 {attendanceStats.stats.total}회 수업</p>
            </div>
          )}

        </>
      )}
    </Modal>
  );
};

// 모임 나가기/삭제 모달
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  onConfirm,
}: ConfirmModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    description={description}
    actions={
      <>
        <button className="modal__cancel" onClick={onClose}>
          취소
        </button>
        <button className="modal__submit modal__submit--danger" onClick={onConfirm}>
          {confirmText}
        </button>
      </>
    }
  />
);

// 멤버 승인 모달 (1:1 교육용)
interface MemberApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: GroupMember | null;
  instructors?: { id: string; userId: string; name: string }[];
  lessonRooms?: LessonRoom[];
  hasMultipleInstructors?: boolean;
  operatingHours?: { openTime: string; closeTime: string; closedDays?: number[] };
  onApprove: (data: {
    role?: MemberRole;
    instructorId?: string;
    lessonSchedule?: LessonSchedule[];
    paymentDueDay?: number;
  }) => void;
  loading?: boolean;
}

export const MemberApprovalModal = ({
  isOpen,
  onClose,
  member,
  instructors = [],
  lessonRooms = [],
  hasMultipleInstructors = false,
  operatingHours,
  onApprove,
  loading = false,
}: MemberApprovalModalProps) => {
  // 운영 가능한 요일 (휴일 제외)
  const availableDays = SHORT_DAYS.map((day, i) => ({ value: String(i), label: day }))
    .filter(option => !operatingHours?.closedDays?.includes(Number(option.value)));

  // 기본 시작시간 (운영시간 기준)
  const defaultStartTime = operatingHours?.openTime || '14:00';
  const defaultDayOfWeek = availableDays[0] ? Number(availableDays[0].value) : 1;

  const [selectedRole, setSelectedRole] = useState<MemberRole>('member');
  const [instructorId, setInstructorId] = useState<string>('');
  const [lessonSchedule, setLessonSchedule] = useState<LessonSchedule[]>([]);
  const [paymentDueDay, setPaymentDueDay] = useState<number>(0);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState<LessonSchedule>({
    dayOfWeek: defaultDayOfWeek,
    startTime: defaultStartTime,
    endTime: addOneHour(defaultStartTime),
  });

  // 모달이 열리거나 member가 변경되면 상태 초기화
  useEffect(() => {
    if (isOpen && member) {
      setSelectedRole(member.role as MemberRole || 'member');
      setInstructorId('');
      setLessonSchedule([]);
      setPaymentDueDay(0);
      setAddingSchedule(false);
      setNewSchedule({
        dayOfWeek: defaultDayOfWeek,
        startTime: defaultStartTime,
        endTime: addOneHour(defaultStartTime),
      });
    }
  }, [isOpen, member, defaultDayOfWeek, defaultStartTime]);

  // 모달 닫기
  const handleClose = () => {
    onClose();
  };

  // 수업 스케줄 추가
  const handleAddSchedule = () => {
    const selectedRoom = lessonRooms.find(r => r.id === newSchedule.lessonRoomId);
    setLessonSchedule([
      ...lessonSchedule,
      {
        ...newSchedule,
        lessonRoomName: selectedRoom?.name,
      },
    ]);
    setAddingSchedule(false);
    setNewSchedule({
      dayOfWeek: 1,
      startTime: '14:00',
      endTime: '15:00',
    });
  };

  // 수업 스케줄 삭제
  const handleRemoveSchedule = (index: number) => {
    setLessonSchedule(lessonSchedule.filter((_, i) => i !== index));
  };

  // 승인 실행 (handleApprovalSubmit에서 모달 닫기 처리하므로 여기서는 handleClose 호출 안함)
  const handleApprove = () => {
    onApprove({
      role: selectedRole,
      instructorId: hasMultipleInstructors && instructorId ? instructorId : undefined,
      lessonSchedule: lessonSchedule.length > 0 ? lessonSchedule : undefined,
      paymentDueDay: paymentDueDay > 0 ? paymentDueDay : undefined,
    });
  };

  if (!member) return null;

  // 원래 가입 신청 시 선택한 유형 (title로 확인)
  const getTitleLabel = () => {
    if (member.title === '강사') return '강사';
    if (member.title === '보호자') return '보호자';
    return '학생';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="가입 승인"
      size="md"
      actions={
        <>
          <button className="modal__cancel" onClick={handleClose} disabled={loading}>
            취소
          </button>
          <button
            className="modal__submit"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? '승인 중...' : '승인하기'}
          </button>
        </>
      }
    >
      <div className="modal__approval-compact">
        {/* 멤버 카드 */}
        <div className="modal__approval-card">
          <div className="modal__approval-card-avatar">
            {member.user?.profileImage ? (
              <img src={member.user.profileImage} alt={member.user.name} />
            ) : (
              member.user?.name?.charAt(0) || '?'
            )}
          </div>
          <div className="modal__approval-card-info">
            <span className="modal__approval-card-name">{member.user?.name}</span>
            <span className="modal__approval-card-meta">
              {member.user?.email}
              <span className="modal__approval-card-role">{getTitleLabel()}</span>
            </span>
          </div>
        </div>

        {/* 새로운 시스템: 모든 멤버는 'member' 역할로 승인, 세부 구분은 title로 */}

        {/* 설정 영역 - 학생만 */}
        {selectedRole === 'member' && (
          <div className="modal__approval-settings">
            {/* 담당 강사 선택 */}
            {hasMultipleInstructors && instructors.length > 0 && (
              <div className="modal__approval-row">
                <label className="modal__approval-row-label">담당 강사</label>
                <Dropdown
                  className="modal__approval-dropdown"
                  value={instructorId}
                  onChange={setInstructorId}
                  placeholder="선택 안함"
                  options={[
                    { value: '', label: '선택 안함' },
                    ...instructors.map((inst) => ({
                      value: inst.userId,
                      label: inst.name,
                    })),
                  ]}
                />
              </div>
            )}

            {/* 수업 시간 */}
            <div className="modal__approval-row">
              <label className="modal__approval-row-label">수업 시간</label>
              <div className="modal__approval-schedule">
                {lessonSchedule.length > 0 ? (
                  <div className="modal__approval-schedule-tags">
                    {lessonSchedule.map((schedule, index) => (
                      <span key={index} className="modal__approval-schedule-tag">
                        {SHORT_DAYS[schedule.dayOfWeek]} {schedule.startTime.slice(0, 5)}-{schedule.endTime.slice(0, 5)}
                        {schedule.lessonRoomName && ` (${schedule.lessonRoomName})`}
                        <button
                          className="modal__approval-schedule-tag-remove"
                          onClick={() => handleRemoveSchedule(index)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                {addingSchedule ? (
                  <div className="modal__approval-schedule-form">
                    <div className="modal__approval-schedule-form-row">
                      <Dropdown
                        className="modal__dropdown--sm"
                        value={String(newSchedule.dayOfWeek)}
                        onChange={(value) => setNewSchedule({ ...newSchedule, dayOfWeek: Number(value) })}
                        options={availableDays}
                      />
                      <input
                        type="time"
                        className="modal__approval-input-time"
                        value={newSchedule.startTime}
                        min={operatingHours?.openTime}
                        max={operatingHours?.closeTime}
                        onChange={(e) => {
                          const newStartTime = e.target.value;
                          setNewSchedule({
                            ...newSchedule,
                            startTime: newStartTime,
                            endTime: addOneHour(newStartTime),
                          });
                        }}
                      />
                      <span>~</span>
                      <input
                        type="time"
                        className="modal__approval-input-time"
                        value={newSchedule.endTime}
                        min={operatingHours?.openTime}
                        max={operatingHours?.closeTime}
                        onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                      />
                      {lessonRooms.length > 0 && (
                        <Dropdown
                          className="modal__dropdown--sm"
                          value={newSchedule.lessonRoomId || ''}
                          onChange={(value) => setNewSchedule({ ...newSchedule, lessonRoomId: value || undefined })}
                          placeholder="수업실"
                          options={[
                            { value: '', label: '수업실' },
                            ...lessonRooms.map((room) => ({ value: room.id, label: room.name })),
                          ]}
                        />
                      )}
                    </div>
                    <div className="modal__approval-schedule-form-actions">
                      <button className="modal__approval-btn-sm" onClick={handleAddSchedule}>추가</button>
                      <button className="modal__approval-btn-sm modal__approval-btn-sm--secondary" onClick={() => setAddingSchedule(false)}>취소</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="modal__approval-add-btn"
                    onClick={() => setAddingSchedule(true)}
                  >
                    + 추가
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 납부일/급여일 - title에 따라 레이블 변경 */}
        <div className="modal__approval-row modal__approval-row--payment">
          <label className="modal__approval-row-label">{member.title === '강사' ? '급여일' : '납부일'}</label>
          <div className="modal__approval-day-picker">
            {[1, 10, 25].map((day) => (
              <button
                key={day}
                type="button"
                className={`modal__approval-day-btn ${paymentDueDay === day ? 'active' : ''}`}
                onClick={() => setPaymentDueDay(paymentDueDay === day ? 0 : day)}
              >
                {day}일
              </button>
            ))}
            <button
              type="button"
              className={`modal__approval-day-btn ${paymentDueDay === 31 ? 'active' : ''}`}
              onClick={() => setPaymentDueDay(paymentDueDay === 31 ? 0 : 31)}
            >
              말일
            </button>
            <div className="modal__approval-day-custom">
              <input
                type="number"
                className="modal__approval-day-input"
                min={1}
                max={31}
                value={paymentDueDay && ![1, 10, 25, 31].includes(paymentDueDay) ? paymentDueDay : ''}
                onChange={(e) => setPaymentDueDay(Number(e.target.value))}
                placeholder="작성"
              />
            </div>
          </div>
        </div>

        <p className="modal__approval-hint">* 설정은 나중에 변경할 수 있습니다</p>
      </div>
    </Modal>
  );
};
