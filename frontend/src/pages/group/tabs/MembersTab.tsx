import { useMemo } from 'react';
import { MEMBER_ROLE_LABELS } from '@/constants/labels';
import { formatDate } from '@/utils/dateFormat';
import { QRIcon } from '@/components/icons';
import { Dropdown } from '@/components';
import type { MembersTabProps } from './types';

// 수업 시작 10분 전부터 수업 종료까지 확인하는 함수
const isWithinLessonTime = (startAt: Date, endAt: Date): boolean => {
  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);
  const tenMinutesBefore = new Date(start.getTime() - 10 * 60 * 1000);

  return now >= tenMinutesBefore && now <= end;
};

// 교육 타입에서 역할 라벨 (새로운 시스템: owner/member만)
const getEducationTypeLabel = (role: string): string => {
  switch (role) {
    case 'owner': return '원장';
    case 'member': return '멤버';
    default: return '';
  }
};

const MembersTab: React.FC<MembersTabProps> = ({
  currentGroup,
  isOwner,
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
  pendingMembers,
  pendingMembersLoading,
  onApproveMember,
  onRejectMember,
  userId,
  onGoToLessonManagement,
}) => {
  const showInstructorFilter = hasMultipleInstructors && instructorSubGroups && instructorSubGroups.length > 0;
  const hasPendingMembers = pendingMembers && pendingMembers.length > 0;

  // 현재 사용자가 강사인지 확인 (원장이 아닌 경우) - title로 판단
  const currentUserIsInstructor = useMemo(() => {
    if (isOwner) return false;
    const currentMember = members.find(m => m.userId === userId || m.user?.id === userId);
    return currentMember?.title === '강사';
  }, [isOwner, members, userId]);

  // 강사의 학생 ID 목록 (강사인 경우)
  const myStudentIds = useMemo(() => {
    if (!currentUserIsInstructor || !userId || !instructorSubGroups) return new Set<string>();

    const mySubGroup = instructorSubGroups.find(sg => sg.instructorId === userId);
    if (!mySubGroup) return new Set<string>();

    // 해당 소그룹의 멤버 ID들을 반환 (실제로는 API 호출 필요하지만, 여기서는 members에서 찾음)
    // instructorSubGroups에 members 정보가 있다면 사용
    const studentIds = new Set<string>();

    // 멤버 중에서 해당 강사에게 배정된 학생 찾기 (instructorId 필드가 있다면)
    members.forEach(m => {
      const memberWithInstructor = m as typeof m & { instructorId?: string };
      if (memberWithInstructor.instructorId === userId) {
        studentIds.add(m.id);
      }
    });

    return studentIds;
  }, [currentUserIsInstructor, userId, instructorSubGroups, members]);

  // 버튼 표시 여부 결정 함수
  const shouldShowButtons = (memberUserId: string | undefined, memberId: string, memberRole: string, memberTitle?: string) => {
    // 원장은 owner 제외 모든 멤버에 대해 버튼 표시
    if (isOwner) {
      return { showLesson: memberRole !== 'owner', showManage: memberRole !== 'owner' };
    }

    // 강사인 경우
    if (currentUserIsInstructor) {
      const isMyself = memberUserId === userId;
      const isMyStudent = myStudentIds.has(memberId);
      const isMemberInstructor = memberTitle === '강사';

      // 본인 행: 수업 버튼만 (관리 버튼 X)
      if (isMyself) {
        const hasStudents = instructorSubGroups?.some(sg => sg.instructorId === userId);
        return { showLesson: hasStudents, showManage: false };
      }

      // 본인 학생: 둘 다 표시
      if (isMyStudent && !isMemberInstructor) {
        return { showLesson: true, showManage: true };
      }

      // 그 외: 버튼 숨김
      return { showLesson: false, showManage: false };
    }

    // 일반 관리자
    return { showLesson: memberRole !== 'owner', showManage: memberRole !== 'owner' };
  };

  return (
    <div className="group-detail__members">
      {/* 가입 대기 멤버 섹션 */}
      {isAdmin && hasPendingMembers && (
        <div className="group-detail__pending-section">
          <div className="group-detail__pending-header">
            <h3 className="group-detail__pending-title">
              가입 대기 <span className="group-detail__pending-count">{pendingMembers.length}</span>
            </h3>
          </div>
          {pendingMembersLoading ? (
            <p className="group-detail__loading-text">로딩 중...</p>
          ) : (
            <div className="group-detail__pending-list">
              {pendingMembers.map((member) => (
                <div key={member.id} className="group-detail__pending-item">
                  <div className="group-detail__pending-user">
                    <div className="group-detail__pending-avatar">
                      {member.user?.profileImage ? (
                        <img src={member.user.profileImage} alt={member.user.name} />
                      ) : (
                        member.user?.name?.charAt(0) || '?'
                      )}
                    </div>
                    <div className="group-detail__pending-info">
                      <span className="group-detail__pending-name">{member.user?.name}</span>
                      <span className="group-detail__pending-email">{member.user?.email}</span>
                    </div>
                  </div>
                  <div className="group-detail__pending-actions">
                    <button
                      className="group-detail__pending-btn group-detail__pending-btn--approve"
                      onClick={() => onApproveMember?.(member)}
                    >
                      승인
                    </button>
                    <button
                      className="group-detail__pending-btn group-detail__pending-btn--reject"
                      onClick={() => onRejectMember?.(member)}
                    >
                      거부
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          {showInstructorFilter && isOwner && (
            <Dropdown
              className="group-detail__instructor-filter"
              value={instructorFilter || 'all'}
              onChange={(value) => setInstructorFilter?.(value)}
              options={[
                { value: 'all', label: '전체 학생' },
                { value: 'unassigned', label: '미배정 학생' },
                ...instructorSubGroups.map((subGroup) => ({
                  value: subGroup.id,
                  label: subGroup.instructor?.name || subGroup.name,
                })),
              ]}
            />
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
              const memberUserId = member.userId || member.user?.id;
              const nextSchedule = getMemberNextSchedule?.(memberUserId || '');
              const canShowQR = nextSchedule && isWithinLessonTime(nextSchedule.startAt, nextSchedule.endAt);

              const isInstructor = member.title === '강사';
              const isMyself = memberUserId === userId;
              const { showLesson, showManage } = shouldShowButtons(memberUserId, member.id, member.role, member.title);

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
                    <span className="data-table__text">
                      {member.title || (currentGroup.type === 'education' ? getEducationTypeLabel(member.role) : '-')}
                    </span>
                  </td>
                  <td>
                    <span className="data-table__date">{formatDate(member.joinedAt)}</span>
                  </td>
                  <td>
                    <div className="data-table__actions">
                      {/* 수업 버튼 (1:1 교육 그룹) */}
                      {isOneOnOneEducation && showLesson && (
                        (() => {
                          // 강사 행 클릭 시
                          if (isInstructor) {
                            const hasStudents = instructorSubGroups?.some(sg => sg.instructorId === memberUserId);
                            // 원장은 학생 배정 여부와 관계없이 버튼 표시, 강사 본인은 학생이 있을 때만
                            if (!isOwner && !hasStudents) return null;

                            return (
                              <button
                                className="data-table__lesson-btn"
                                onClick={() => {
                                  // 원장이 강사 클릭 시 해당 강사 ID 전달
                                  // 본인(강사)이 클릭 시에는 ID 전달 안함 (자동 선택)
                                  onGoToLessonManagement?.(isOwner ? memberUserId : undefined);
                                }}
                                title={isMyself ? '내 학생 수업 관리' : `${member.nickname || member.user?.name} 학생 보기`}
                              >
                                수업
                              </button>
                            );
                          }

                          // 학생 행 클릭 시
                          return (
                            <button
                              className={`data-table__lesson-btn ${canShowQR ? 'data-table__lesson-btn--live' : ''}`}
                              onClick={() => onOpenLessonPanel?.(member)}
                              title="수업 관리"
                            >
                              {canShowQR ? '수업 중' : '수업'}
                            </button>
                          );
                        })()
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
                      {showManage && (
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
