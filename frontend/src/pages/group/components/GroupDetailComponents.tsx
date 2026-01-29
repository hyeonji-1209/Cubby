import { useState } from 'react';
import { Modal } from '@/components';
import { getIconById } from '@/assets/icons';
import { GROUP_TYPE_LABELS, ROLE_OPTIONS } from '@/constants/labels';
import type { Group, GroupMember, User, LessonSchedule } from '@/types';
import type { LessonRoom } from '@/api/lessonRoom.api';
import type { TabType } from '../tabs';

// 요일 짧은 이름
const SHORT_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

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
  membersCount: number;
  subGroupsCount: number;
  activeLessonMember?: GroupMember | null;
}

export const GroupDetailTabs = ({
  currentGroup,
  activeTab,
  setActiveTab,
  isAdmin,
  membersCount,
  subGroupsCount,
  activeLessonMember,
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
        연습실
      </button>
    )}
    {currentGroup?.type === 'education' && !currentGroup?.hasClasses && (
      <button
        className={`group-detail__tab ${activeTab === 'lessonrooms' ? 'active' : ''}`}
        onClick={() => setActiveTab('lessonrooms')}
      >
        수업실 예약
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
  newRole: string;
  setNewRole: (role: string) => void;
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
}

export const MemberModal = ({
  isOpen,
  onClose,
  selectedMember,
  newRole,
  setNewRole,
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
}: MemberModalProps) => {
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState<LessonSchedule>({
    dayOfWeek: 1,
    startTime: '14:00',
    endTime: '15:00',
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
            <div>
              <p className="modal__member-name">{selectedMember.user?.name}</p>
              <p className="modal__member-email">{selectedMember.user?.email}</p>
            </div>
          </div>

          {/* 1:1 수업 정보 */}
          {showLessonInfo && (
            <div className="modal__lesson-info">
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
                <div className="modal__schedule-add-form">
                  <div className="modal__schedule-add-row">
                    <div className="modal__schedule-add-field">
                      <label>요일</label>
                      <select
                        className="modal__select modal__select--compact"
                        value={newSchedule.dayOfWeek}
                        onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: Number(e.target.value) })}
                      >
                        {SHORT_DAYS.map((day, i) => (
                          <option key={i} value={i}>{day}요일</option>
                        ))}
                      </select>
                    </div>
                    <div className="modal__schedule-add-field">
                      <label>시작</label>
                      <input
                        type="time"
                        className="modal__input modal__input--compact"
                        value={newSchedule.startTime}
                        onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                      />
                    </div>
                    <div className="modal__schedule-add-field">
                      <label>종료</label>
                      <input
                        type="time"
                        className="modal__input modal__input--compact"
                        value={newSchedule.endTime}
                        onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  {/* 수업실 선택 */}
                  {lessonRooms && lessonRooms.length > 0 && (
                    <div className="modal__schedule-add-row">
                      <div className="modal__schedule-add-field modal__schedule-add-field--full">
                        <label>수업실</label>
                        <select
                          className="modal__select modal__select--compact"
                          value={newSchedule.lessonRoomId || ''}
                          onChange={(e) => handleRoomChange(e.target.value)}
                        >
                          <option value="">수업실 선택 (선택사항)</option>
                          {lessonRooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name} (수용: {room.capacity}명)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="modal__schedule-add-actions">
                    <button
                      type="button"
                      className="modal__btn-cancel-sm"
                      onClick={() => setAddingSchedule(false)}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="modal__btn-confirm"
                      onClick={handleAddSchedule}
                    >
                      추가
                    </button>
                  </div>
                </div>
              )}

              {/* 수강료 납부일 - 달력 형태 */}
              <div className="modal__payment-section">
                <label className="modal__label">수강료 납부일 (매월)</label>
                <div className="modal__day-calendar">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      type="button"
                      className={`modal__day-btn ${paymentDueDay === day ? 'modal__day-btn--selected' : ''}`}
                      onClick={() => setPaymentDueDay?.(paymentDueDay === day ? null : day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {paymentDueDay && (
                  <p className="modal__payment-selected">선택: 매월 {paymentDueDay}일</p>
                )}
              </div>
            </div>
          )}

          {/* 1:1 수업 출석 통계 */}
          {showAttendanceStats && attendanceStats && (
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

          <div className="modal__field">
            <label className="modal__label">역할 변경</label>
            <select
              className="modal__select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
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
  onApprove: (data: {
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
  onApprove,
  loading = false,
}: MemberApprovalModalProps) => {
  const [instructorId, setInstructorId] = useState<string>('');
  const [lessonSchedule, setLessonSchedule] = useState<LessonSchedule[]>([]);
  const [paymentDueDay, setPaymentDueDay] = useState<number>(1);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState<LessonSchedule>({
    dayOfWeek: 1,
    startTime: '14:00',
    endTime: '15:00',
  });

  // 모달 열릴 때 초기화
  const handleClose = () => {
    setInstructorId('');
    setLessonSchedule([]);
    setPaymentDueDay(1);
    setAddingSchedule(false);
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

  // 승인 실행
  const handleApprove = () => {
    onApprove({
      instructorId: hasMultipleInstructors && instructorId ? instructorId : undefined,
      lessonSchedule: lessonSchedule.length > 0 ? lessonSchedule : undefined,
      paymentDueDay: paymentDueDay > 0 ? paymentDueDay : undefined,
    });
    handleClose();
  };

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="가입 승인"
      size="lg"
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
            {loading ? '승인 중...' : '승인'}
          </button>
        </>
      }
    >
      <div className="modal__approval">
        {/* 멤버 정보 */}
        <div className="modal__approval-member">
          <div className="modal__approval-avatar">
            {member.user?.profileImage ? (
              <img src={member.user.profileImage} alt={member.user.name} />
            ) : (
              member.user?.name?.charAt(0) || '?'
            )}
          </div>
          <div className="modal__approval-info">
            <span className="modal__approval-name">{member.user?.name}</span>
            <span className="modal__approval-email">{member.user?.email}</span>
          </div>
        </div>

        {/* 강사 선택 (다중 강사 모드) */}
        {hasMultipleInstructors && instructors.length > 0 && (
          <div className="modal__field">
            <label className="modal__label">담당 강사</label>
            <select
              className="modal__select"
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
            >
              <option value="">선택하세요</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.userId}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 수업 시간 설정 */}
        <div className="modal__field">
          <label className="modal__label">수업 시간</label>
          {lessonSchedule.length > 0 && (
            <div className="modal__schedule-list">
              {lessonSchedule.map((schedule, index) => (
                <div key={index} className="modal__schedule-item">
                  <span className="modal__schedule-day">
                    {SHORT_DAYS[schedule.dayOfWeek]}요일
                  </span>
                  <span className="modal__schedule-time">
                    {schedule.startTime} ~ {schedule.endTime}
                  </span>
                  {schedule.lessonRoomName && (
                    <span className="modal__schedule-room">
                      {schedule.lessonRoomName}
                    </span>
                  )}
                  <button
                    className="modal__schedule-remove"
                    onClick={() => handleRemoveSchedule(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {addingSchedule ? (
            <div className="modal__schedule-form">
              <select
                className="modal__select modal__select--small"
                value={newSchedule.dayOfWeek}
                onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: Number(e.target.value) })}
              >
                {SHORT_DAYS.map((day, i) => (
                  <option key={i} value={i}>{day}요일</option>
                ))}
              </select>
              <input
                type="time"
                className="modal__input modal__input--time"
                value={newSchedule.startTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
              />
              <span className="modal__schedule-separator">~</span>
              <input
                type="time"
                className="modal__input modal__input--time"
                value={newSchedule.endTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
              />
              {lessonRooms.length > 0 && (
                <select
                  className="modal__select modal__select--small"
                  value={newSchedule.lessonRoomId || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, lessonRoomId: e.target.value || undefined })}
                >
                  <option value="">수업실 선택</option>
                  {lessonRooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              )}
              <div className="modal__schedule-form-actions">
                <button className="modal__btn modal__btn--small" onClick={handleAddSchedule}>
                  추가
                </button>
                <button
                  className="modal__btn modal__btn--small modal__btn--secondary"
                  onClick={() => setAddingSchedule(false)}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              className="modal__btn modal__btn--outline"
              onClick={() => setAddingSchedule(true)}
            >
              + 수업 시간 추가
            </button>
          )}
          <span className="modal__hint">나중에 설정할 수 있습니다</span>
        </div>

        {/* 납부일 설정 */}
        <div className="modal__field">
          <label className="modal__label">납부일</label>
          <div className="modal__payment-day">
            <span>매월</span>
            <input
              type="number"
              className="modal__input modal__input--number"
              min={1}
              max={31}
              value={paymentDueDay}
              onChange={(e) => setPaymentDueDay(Number(e.target.value))}
            />
            <span>일</span>
          </div>
          <span className="modal__hint">나중에 설정할 수 있습니다</span>
        </div>
      </div>
    </Modal>
  );
};
