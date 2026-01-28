import { MEMBER_ROLE_LABELS } from '@/constants/labels';
import { formatDate } from '@/utils/dateFormat';
import type { MembersTabProps } from './types';

// QR 아이콘 컴포넌트
const QRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="3" height="3" />
    <rect x="18" y="14" width="3" height="3" />
    <rect x="14" y="18" width="3" height="3" />
    <rect x="18" y="18" width="3" height="3" />
  </svg>
);

// 수업 시작 10분 전부터 수업 종료까지 확인하는 함수
const isWithinLessonTime = (startAt: Date, endAt: Date): boolean => {
  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);
  const tenMinutesBefore = new Date(start.getTime() - 10 * 60 * 1000);

  return now >= tenMinutesBefore && now <= end;
};

const MembersTab: React.FC<MembersTabProps> = ({
  currentGroup,
  isAdmin,
  members,
  membersLoading,
  memberSearch,
  setMemberSearch,
  filteredMembers,
  onOpenMemberModal,
  hasAttendance,
  onShowAttendanceQR,
  getMemberNextSchedule,
  isOneOnOneEducation,
  onOpenLessonPanel,
  hasMultipleInstructors,
  instructorSubGroups,
  instructorFilter,
  setInstructorFilter,
}) => {
  const showInstructorFilter = hasMultipleInstructors && instructorSubGroups && instructorSubGroups.length > 0;

  return (
    <div className="group-detail__members">
      <div className="group-detail__members-header">
        <div className="group-detail__search-row">
          <div className="group-detail__search">
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="group-detail__search-input"
            />
            {memberSearch && (
              <button
                className="group-detail__search-clear"
                onClick={() => setMemberSearch('')}
              >
                ✕
              </button>
            )}
          </div>
          {showInstructorFilter && (
            <select
              className="group-detail__instructor-filter"
              value={instructorFilter || 'all'}
              onChange={(e) => setInstructorFilter?.(e.target.value)}
            >
              <option value="all">전체 학생</option>
              <option value="unassigned">미배정 학생</option>
              {instructorSubGroups.map((subGroup) => (
                <option key={subGroup.id} value={subGroup.id}>
                  {subGroup.instructor?.name || subGroup.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <span className="group-detail__member-count">
          {filteredMembers.length}명 {(memberSearch || (instructorFilter && instructorFilter !== 'all')) && `/ ${members.length}명`}
        </span>
      </div>
      {membersLoading ? (
        <p className="group-detail__loading-text">로딩 중...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>멤버</th>
              <th>역할</th>
              <th>{currentGroup.type === 'religious' ? '직분' : '직책'}</th>
              <th>가입일</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => {
              const nextSchedule = getMemberNextSchedule?.(member.userId || member.user?.id || '');
              const canShowQR = nextSchedule && isWithinLessonTime(nextSchedule.startAt, nextSchedule.endAt);

              return (
                <tr key={member.id}>
                  <td>
                    <div className="data-table__user">
                      <div className="data-table__avatar">
                        {member.user?.profileImage ? (
                          <img src={member.user.profileImage} alt={member.user.name} />
                        ) : (
                          member.user?.name?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="data-table__user-info">
                        <span className="data-table__name">{member.nickname || member.user?.name}</span>
                        <span className="data-table__email">{member.user?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`data-table__role data-table__role--${member.role}`}>
                      {MEMBER_ROLE_LABELS[member.role] || member.role}
                    </span>
                  </td>
                  <td>
                    <span className="data-table__text">{member.title || '-'}</span>
                  </td>
                  <td>
                    <span className="data-table__date">{formatDate(member.joinedAt)}</span>
                  </td>
                  <td>
                    <div className="data-table__actions">
                      {/* 수업 버튼 (1:1 교육 그룹) */}
                      {isAdmin && isOneOnOneEducation && member.role !== 'owner' && (
                        <button
                          className={`data-table__lesson-btn ${canShowQR ? 'data-table__lesson-btn--live' : ''}`}
                          onClick={() => onOpenLessonPanel?.(member)}
                          title="수업 관리"
                        >
                          {canShowQR ? '수업 중' : '수업'}
                        </button>
                      )}
                      {/* 출석 QR 버튼 (수업 10분 전부터 활성화) - 1:1이 아닌 경우 */}
                      {isAdmin && hasAttendance && !isOneOnOneEducation && member.role !== 'owner' && (
                        <button
                          className={`data-table__qr-btn ${canShowQR ? 'active' : ''}`}
                          onClick={() => canShowQR && onShowAttendanceQR?.(member)}
                          disabled={!canShowQR}
                          title={canShowQR ? `출석 QR (${nextSchedule?.title})` : '예정된 수업이 없습니다'}
                        >
                          <QRIcon />
                        </button>
                      )}
                      {/* 관리 버튼 */}
                      {isAdmin && member.role !== 'owner' && (
                        <button
                          className="data-table__action-btn"
                          onClick={() => onOpenMemberModal(member)}
                        >
                          관리
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MembersTab;
