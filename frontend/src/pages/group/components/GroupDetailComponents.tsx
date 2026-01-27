import { Modal } from '@/components';
import { getIconById } from '@/assets/icons';
import { GROUP_TYPE_LABELS, ROLE_OPTIONS } from '@/constants/labels';
import type { Group, GroupMember, User } from '@/types';
import type { TabType } from '../tabs';

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
}

export const GroupDetailTabs = ({
  currentGroup,
  activeTab,
  setActiveTab,
  isAdmin,
  membersCount,
  subGroupsCount,
}: GroupDetailTabsProps) => (
  <div className="group-detail__tabs">
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
interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMember: GroupMember | null;
  newRole: string;
  setNewRole: (role: string) => void;
  roleLoading: boolean;
  onUpdateRole: () => void;
  onRemoveMember: () => void;
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
}: MemberModalProps) => (
  <Modal
    isOpen={isOpen && !!selectedMember}
    onClose={onClose}
    title="멤버 관리"
    actions={
      <>
        <button className="modal__cancel" onClick={onClose}>
          취소
        </button>
        <button className="modal__submit modal__submit--danger" onClick={onRemoveMember}>
          내보내기
        </button>
        <button
          className="modal__submit"
          onClick={onUpdateRole}
          disabled={roleLoading || newRole === selectedMember?.role}
        >
          {roleLoading ? '저장 중...' : '역할 저장'}
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
