import { useState, useEffect } from 'react';
import { Modal } from '@/components';
import { attendanceApi, ScheduleMembersResponse } from '@/api/attendance.api';
import type { AttendanceMember, AttendanceStatus, AbsenceType } from '@/types';
import './ScheduleAttendanceModal.scss';

// 결석 타입 라벨
const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  personal: '개인 사유',
  sick: '병결',
  family: '가정 사정',
  travel: '여행/출장',
  exam: '시험',
  other: '기타',
};

// 출석 상태 색상
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
  excused: 'info',
  early_leave: 'warning',
};

interface ScheduleAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  scheduleId: string;
  scheduleTitle?: string;
}

export const ScheduleAttendanceModal = ({
  isOpen,
  onClose,
  groupId,
  scheduleId,
  scheduleTitle,
}: ScheduleAttendanceModalProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScheduleMembersResponse | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    if (isOpen && groupId && scheduleId) {
      loadData();
    }
  }, [isOpen, groupId, scheduleId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await attendanceApi.getScheduleMembers(groupId, scheduleId);
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to load attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 출석 상태 변경
  const handleStatusChange = async (member: AttendanceMember, newStatus: AttendanceStatus) => {
    if (savingMemberId) return;

    setSavingMemberId(member.userId);
    try {
      await attendanceApi.checkInManual(groupId, scheduleId, {
        userId: member.userId,
        status: newStatus,
      });
      // 데이터 다시 로드
      await loadData();
    } catch (error) {
      console.error('Failed to update attendance:', error);
    } finally {
      setSavingMemberId(null);
    }
  };

  // 출석 상태 드롭다운 렌더링
  const renderStatusDropdown = (member: AttendanceMember) => {
    const currentStatus = member.status;
    const isSaving = savingMemberId === member.userId;

    // 사유결석 승인된 경우 드롭다운 비활성화
    if (member.absenceRequest?.status === 'approved') {
      return (
        <div className="attendance-status attendance-status--excused">
          <span className="attendance-status__badge">사유결석</span>
        </div>
      );
    }

    return (
      <select
        className={`attendance-status__select attendance-status__select--${currentStatus ? STATUS_COLORS[currentStatus] : 'none'}`}
        value={currentStatus || ''}
        onChange={(e) => handleStatusChange(member, e.target.value as AttendanceStatus)}
        disabled={isSaving}
      >
        <option value="">미체크</option>
        <option value="present">출석</option>
        <option value="late">지각</option>
        <option value="absent">결석</option>
        <option value="excused">사유결석</option>
        <option value="early_leave">조퇴</option>
      </select>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={scheduleTitle ? `출석 관리 - ${scheduleTitle}` : '출석 관리'}
      size="lg"
    >
      <div className="schedule-attendance">
        {loading ? (
          <div className="schedule-attendance__loading">로딩 중...</div>
        ) : !data ? (
          <div className="schedule-attendance__error">데이터를 불러올 수 없습니다.</div>
        ) : (
          <>
            {/* 요약 통계 */}
            <div className="schedule-attendance__summary">
              <div className="schedule-attendance__stat schedule-attendance__stat--total">
                <span className="schedule-attendance__stat-value">{data.summary.total}</span>
                <span className="schedule-attendance__stat-label">전체</span>
              </div>
              <div className="schedule-attendance__stat schedule-attendance__stat--present">
                <span className="schedule-attendance__stat-value">{data.summary.present}</span>
                <span className="schedule-attendance__stat-label">출석</span>
              </div>
              <div className="schedule-attendance__stat schedule-attendance__stat--late">
                <span className="schedule-attendance__stat-value">{data.summary.late}</span>
                <span className="schedule-attendance__stat-label">지각</span>
              </div>
              <div className="schedule-attendance__stat schedule-attendance__stat--excused">
                <span className="schedule-attendance__stat-value">{data.summary.excused}</span>
                <span className="schedule-attendance__stat-label">사유결석</span>
              </div>
              <div className="schedule-attendance__stat schedule-attendance__stat--absent">
                <span className="schedule-attendance__stat-value">{data.summary.absent}</span>
                <span className="schedule-attendance__stat-label">결석</span>
              </div>
              <div className="schedule-attendance__stat schedule-attendance__stat--not-checked">
                <span className="schedule-attendance__stat-value">{data.summary.notChecked}</span>
                <span className="schedule-attendance__stat-label">미체크</span>
              </div>
            </div>

            {/* 멤버 목록 */}
            <div className="schedule-attendance__list">
              {data.members.map((member) => (
                <div key={member.userId} className="schedule-attendance__item">
                  <div className="schedule-attendance__member">
                    <div className="schedule-attendance__avatar">
                      {member.profileImage ? (
                        <img src={member.profileImage} alt={member.userName} />
                      ) : (
                        member.userName?.charAt(0) || '?'
                      )}
                    </div>
                    <div className="schedule-attendance__info">
                      <span className="schedule-attendance__name">{member.userName}</span>
                      {member.checkedAt && (
                        <span className="schedule-attendance__time">
                          {new Date(member.checkedAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {member.leftAt && (
                            <> ~ {new Date(member.leftAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="schedule-attendance__status">
                    {renderStatusDropdown(member)}
                  </div>

                  {/* 사유결석 정보 */}
                  {member.absenceRequest && (
                    <div className={`schedule-attendance__absence schedule-attendance__absence--${member.absenceRequest.status}`}>
                      <div className="schedule-attendance__absence-header">
                        <span className="schedule-attendance__absence-type">
                          {ABSENCE_TYPE_LABELS[member.absenceRequest.absenceType]}
                        </span>
                        <span className={`schedule-attendance__absence-status schedule-attendance__absence-status--${member.absenceRequest.status}`}>
                          {member.absenceRequest.status === 'pending' ? '대기 중' :
                           member.absenceRequest.status === 'approved' ? '승인됨' : '거절됨'}
                        </span>
                      </div>
                      <p className="schedule-attendance__absence-reason">
                        {member.absenceRequest.reason}
                      </p>
                      {member.absenceRequest.responseNote && (
                        <p className="schedule-attendance__absence-note">
                          관리자 메모: {member.absenceRequest.responseNote}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 메모 */}
                  {member.note && !member.absenceRequest && (
                    <div className="schedule-attendance__note">
                      {member.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ScheduleAttendanceModal;
