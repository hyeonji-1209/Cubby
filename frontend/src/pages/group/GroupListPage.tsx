import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { GROUP_TYPE_LABELS } from '@/constants/labels';
import './GroupPages.scss';

const GroupListPage = () => {
  const { myGroups, myGroupsLoading, fetchMyGroups } = useGroupStore();

  useEffect(() => {
    fetchMyGroups();
  }, [fetchMyGroups]);

  return (
    <div className="group-list">
      <div className="group-list__header">
        <h1 className="group-list__title">내 모임</h1>
        <Link to="/groups/create" className="group-list__create-btn">
          + 새 모임 만들기
        </Link>
      </div>

      {myGroupsLoading ? (
        <div className="group-list__loading">
          <p>로딩 중...</p>
        </div>
      ) : myGroups.length === 0 ? (
        <div className="group-list__empty">
          <p className="group-list__empty-text">아직 가입한 모임이 없습니다</p>
          <p className="group-list__empty-subtext">
            새 모임을 만들거나 초대 코드로 가입해보세요
          </p>
        </div>
      ) : (
        <div className="group-list__grid">
          {myGroups.filter((group) => group.id).map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="group-card"
            >
              <div className="group-card__header">
                {group.logoImage ? (
                  <img
                    src={group.logoImage}
                    alt={group.name}
                    className="group-card__logo"
                  />
                ) : (
                  <div className="group-card__logo group-card__logo--default">
                    {group.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              <div className="group-card__body">
                <h3 className="group-card__name">{group.name || '이름 없음'}</h3>
                <span className="group-card__type">
                  {GROUP_TYPE_LABELS[group.type] || group.type}
                </span>
                {group.description && (
                  <p className="group-card__desc">{group.description}</p>
                )}
              </div>
              <div className="group-card__footer">
                <span className="group-card__code">
                  초대코드: {group.inviteCode}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupListPage;
