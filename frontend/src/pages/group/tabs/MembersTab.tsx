import { MEMBER_ROLE_LABELS } from '@/constants/labels';
import { formatDate } from '@/utils/dateFormat';
import type { MembersTabProps } from './types';

const MembersTab: React.FC<MembersTabProps> = ({
  currentGroup,
  isAdmin,
  members,
  membersLoading,
  memberSearch,
  setMemberSearch,
  filteredMembers,
  onOpenMemberModal,
}) => {
  return (
    <div className="group-detail__members">
      <div className="group-detail__members-header">
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
        <span className="group-detail__member-count">
          {filteredMembers.length}명 {memberSearch && `/ ${members.length}명`}
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
            {filteredMembers.map((member) => (
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
                  {isAdmin && member.role !== 'owner' && (
                    <button
                      className="data-table__action-btn"
                      onClick={() => onOpenMemberModal(member)}
                    >
                      관리
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MembersTab;
