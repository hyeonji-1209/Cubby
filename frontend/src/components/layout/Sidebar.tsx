import { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { subGroupApi } from '@/api';
import { useToast } from '@/components/common';
import { homeIcon, settingsIcon, chevronRightIcon, plusIcon, linkIcon, getIconById } from '@/assets';
import type { SubGroup } from '@/types';
import './Sidebar.scss';

// 소모임 점 아이콘
const SubGroupDot = () => (
  <span className="sidebar__subgroup-dot" />
);

interface GroupMenuItemProps {
  groupId: string;
  groupName: string;
  icon?: string;
  color?: string;
  logoImage?: string;
  isActive: boolean;
}

const GroupMenuItem = ({ groupId, groupName, icon, color, logoImage, isActive }: GroupMenuItemProps) => {
  const [isOpen, setIsOpen] = useState(true); // 기본 열림
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const location = useLocation();

  // 마운트 시 소모임 로드
  useEffect(() => {
    loadSubGroups();
  }, [groupId]);

  // 현재 이 그룹 또는 그 소모임이 활성화되어 있으면 자동으로 열기
  useEffect(() => {
    const isGroupActive = location.pathname.includes(`/groups/${groupId}`);
    if (isGroupActive && !isOpen) {
      setIsOpen(true);
    }
  }, [location.pathname, groupId]);

  // 소모임 로드
  const loadSubGroups = async () => {
    if (hasLoaded || isLoading) return;

    setIsLoading(true);
    try {
      const response = await subGroupApi.getList(groupId);
      setSubGroups(response.data);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load subgroups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="sidebar__group">
      <div className="sidebar__group-header">
        <NavLink
          to={`/groups/${groupId}`}
          className={({ isActive: linkActive }) =>
            `sidebar__group-link ${linkActive || isActive ? 'sidebar__group-link--active' : ''}`
          }
        >
          <span
            className="sidebar__group-avatar"
            style={color && color !== 'transparent' ? { background: color } : undefined}
          >
            {logoImage ? (
              <img src={logoImage} alt={groupName} className="sidebar__group-logo" />
            ) : icon && getIconById(icon) ? (
              <img src={getIconById(icon)} alt="" className="sidebar__group-icon" />
            ) : (
              groupName?.charAt(0) || '?'
            )}
          </span>
          <span className="sidebar__group-name">{groupName || '이름 없음'}</span>
        </NavLink>
        <button
          className="sidebar__toggle-btn"
          onClick={handleToggle}
          aria-label={isOpen ? '소모임 접기' : '소모임 펼치기'}
        >
          <img
            src={chevronRightIcon}
            alt=""
            className={`sidebar__chevron ${isOpen ? 'sidebar__chevron--open' : ''}`}
            width="16"
            height="16"
          />
        </button>
      </div>

      {isOpen && (
        <div className="sidebar__subgroups">
          {isLoading ? (
            <div className="sidebar__loading">로딩 중...</div>
          ) : subGroups.length === 0 ? (
            <div className="sidebar__empty-subgroups">소모임 없음</div>
          ) : (
            subGroups.map((subGroup) => (
              <NavLink
                key={subGroup.id}
                to={`/groups/${groupId}/subgroups/${subGroup.id}`}
                className={({ isActive: linkActive }) =>
                  `sidebar__subgroup-link ${linkActive ? 'sidebar__subgroup-link--active' : ''}`
                }
              >
                <SubGroupDot />
                <span>{subGroup.name}</span>
              </NavLink>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// 초대 코드 입력 모달
interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InviteModal = ({ isOpen, onClose }: InviteModalProps) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { joinGroup } = useGroupStore();
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await joinGroup(inviteCode.trim());
      toast.success('모임에 가입되었습니다!');
      onClose();
      setInviteCode('');
    } catch {
      setError('유효하지 않은 초대 코드입니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-modal-overlay" onClick={onClose}>
      <div className="sidebar-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="sidebar-modal__title">초대 코드 입력</h3>
        <p className="sidebar-modal__desc">모임 초대 코드를 입력해주세요</p>

        {error && <div className="sidebar-modal__error">{error}</div>}

        <input
          type="text"
          className="sidebar-modal__input"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="예: ABC123"
          maxLength={10}
          autoFocus
        />

        <div className="sidebar-modal__actions">
          <button className="sidebar-modal__btn sidebar-modal__btn--cancel" onClick={onClose}>
            취소
          </button>
          <button
            className="sidebar-modal__btn sidebar-modal__btn--submit"
            onClick={handleSubmit}
            disabled={loading || !inviteCode.trim()}
          >
            {loading ? '가입 중...' : '가입'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const { myGroups, myGroupsLoading, fetchMyGroups } = useGroupStore();
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (myGroups.length === 0) {
      fetchMyGroups();
    }
  }, []);

  return (
    <aside className="sidebar">
      {/* 상단: 액션 버튼 */}
      <div className="sidebar__top">
        <div className="sidebar__actions">
          <button
            className="sidebar__action-btn"
            onClick={() => setShowInviteModal(true)}
            title="초대 코드 입력"
          >
            <img src={linkIcon} alt="" width="18" height="18" />
            <span>초대 코드</span>
          </button>
          <Link to="/groups/create" className="sidebar__action-btn sidebar__action-btn--primary" title="새 모임 만들기">
            <img src={plusIcon} alt="" width="18" height="18" />
            <span>새 모임</span>
          </Link>
        </div>
      </div>

      {/* 중간: 네비게이션 (스크롤 가능) */}
      <nav className="sidebar__nav">
        {/* 대시보드 */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
          }
        >
          <img src={homeIcon} alt="" className="sidebar__icon" width="20" height="20" />
          <span className="sidebar__label">대시보드</span>
        </NavLink>

        {/* 구분선 */}
        <div className="sidebar__divider" />

        {/* 내 모임 목록 */}
        {myGroupsLoading ? (
          <div className="sidebar__loading">로딩 중...</div>
        ) : myGroups.length === 0 ? (
          <div className="sidebar__empty">
            <span>가입한 모임이 없습니다</span>
          </div>
        ) : (
          myGroups.map((group) => (
            <GroupMenuItem
              key={group.id}
              groupId={group.id}
              groupName={group.name}
              icon={group.icon}
              color={group.color}
              logoImage={group.logoImage}
              isActive={location.pathname.includes(`/groups/${group.id}`)}
            />
          ))
        )}
      </nav>

      {/* 하단: 설정 (고정) */}
      <div className="sidebar__bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
          }
        >
          <img src={settingsIcon} alt="" className="sidebar__icon" width="20" height="20" />
          <span className="sidebar__label">설정</span>
        </NavLink>
      </div>

      {/* 초대 코드 모달 */}
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
    </aside>
  );
};

export default Sidebar;
