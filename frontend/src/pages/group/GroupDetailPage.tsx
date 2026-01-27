import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import 'react-calendar/dist/Calendar.css';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store';
import { groupApi, locationApi } from '@/api';
import type { FavoriteLocation } from '@/api';
import { Modal, useToast } from '@/components';
import { useLoading } from '@/hooks';
import { getIconById } from '@/assets/icons';
import { GROUP_TYPE_LABELS, ROLE_OPTIONS } from '@/constants/labels';
import type { GroupMember, SubGroupRequest } from '@/types';
import {
  HomeTab,
  MembersTab,
  SubGroupsTab,
  AnnouncementsTab,
  SchedulesTab,
  PracticeRoomsTab,
  SettingsTab,
  TabType,
} from './tabs';
import './GroupPages.scss';

type CalendarValue = Date | null | [Date | null, Date | null];

const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();

  const {
    currentGroup,
    currentGroupLoading,
    members,
    membersLoading,
    subGroups,
    subGroupsLoading,
    subGroupRequests,
    fetchGroup,
    fetchMembers,
    fetchSubGroups,
    fetchSubGroupRequests,
    createSubGroup,
    approveRequest,
    rejectRequest,
    leaveGroup,
    deleteGroup,
    clearCurrentGroup,
  } = useGroupStore();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubGroupModal, setShowSubGroupModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  // 소모임 생성 폼
  const [subGroupName, setSubGroupName] = useState('');
  const [subGroupDesc, setSubGroupDesc] = useState('');
  const { loading: subGroupLoading, withLoading: withSubGroupLoading } = useLoading();

  // 멤버 역할 변경
  const [newRole, setNewRole] = useState('');
  const { loading: roleLoading, withLoading: withRoleLoading } = useLoading();

  // 멤버 검색
  const [memberSearch, setMemberSearch] = useState('');

  // 초대코드 재생성
  const { loading: regeneratingCode, withLoading: withRegeneratingCode } = useLoading();

  // 캘린더 (HomeTab용)
  const [homeCalendarDate, setHomeCalendarDate] = useState<CalendarValue>(new Date());

  // 자주 쓰는 장소 (SchedulesTab용)
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>([]);

  // 데이터 로드 상태 (lazy loading용)
  const loadedRef = useRef({
    members: false,
    subGroups: false,
    requests: false,
    favoriteLocations: false,
  });

  // 선택된 날짜
  const selectedDate = homeCalendarDate instanceof Date ? homeCalendarDate : null;

  // 권한 체크
  const currentMember = members.find((m) => m.userId === user?.id);
  const myRole = currentGroup?.myRole || currentMember?.role;
  const isOwner = myRole === 'owner';
  const isAdmin = isOwner || myRole === 'admin';
  const memberCount = currentGroup?.memberCount ?? members.length;

  // 공지/일정 작성 권한
  const canWriteAnnouncement = isAdmin || (currentGroup?.settings?.announcementWritePermission ?? 'admin') === 'all';
  const canWriteSchedule = isAdmin || (currentGroup?.settings?.scheduleWritePermission ?? 'admin') === 'all';

  // 필터링된 멤버 목록
  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const searchLower = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.user?.name?.toLowerCase().includes(searchLower) ||
        m.user?.email?.toLowerCase().includes(searchLower) ||
        m.nickname?.toLowerCase().includes(searchLower)
    );
  }, [members, memberSearch]);

  // 장소 조회
  const fetchFavoriteLocations = useCallback(async () => {
    if (!groupId) return;
    try {
      const locations = await locationApi.getByGroup(groupId);
      setFavoriteLocations(locations);
    } catch (error) {
      console.error('Failed to fetch favorite locations:', error);
    }
  }, [groupId]);

  // 초기 데이터 로드
  useEffect(() => {
    if (groupId && groupId !== 'undefined') {
      fetchGroup(groupId);
    }
    return () => clearCurrentGroup();
  }, [groupId]);

  // 탭별 lazy loading
  useEffect(() => {
    if (!groupId || groupId === 'undefined' || !currentGroup) return;

    const loadTabData = async () => {
      switch (activeTab) {
        case 'home':
          // Tab handles its own data loading via store
          break;
        case 'members':
          if (!loadedRef.current.members) {
            loadedRef.current.members = true;
            await fetchMembers(groupId);
          }
          break;
        case 'subgroups':
          if (!loadedRef.current.subGroups) {
            loadedRef.current.subGroups = true;
            await fetchSubGroups(groupId);
          }
          break;
        case 'announcements':
          if (!loadedRef.current.requests && isAdmin) {
            loadedRef.current.requests = true;
            await fetchSubGroupRequests(groupId);
          }
          break;
        case 'schedules':
          if (!loadedRef.current.favoriteLocations) {
            loadedRef.current.favoriteLocations = true;
            await fetchFavoriteLocations();
          }
          break;
        case 'settings':
          if (!loadedRef.current.members) {
            loadedRef.current.members = true;
            await fetchMembers(groupId);
          }
          break;
      }
    };

    loadTabData();
  }, [groupId, activeTab, currentGroup, isAdmin, fetchMembers, fetchSubGroups, fetchSubGroupRequests, fetchFavoriteLocations]);

  // ========== Handler Functions ==========

  const handleLeaveGroup = async () => {
    if (!groupId) return;
    try {
      await leaveGroup(groupId);
      navigate('/dashboard');
    } catch {
      toast.error('모임 탈퇴에 실패했습니다.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    try {
      await deleteGroup(groupId);
      toast.success('모임이 삭제되었습니다.');
      navigate('/dashboard');
    } catch {
      toast.error('모임 삭제에 실패했습니다.');
    }
  };

  const copyInviteCode = () => {
    if (currentGroup?.inviteCode) {
      navigator.clipboard.writeText(currentGroup.inviteCode);
      toast.success('초대 코드가 복사되었습니다!');
    }
  };

  const isInviteCodeExpired = () => {
    if (!currentGroup?.inviteCodeExpiresAt) return false;
    return new Date() > new Date(currentGroup.inviteCodeExpiresAt);
  };

  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return '무제한';
    const date = new Date(dateStr);
    const now = new Date();
    if (date < now) return '만료됨';
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}월 ${day}일 ${hours}:${minutes} 만료`;
  };

  const handleRegenerateInviteCode = async () => {
    if (!groupId || !isAdmin) return;
    if (!confirm('초대 코드를 재생성하시겠습니까? 기존 코드는 더 이상 사용할 수 없습니다.')) return;

    await withRegeneratingCode(async () => {
      await groupApi.regenerateInviteCode(groupId);
      await fetchGroup(groupId);
      toast.success('초대 코드가 재생성되었습니다.');
    }).catch(() => toast.error('초대 코드 재생성에 실패했습니다.'));
  };

  const handleCreateSubGroup = async () => {
    if (!groupId || !subGroupName.trim()) return;

    await withSubGroupLoading(async () => {
      const result = await createSubGroup(groupId, {
        name: subGroupName.trim(),
        description: subGroupDesc.trim() || undefined,
      });

      if ('status' in result && result.status === 'pending') {
        toast.info('소모임 생성 요청이 전송되었습니다. 관리자 승인을 기다려주세요.');
      } else {
        toast.success('소모임이 생성되었습니다!');
        await fetchSubGroups(groupId);
      }

      setShowSubGroupModal(false);
      setSubGroupName('');
      setSubGroupDesc('');
    }).catch(() => toast.error('소모임 생성에 실패했습니다.'));
  };

  const handleApproveRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;
    try {
      await approveRequest(groupId, request.id);
      toast.success(`"${request.name}" 소모임이 승인되었습니다.`);
    } catch {
      toast.error('승인에 실패했습니다.');
    }
  };

  const handleRejectRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;
    const reason = prompt('거절 사유를 입력하세요 (선택사항):');
    try {
      await rejectRequest(groupId, request.id, reason || undefined);
      toast.success('요청이 거절되었습니다.');
    } catch {
      toast.error('거절에 실패했습니다.');
    }
  };

  const openMemberModal = (member: GroupMember) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setShowMemberModal(true);
  };

  const handleUpdateRole = async () => {
    if (!groupId || !selectedMember || !newRole) return;

    await withRoleLoading(async () => {
      await groupApi.updateMemberRole(groupId, selectedMember.id, newRole);
      await fetchMembers(groupId);
      toast.success('역할이 변경되었습니다.');
      setShowMemberModal(false);
    }).catch(() => toast.error('역할 변경에 실패했습니다.'));
  };

  const handleRemoveMember = async () => {
    if (!groupId || !selectedMember) return;
    if (!confirm(`${selectedMember.user?.name}님을 모임에서 내보내시겠습니까?`)) return;

    try {
      await groupApi.removeMember(groupId, selectedMember.id);
      await fetchMembers(groupId);
      toast.success('멤버가 제거되었습니다.');
      setShowMemberModal(false);
    } catch {
      toast.error('멤버 제거에 실패했습니다.');
    }
  };

  // ========== Render ==========

  if (currentGroupLoading) {
    return (
      <div className="group-detail">
        <div className="group-detail__loading">로딩 중...</div>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="group-detail">
        <div className="group-detail__error">
          <p>모임을 찾을 수 없습니다.</p>
          <Link to="/groups">모임 목록으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group-detail">
      {/* 헤더 */}
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
            <button className="group-detail__invite-btn" onClick={copyInviteCode}>
              초대 코드 복사
            </button>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
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
            멤버 ({members.length > 0 ? members.length : currentGroup?.memberCount ?? 0})
          </button>
        )}
        {isAdmin && (currentGroup?.type !== 'education' || currentGroup?.hasClasses) && (
          <button
            className={`group-detail__tab ${activeTab === 'subgroups' ? 'active' : ''}`}
            onClick={() => setActiveTab('subgroups')}
          >
            {currentGroup?.type === 'education' && currentGroup?.hasClasses
              ? `반 관리 (${subGroups.length > 0 ? subGroups.length : currentGroup?.subGroupCount ?? 0})`
              : `소모임 (${subGroups.length > 0 ? subGroups.length : currentGroup?.subGroupCount ?? 0})`}
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

      {/* 탭 컨텐츠 */}
      <div className="group-detail__content">
        {activeTab === 'home' && groupId && (
          <HomeTab
            groupId={groupId}
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            homeCalendarDate={homeCalendarDate}
            setHomeCalendarDate={setHomeCalendarDate}
            selectedDate={selectedDate}
            regeneratingCode={regeneratingCode}
            onCopyInviteCode={copyInviteCode}
            onRegenerateInviteCode={handleRegenerateInviteCode}
            onNavigateToTab={setActiveTab}
            formatExpiryDate={formatExpiryDate}
            isInviteCodeExpired={isInviteCodeExpired}
          />
        )}

        {activeTab === 'members' && isAdmin && groupId && (
          <MembersTab
            groupId={groupId}
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            members={members}
            membersLoading={membersLoading}
            memberSearch={memberSearch}
            setMemberSearch={setMemberSearch}
            filteredMembers={filteredMembers}
            onOpenMemberModal={openMemberModal}
          />
        )}

        {activeTab === 'subgroups' && isAdmin && groupId && (
          <SubGroupsTab
            groupId={groupId}
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            subGroups={subGroups}
            subGroupsLoading={subGroupsLoading}
            subGroupRequests={subGroupRequests}
            onShowSubGroupModal={() => setShowSubGroupModal(true)}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
          />
        )}

        {activeTab === 'announcements' && groupId && (
          <AnnouncementsTab
            groupId={groupId}
            isAdmin={isAdmin}
            canWriteAnnouncement={!!canWriteAnnouncement}
            subGroupRequests={subGroupRequests}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
          />
        )}

        {activeTab === 'schedules' && groupId && (
          <SchedulesTab
            groupId={groupId}
            isAdmin={isAdmin}
            canWriteSchedule={!!canWriteSchedule}
            userId={user?.id}
            favoriteLocations={favoriteLocations}
          />
        )}

        {activeTab === 'practicerooms' && currentGroup?.type === 'education' && currentGroup?.hasPracticeRooms && groupId && (
          <PracticeRoomsTab
            groupId={groupId}
            currentGroup={currentGroup}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'settings' && groupId && (
          <SettingsTab
            groupId={groupId}
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            members={members}
            memberCount={memberCount}
            onShowLeaveModal={() => setShowLeaveModal(true)}
            onShowDeleteModal={() => setShowDeleteModal(true)}
          />
        )}
      </div>

      {/* 소모임/반 생성 모달 */}
      <Modal
        isOpen={showSubGroupModal}
        onClose={() => setShowSubGroupModal(false)}
        title={currentGroup?.type === 'education' && currentGroup?.hasClasses ? '반 만들기' : '소모임 만들기'}
        description={
          currentGroup?.type === 'education' && currentGroup?.hasClasses
            ? (isAdmin ? '새 반이 바로 생성됩니다.' : '관리자의 승인 후 반이 생성됩니다.')
            : (isAdmin ? '새 소모임이 바로 생성됩니다.' : '관리자의 승인 후 소모임이 생성됩니다.')
        }
        actions={
          <>
            <button className="modal__cancel" onClick={() => setShowSubGroupModal(false)}>
              취소
            </button>
            <button
              className="modal__submit"
              onClick={handleCreateSubGroup}
              disabled={!subGroupName.trim() || subGroupLoading}
            >
              {subGroupLoading ? '처리 중...' : isAdmin ? '생성하기' : '요청 보내기'}
            </button>
          </>
        }
      >
        <div className="modal__field">
          <label className="modal__label">
            {currentGroup?.type === 'education' && currentGroup?.hasClasses ? '반 이름' : '소모임 이름'} *
          </label>
          <input
            type="text"
            className="modal__input"
            placeholder={currentGroup?.type === 'education' && currentGroup?.hasClasses
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
            placeholder={currentGroup?.type === 'education' && currentGroup?.hasClasses
              ? '반에 대한 간단한 설명 (수업 시간, 대상 등)'
              : '소모임에 대한 간단한 설명'}
            value={subGroupDesc}
            onChange={(e) => setSubGroupDesc(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* 멤버 관리 모달 */}
      <Modal
        isOpen={showMemberModal && !!selectedMember}
        onClose={() => setShowMemberModal(false)}
        title="멤버 관리"
        actions={
          <>
            <button className="modal__cancel" onClick={() => setShowMemberModal(false)}>
              취소
            </button>
            <button className="modal__submit modal__submit--danger" onClick={handleRemoveMember}>
              내보내기
            </button>
            <button
              className="modal__submit"
              onClick={handleUpdateRole}
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

      {/* 모임 나가기 모달 */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="모임 나가기"
        description={`정말 ${currentGroup.name} 모임을 나가시겠습니까?`}
        actions={
          <>
            <button className="modal__cancel" onClick={() => setShowLeaveModal(false)}>
              취소
            </button>
            <button className="modal__submit modal__submit--danger" onClick={handleLeaveGroup}>
              나가기
            </button>
          </>
        }
      />

      {/* 모임 삭제 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="모임 삭제"
        description={`정말 ${currentGroup.name} 모임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        actions={
          <>
            <button className="modal__cancel" onClick={() => setShowDeleteModal(false)}>
              취소
            </button>
            <button className="modal__submit modal__submit--danger" onClick={handleDeleteGroup}>
              삭제
            </button>
          </>
        }
      />
    </div>
  );
};

export default GroupDetailPage;
