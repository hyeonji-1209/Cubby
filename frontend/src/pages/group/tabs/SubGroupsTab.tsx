import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components';
import type { SubGroupsTabProps } from './types';

const SubGroupsTab: React.FC<SubGroupsTabProps> = ({
  groupId,
  currentGroup,
  subGroups,
  subGroupsLoading,
  onShowSubGroupModal,
}) => {
  const navigate = useNavigate();
  const isClass = currentGroup?.type === 'education' && currentGroup?.hasClasses;

  return (
    <div className="group-detail__subgroups">
      <div className="group-detail__section-header">
        <h2>
          {isClass
            ? `반 관리 (${subGroups.length})`
            : `소모임 (${subGroups.length})`}
        </h2>
        <button
          className="group-detail__add-btn"
          onClick={onShowSubGroupModal}
        >
          {isClass ? '+ 반 만들기' : '+ 소모임 만들기'}
        </button>
      </div>

      {subGroupsLoading ? (
        <p className="group-detail__loading-text">로딩 중...</p>
      ) : subGroups.length === 0 ? (
        <EmptyState
          description={isClass ? '아직 반이 없습니다' : '아직 소모임이 없습니다'}
          action={{
            label: isClass ? '첫 반 만들기' : '첫 소모임 만들기',
            onClick: onShowSubGroupModal
          }}
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{isClass ? '반' : '소모임'}</th>
              <th>{isClass ? '담당' : '리더'}</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subGroups.map((subGroup) => (
              <tr
                key={subGroup.id}
                className="data-table__row--clickable"
                onClick={() => navigate(`/groups/${groupId}/subgroups/${subGroup.id}`)}
              >
                <td>
                  <div className="data-table__title-cell">
                    <span className="data-table__title">{subGroup.name}</span>
                    {subGroup.description && (
                      <span className="data-table__subtitle">{subGroup.description}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="data-table__text">{subGroup.leader?.name || '-'}</span>
                </td>
                <td>
                  <span className={`data-table__status data-table__status--${subGroup.status}`}>
                    {subGroup.status === 'active' ? '활성' : subGroup.status === 'pending' ? '대기' : '비활성'}
                  </span>
                </td>
                <td>
                  <span className="data-table__arrow">→</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SubGroupsTab;
