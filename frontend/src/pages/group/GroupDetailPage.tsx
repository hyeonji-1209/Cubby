import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store';
import { groupApi, announcementApi, scheduleApi } from '@/api';
import { Modal, EmptyState, Calendar } from '@/components';
import type { GroupMember, SubGroupRequest, Announcement, AnnouncementFormData, Schedule, ScheduleFormData } from '@/types';
import './GroupPages.scss';

type TabType = 'home' | 'members' | 'subgroups' | 'announcements' | 'schedules' | 'requests' | 'settings';

// 일정 색상 옵션
const scheduleColors = [
  { value: '#3b82f6', label: '파랑' },
  { value: '#10b981', label: '초록' },
  { value: '#f59e0b', label: '주황' },
  { value: '#ef4444', label: '빨강' },
  { value: '#8b5cf6', label: '보라' },
  { value: '#ec4899', label: '분홍' },
];

const groupTypeLabels: Record<string, string> = {
  education: '학원/교육',
  religious: '교회/종교',
  community: '동호회/커뮤니티',
  company: '회사/팀',
};

const roleLabels: Record<string, string> = {
  owner: '운영자',
  admin: '관리자',
  leader: '리더',
  member: '멤버',
  guardian: '보호자',
};

const roleOptions = [
  { value: 'admin', label: '관리자' },
  { value: 'leader', label: '리더' },
  { value: 'member', label: '멤버' },
];

const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

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
    clearCurrentGroup,
  } = useGroupStore();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSubGroupModal, setShowSubGroupModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  // 소모임 생성 폼
  const [subGroupName, setSubGroupName] = useState('');
  const [subGroupDesc, setSubGroupDesc] = useState('');
  const [subGroupLoading, setSubGroupLoading] = useState(false);

  // 멤버 역할 변경
  const [newRole, setNewRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  // 초대코드 재생성
  const [regeneratingCode, setRegeneratingCode] = useState(false);

  // 공지사항
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    isPinned: false,
  });
  const [announcementSaving, setAnnouncementSaving] = useState(false);

  // 일정
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    isAllDay: false,
    location: '',
    color: '#3b82f6',
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    if (groupId) {
      fetchGroup(groupId);
      fetchMembers(groupId);
      fetchSubGroups(groupId);
      fetchAnnouncements();
      fetchSchedules();
    }

    return () => {
      clearCurrentGroup();
    };
  }, [groupId]);

  // 관리자인 경우 승인 요청 목록 조회
  useEffect(() => {
    if (groupId && isAdmin) {
      fetchSubGroupRequests(groupId);
    }
  }, [groupId, members]);

  const currentMember = members.find((m) => m.userId === user?.id);
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = isOwner || currentMember?.role === 'admin';

  const handleLeaveGroup = async () => {
    if (!groupId) return;

    try {
      await leaveGroup(groupId);
      navigate('/groups');
    } catch {
      alert('모임 탈퇴에 실패했습니다.');
    }
  };

  const copyInviteCode = () => {
    if (currentGroup?.inviteCode) {
      navigator.clipboard.writeText(currentGroup.inviteCode);
      alert('초대 코드가 복사되었습니다!');
    }
  };

  // 초대코드 만료 여부 확인
  const isInviteCodeExpired = () => {
    if (!currentGroup?.inviteCodeExpiresAt) return false;
    return new Date() > new Date(currentGroup.inviteCodeExpiresAt);
  };

  // 초대코드 만료일 포맷
  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return '무제한';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '만료됨';
    if (diffDays === 0) return '오늘 만료';
    if (diffDays === 1) return '내일 만료';
    return `${diffDays}일 후 만료`;
  };

  // 초대코드 재생성
  const handleRegenerateInviteCode = async () => {
    if (!groupId || !isAdmin) return;

    if (!confirm('초대 코드를 재생성하시겠습니까? 기존 코드는 더 이상 사용할 수 없습니다.')) {
      return;
    }

    setRegeneratingCode(true);
    try {
      await groupApi.regenerateInviteCode(groupId);
      await fetchGroup(groupId);
      alert('초대 코드가 재생성되었습니다.');
    } catch {
      alert('초대 코드 재생성에 실패했습니다.');
    } finally {
      setRegeneratingCode(false);
    }
  };

  // 소모임 생성
  const handleCreateSubGroup = async () => {
    if (!groupId || !subGroupName.trim()) return;

    setSubGroupLoading(true);
    try {
      const result = await createSubGroup(groupId, {
        name: subGroupName.trim(),
        description: subGroupDesc.trim() || undefined,
      });

      // 승인 요청인 경우
      if ('status' in result && result.status === 'pending') {
        alert('소모임 생성 요청이 전송되었습니다. 관리자 승인을 기다려주세요.');
      } else {
        alert('소모임이 생성되었습니다!');
        await fetchSubGroups(groupId);
      }

      setShowSubGroupModal(false);
      setSubGroupName('');
      setSubGroupDesc('');
    } catch {
      alert('소모임 생성에 실패했습니다.');
    } finally {
      setSubGroupLoading(false);
    }
  };

  // 승인 요청 처리
  const handleApproveRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;

    try {
      await approveRequest(groupId, request.id);
      alert(`"${request.name}" 소모임이 승인되었습니다.`);
    } catch {
      alert('승인에 실패했습니다.');
    }
  };

  const handleRejectRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;

    const reason = prompt('거절 사유를 입력하세요 (선택사항):');
    try {
      await rejectRequest(groupId, request.id, reason || undefined);
      alert('요청이 거절되었습니다.');
    } catch {
      alert('거절에 실패했습니다.');
    }
  };

  // 멤버 역할 관리
  const openMemberModal = (member: GroupMember) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setShowMemberModal(true);
  };

  const handleUpdateRole = async () => {
    if (!groupId || !selectedMember || !newRole) return;

    setRoleLoading(true);
    try {
      await groupApi.updateMemberRole(groupId, selectedMember.id, newRole);
      await fetchMembers(groupId);
      alert('역할이 변경되었습니다.');
      setShowMemberModal(false);
    } catch {
      alert('역할 변경에 실패했습니다.');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!groupId || !selectedMember) return;

    if (!confirm(`${selectedMember.user?.name}님을 모임에서 내보내시겠습니까?`)) {
      return;
    }

    try {
      await groupApi.removeMember(groupId, selectedMember.id);
      await fetchMembers(groupId);
      alert('멤버가 제거되었습니다.');
      setShowMemberModal(false);
    } catch {
      alert('멤버 제거에 실패했습니다.');
    }
  };

  // 공지사항 조회
  const fetchAnnouncements = async () => {
    if (!groupId) return;

    setAnnouncementsLoading(true);
    try {
      const response = await announcementApi.getByGroup(groupId);
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  // 공지사항 생성/수정
  const handleSaveAnnouncement = async () => {
    if (!groupId || !announcementForm.title.trim() || !announcementForm.content.trim()) return;

    setAnnouncementSaving(true);
    try {
      if (editingAnnouncement) {
        await announcementApi.update(editingAnnouncement.id, announcementForm);
        alert('공지사항이 수정되었습니다.');
      } else {
        await announcementApi.create(groupId, announcementForm);
        alert('공지사항이 등록되었습니다.');
      }
      await fetchAnnouncements();
      closeAnnouncementModal();
    } catch {
      alert('공지사항 저장에 실패했습니다.');
    } finally {
      setAnnouncementSaving(false);
    }
  };

  // 공지사항 삭제
  const handleDeleteAnnouncement = async (announcement: Announcement) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;

    try {
      await announcementApi.delete(announcement.id);
      alert('공지사항이 삭제되었습니다.');
      await fetchAnnouncements();
    } catch {
      alert('공지사항 삭제에 실패했습니다.');
    }
  };

  // 공지사항 고정/해제
  const handleTogglePin = async (announcement: Announcement) => {
    try {
      await announcementApi.togglePin(announcement.id);
      await fetchAnnouncements();
    } catch {
      alert('고정 설정에 실패했습니다.');
    }
  };

  // 공지사항 수정 모달 열기
  const openEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      isPinned: announcement.isPinned,
    });
    setShowAnnouncementModal(true);
  };

  // 공지사항 모달 닫기
  const closeAnnouncementModal = () => {
    setShowAnnouncementModal(false);
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', content: '', isPinned: false });
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 공지사항 작성 권한 (운영자, 관리자, 리더)
  const canWriteAnnouncement = currentMember && ['owner', 'admin', 'leader'].includes(currentMember.role);

  // 일정 조회
  const fetchSchedules = async () => {
    if (!groupId) return;

    setSchedulesLoading(true);
    try {
      const response = await scheduleApi.getByGroup(groupId);
      setSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setSchedulesLoading(false);
    }
  };

  // 일정 생성/수정
  const handleSaveSchedule = async () => {
    if (!groupId || !scheduleForm.title.trim() || !scheduleForm.startAt || !scheduleForm.endAt) return;

    setScheduleSaving(true);
    try {
      if (editingSchedule) {
        await scheduleApi.update(editingSchedule.id, scheduleForm);
        alert('일정이 수정되었습니다.');
      } else {
        await scheduleApi.create(groupId, scheduleForm);
        alert('일정이 등록되었습니다.');
      }
      await fetchSchedules();
      closeScheduleModal();
    } catch {
      alert('일정 저장에 실패했습니다.');
    } finally {
      setScheduleSaving(false);
    }
  };

  // 일정 삭제
  const handleDeleteSchedule = async (schedule: Schedule) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;

    try {
      await scheduleApi.delete(schedule.id);
      alert('일정이 삭제되었습니다.');
      await fetchSchedules();
    } catch {
      alert('일정 삭제에 실패했습니다.');
    }
  };

  // 일정 수정 모달 열기
  const openEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      title: schedule.title,
      description: schedule.description || '',
      startAt: schedule.startAt.slice(0, 16), // datetime-local format
      endAt: schedule.endAt.slice(0, 16),
      isAllDay: schedule.isAllDay,
      location: schedule.location || '',
      color: schedule.color || '#3b82f6',
    });
    setShowScheduleModal(true);
  };

  // 일정 모달 닫기
  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setEditingSchedule(null);
    setScheduleForm({
      title: '',
      description: '',
      startAt: '',
      endAt: '',
      isAllDay: false,
      location: '',
      color: '#3b82f6',
    });
  };

  // 일시 포맷
  const formatDateTime = (dateStr: string, isAllDay: boolean) => {
    const date = new Date(dateStr);
    if (isAllDay) {
      return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    }
    return date.toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 일정 작성 권한 (운영자, 관리자, 리더)
  const canWriteSchedule = currentMember && ['owner', 'admin', 'leader'].includes(currentMember.role);

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

  const pendingRequestsCount = subGroupRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="group-detail">
      {/* 헤더 */}
      <div className="group-detail__header">
        <div className="group-detail__info">
          {currentGroup.logoImage ? (
            <img
              src={currentGroup.logoImage}
              alt={currentGroup.name}
              className="group-detail__logo"
            />
          ) : (
            <div className="group-detail__logo group-detail__logo--default">
              {currentGroup.name.charAt(0)}
            </div>
          )}
          <div className="group-detail__text">
            <h1 className="group-detail__name">{currentGroup.name}</h1>
            <span className="group-detail__type">
              {groupTypeLabels[currentGroup.type] || currentGroup.type}
            </span>
            {currentGroup.description && (
              <p className="group-detail__desc">{currentGroup.description}</p>
            )}
          </div>
        </div>

        <div className="group-detail__actions">
          <button className="group-detail__invite-btn" onClick={copyInviteCode}>
            초대 코드 복사
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="group-detail__tabs">
        <button
          className={`group-detail__tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          홈
        </button>
        <button
          className={`group-detail__tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          멤버 ({members.length})
        </button>
        <button
          className={`group-detail__tab ${activeTab === 'subgroups' ? 'active' : ''}`}
          onClick={() => setActiveTab('subgroups')}
        >
          소모임 ({subGroups.length})
        </button>
        <button
          className={`group-detail__tab ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          공지사항 ({announcements.length})
        </button>
        <button
          className={`group-detail__tab ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          일정 ({schedules.length})
        </button>
        {isAdmin && (
          <button
            className={`group-detail__tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            승인 요청 {pendingRequestsCount > 0 && <span className="badge">{pendingRequestsCount}</span>}
          </button>
        )}
        <button
          className={`group-detail__tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          설정
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="group-detail__content">
        {/* 홈 탭 */}
        {activeTab === 'home' && (
          <div className="group-detail__home">
            <div className="group-detail__stats">
              <div className="group-detail__stat">
                <span className="group-detail__stat-value">{members.length}</span>
                <span className="group-detail__stat-label">멤버</span>
              </div>
              <div className="group-detail__stat">
                <span className="group-detail__stat-value">{subGroups.length}</span>
                <span className="group-detail__stat-label">소모임</span>
              </div>
            </div>

            <div className={`group-detail__invite-box ${isInviteCodeExpired() ? 'group-detail__invite-box--expired' : ''}`}>
              <div className="group-detail__invite-header">
                <h3>초대 코드</h3>
                <span className={`group-detail__invite-expiry ${isInviteCodeExpired() ? 'expired' : ''}`}>
                  {formatExpiryDate(currentGroup.inviteCodeExpiresAt)}
                </span>
              </div>
              <div className="group-detail__invite-code">
                <code className={isInviteCodeExpired() ? 'expired' : ''}>{currentGroup.inviteCode}</code>
                <button onClick={copyInviteCode} disabled={isInviteCodeExpired()}>복사</button>
                {isAdmin && (
                  <button
                    className="regenerate"
                    onClick={handleRegenerateInviteCode}
                    disabled={regeneratingCode}
                  >
                    {regeneratingCode ? '생성 중...' : '재생성'}
                  </button>
                )}
              </div>
              <p>
                {isInviteCodeExpired()
                  ? '초대 코드가 만료되었습니다. 새 코드를 생성해주세요.'
                  : '이 코드를 공유하여 새 멤버를 초대하세요'}
              </p>
            </div>

            <div className="group-detail__section">
              <h2>최근 멤버</h2>
              <div className="group-detail__member-list">
                {members.slice(0, 5).map((member) => (
                  <div key={member.id} className="member-item">
                    <div className="member-item__avatar">
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="member-item__info">
                      <span className="member-item__name">{member.user?.name}</span>
                      <span className={`member-item__role member-item__role--${member.role}`}>
                        {roleLabels[member.role] || member.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 멤버 탭 */}
        {activeTab === 'members' && (
          <div className="group-detail__members">
            {membersLoading ? (
              <p className="group-detail__loading-text">로딩 중...</p>
            ) : (
              <div className="group-detail__member-grid">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="member-card"
                    onClick={() => isAdmin && member.role !== 'owner' && openMemberModal(member)}
                    style={{ cursor: isAdmin && member.role !== 'owner' ? 'pointer' : 'default' }}
                  >
                    <div className="member-card__avatar">
                      {member.user?.profileImage ? (
                        <img src={member.user.profileImage} alt={member.user.name} />
                      ) : (
                        member.user?.name?.charAt(0) || '?'
                      )}
                    </div>
                    <div className="member-card__info">
                      <h3 className="member-card__name">{member.user?.name}</h3>
                      <span className={`member-card__role member-card__role--${member.role}`}>
                        {roleLabels[member.role] || member.role}
                      </span>
                      <span className="member-card__email">{member.user?.email}</span>
                    </div>
                    {isAdmin && member.role !== 'owner' && (
                      <div className="member-card__badge">관리</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 소모임 탭 */}
        {activeTab === 'subgroups' && (
          <div className="group-detail__subgroups">
            <div className="group-detail__subgroups-header">
              <h2>소모임</h2>
              <button
                className="group-detail__add-btn"
                onClick={() => setShowSubGroupModal(true)}
              >
                + 소모임 만들기
              </button>
            </div>

            {subGroupsLoading ? (
              <p className="group-detail__loading-text">로딩 중...</p>
            ) : subGroups.length === 0 ? (
              <div className="group-detail__empty">
                <p>아직 소모임이 없습니다</p>
                <button onClick={() => setShowSubGroupModal(true)}>
                  첫 소모임 만들기
                </button>
              </div>
            ) : (
              <div className="group-detail__subgroup-list">
                {subGroups.map((subGroup) => (
                  <div
                    key={subGroup.id}
                    className="subgroup-card subgroup-card--clickable"
                    onClick={() => navigate(`/groups/${groupId}/subgroups/${subGroup.id}`)}
                  >
                    <div className="subgroup-card__header">
                      <h3 className="subgroup-card__name">{subGroup.name}</h3>
                      <span className={`subgroup-card__status subgroup-card__status--${subGroup.status}`}>
                        {subGroup.status === 'active' ? '활성' : subGroup.status === 'pending' ? '대기' : '비활성'}
                      </span>
                    </div>
                    {subGroup.description && (
                      <p className="subgroup-card__desc">{subGroup.description}</p>
                    )}
                    {subGroup.leader && (
                      <p className="subgroup-card__leader">
                        리더: {subGroup.leader.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 공지사항 탭 */}
        {activeTab === 'announcements' && (
          <div className="group-detail__announcements">
            <div className="group-detail__announcements-header">
              <h2>공지사항</h2>
              {canWriteAnnouncement && (
                <button
                  className="group-detail__add-btn"
                  onClick={() => setShowAnnouncementModal(true)}
                >
                  + 공지사항 작성
                </button>
              )}
            </div>

            {announcementsLoading ? (
              <p className="group-detail__loading-text">로딩 중...</p>
            ) : announcements.length === 0 ? (
              <EmptyState
                description="아직 공지사항이 없습니다"
                action={
                  canWriteAnnouncement
                    ? { label: '첫 공지사항 작성', onClick: () => setShowAnnouncementModal(true) }
                    : undefined
                }
              />
            ) : (
              <div className="group-detail__announcement-list">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`announcement-card ${announcement.isPinned ? 'announcement-card--pinned' : ''}`}
                  >
                    <div className="announcement-card__header">
                      <div className="announcement-card__meta">
                        {announcement.isPinned && (
                          <span className="announcement-card__pin-badge">고정</span>
                        )}
                        <h3 className="announcement-card__title">{announcement.title}</h3>
                      </div>
                      {(isAdmin || announcement.authorId === user?.id) && (
                        <div className="announcement-card__actions">
                          <button
                            className="announcement-card__action"
                            onClick={() => handleTogglePin(announcement)}
                            title={announcement.isPinned ? '고정 해제' : '고정'}
                          >
                            {announcement.isPinned ? '📌' : '📍'}
                          </button>
                          <button
                            className="announcement-card__action"
                            onClick={() => openEditAnnouncement(announcement)}
                            title="수정"
                          >
                            ✏️
                          </button>
                          <button
                            className="announcement-card__action announcement-card__action--delete"
                            onClick={() => handleDeleteAnnouncement(announcement)}
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="announcement-card__content">{announcement.content}</p>
                    <div className="announcement-card__footer">
                      <span className="announcement-card__author">
                        {announcement.author?.name || '알 수 없음'}
                      </span>
                      <span className="announcement-card__date">
                        {formatDate(announcement.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 일정 탭 */}
        {activeTab === 'schedules' && (
          <div className="group-detail__schedules">
            <div className="group-detail__schedules-header">
              <div className="group-detail__schedules-title-row">
                <h2>일정</h2>
                <div className="view-toggle">
                  <button
                    className={`view-toggle__btn ${scheduleViewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setScheduleViewMode('list')}
                    title="리스트 보기"
                  >
                    <span className="view-toggle__icon">☰</span>
                    <span className="view-toggle__label">리스트</span>
                  </button>
                  <button
                    className={`view-toggle__btn ${scheduleViewMode === 'calendar' ? 'active' : ''}`}
                    onClick={() => setScheduleViewMode('calendar')}
                    title="캘린더 보기"
                  >
                    <span className="view-toggle__icon">📅</span>
                    <span className="view-toggle__label">캘린더</span>
                  </button>
                </div>
              </div>
              {canWriteSchedule && (
                <button
                  className="group-detail__add-btn"
                  onClick={() => setShowScheduleModal(true)}
                >
                  + 일정 추가
                </button>
              )}
            </div>

            {schedulesLoading ? (
              <p className="group-detail__loading-text">로딩 중...</p>
            ) : schedules.length === 0 ? (
              <EmptyState
                description="아직 등록된 일정이 없습니다"
                action={
                  canWriteSchedule
                    ? { label: '첫 일정 추가', onClick: () => setShowScheduleModal(true) }
                    : undefined
                }
              />
            ) : scheduleViewMode === 'calendar' ? (
              <Calendar
                schedules={schedules}
                onScheduleClick={(schedule) => openEditSchedule(schedule)}
              />
            ) : (
              <div className="group-detail__schedule-list">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="schedule-card"
                    style={{ borderLeftColor: schedule.color || '#3b82f6' }}
                  >
                    <div className="schedule-card__header">
                      <div className="schedule-card__meta">
                        <h3 className="schedule-card__title">{schedule.title}</h3>
                        {schedule.isAllDay && (
                          <span className="schedule-card__all-day">종일</span>
                        )}
                      </div>
                      {(isAdmin || schedule.authorId === user?.id) && (
                        <div className="schedule-card__actions">
                          <button
                            className="schedule-card__action"
                            onClick={() => openEditSchedule(schedule)}
                            title="수정"
                          >
                            ✏️
                          </button>
                          <button
                            className="schedule-card__action schedule-card__action--delete"
                            onClick={() => handleDeleteSchedule(schedule)}
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="schedule-card__time">
                      <span className="schedule-card__start">
                        {formatDateTime(schedule.startAt, schedule.isAllDay)}
                      </span>
                      <span className="schedule-card__separator">~</span>
                      <span className="schedule-card__end">
                        {formatDateTime(schedule.endAt, schedule.isAllDay)}
                      </span>
                    </div>
                    {schedule.location && (
                      <p className="schedule-card__location">📍 {schedule.location}</p>
                    )}
                    {schedule.description && (
                      <p className="schedule-card__desc">{schedule.description}</p>
                    )}
                    <div className="schedule-card__footer">
                      <span className="schedule-card__author">
                        {schedule.author?.name || '알 수 없음'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 승인 요청 탭 (관리자 전용) */}
        {activeTab === 'requests' && isAdmin && (
          <div className="group-detail__requests">
            <h2>소모임 생성 요청</h2>

            {subGroupRequests.length === 0 ? (
              <div className="group-detail__empty">
                <p>대기 중인 요청이 없습니다</p>
              </div>
            ) : (
              <div className="group-detail__request-list">
                {subGroupRequests.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-card__info">
                      <h3 className="request-card__name">{request.name}</h3>
                      {request.description && (
                        <p className="request-card__desc">{request.description}</p>
                      )}
                      <p className="request-card__requester">
                        요청자: {request.requester?.name || '알 수 없음'}
                      </p>
                      <p className="request-card__date">
                        {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="request-card__actions">
                      <button
                        className="request-card__approve"
                        onClick={() => handleApproveRequest(request)}
                      >
                        승인
                      </button>
                      <button
                        className="request-card__reject"
                        onClick={() => handleRejectRequest(request)}
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === 'settings' && (
          <div className="group-detail__settings">
            <h2>모임 설정</h2>

            <div className="group-detail__setting-section">
              <h3>기본 정보</h3>
              <div className="group-detail__setting-item">
                <span className="label">모임 이름</span>
                <span className="value">{currentGroup.name}</span>
              </div>
              <div className="group-detail__setting-item">
                <span className="label">타입</span>
                <span className="value">{groupTypeLabels[currentGroup.type]}</span>
              </div>
              <div className="group-detail__setting-item">
                <span className="label">초대 코드</span>
                <span className="value code">{currentGroup.inviteCode}</span>
              </div>
              <div className="group-detail__setting-item">
                <span className="label">내 역할</span>
                <span className="value">{roleLabels[currentMember?.role || 'member']}</span>
              </div>
            </div>

            <div className="group-detail__setting-section group-detail__setting-section--danger">
              <h3>위험 구역</h3>
              {!isOwner && (
                <button
                  className="group-detail__danger-btn"
                  onClick={() => setShowLeaveModal(true)}
                >
                  모임 나가기
                </button>
              )}
              {isOwner && (
                <p className="group-detail__warning">
                  운영자는 모임을 나갈 수 없습니다. 다른 멤버에게 운영자 권한을 넘긴 후 나가세요.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 소모임 생성 모달 */}
      {showSubGroupModal && (
        <div className="modal-overlay" onClick={() => setShowSubGroupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">소모임 만들기</h2>
            <p className="modal__desc">
              {isAdmin
                ? '새 소모임이 바로 생성됩니다.'
                : '관리자의 승인 후 소모임이 생성됩니다.'}
            </p>

            <div className="modal__field">
              <label className="modal__label">소모임 이름 *</label>
              <input
                type="text"
                className="modal__input"
                placeholder="예: 청년부, 수학반, 개발팀"
                value={subGroupName}
                onChange={(e) => setSubGroupName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="modal__field">
              <label className="modal__label">설명 (선택)</label>
              <textarea
                className="modal__textarea"
                placeholder="소모임에 대한 간단한 설명"
                value={subGroupDesc}
                onChange={(e) => setSubGroupDesc(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal__actions">
              <button
                className="modal__cancel"
                onClick={() => setShowSubGroupModal(false)}
              >
                취소
              </button>
              <button
                className="modal__submit"
                onClick={handleCreateSubGroup}
                disabled={!subGroupName.trim() || subGroupLoading}
              >
                {subGroupLoading ? '처리 중...' : isAdmin ? '생성하기' : '요청 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 멤버 관리 모달 */}
      {showMemberModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">멤버 관리</h2>
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
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal__actions">
              <button
                className="modal__cancel"
                onClick={() => setShowMemberModal(false)}
              >
                취소
              </button>
              <button
                className="modal__submit modal__submit--danger"
                onClick={handleRemoveMember}
              >
                내보내기
              </button>
              <button
                className="modal__submit"
                onClick={handleUpdateRole}
                disabled={roleLoading || newRole === selectedMember.role}
              >
                {roleLoading ? '저장 중...' : '역할 저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모임 나가기 모달 */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">모임 나가기</h2>
            <p className="modal__desc">
              정말 <strong>{currentGroup.name}</strong> 모임을 나가시겠습니까?
            </p>
            <div className="modal__actions">
              <button
                className="modal__cancel"
                onClick={() => setShowLeaveModal(false)}
              >
                취소
              </button>
              <button className="modal__submit modal__submit--danger" onClick={handleLeaveGroup}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공지사항 작성/수정 모달 */}
      <Modal
        isOpen={showAnnouncementModal}
        onClose={closeAnnouncementModal}
        title={editingAnnouncement ? '공지사항 수정' : '공지사항 작성'}
        description="모임원들에게 중요한 소식을 전달하세요"
        actions={
          <>
            <button className="modal__cancel" onClick={closeAnnouncementModal}>
              취소
            </button>
            <button
              className="modal__submit"
              onClick={handleSaveAnnouncement}
              disabled={!announcementForm.title.trim() || !announcementForm.content.trim() || announcementSaving}
            >
              {announcementSaving ? '저장 중...' : editingAnnouncement ? '수정하기' : '등록하기'}
            </button>
          </>
        }
      >
        <div className="modal__field">
          <label className="modal__label">제목 *</label>
          <input
            type="text"
            className="modal__input"
            placeholder="공지사항 제목을 입력하세요"
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
            maxLength={200}
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">내용 *</label>
          <textarea
            className="modal__textarea"
            placeholder="공지사항 내용을 입력하세요"
            value={announcementForm.content}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
            rows={6}
          />
        </div>

        <div className="modal__field">
          <label className="modal__checkbox-label">
            <input
              type="checkbox"
              checked={announcementForm.isPinned}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, isPinned: e.target.checked })}
            />
            <span>상단에 고정</span>
          </label>
        </div>
      </Modal>

      {/* 일정 작성/수정 모달 */}
      <Modal
        isOpen={showScheduleModal}
        onClose={closeScheduleModal}
        title={editingSchedule ? '일정 수정' : '일정 추가'}
        description="모임 일정을 등록하세요"
        size="lg"
        actions={
          <>
            <button className="modal__cancel" onClick={closeScheduleModal}>
              취소
            </button>
            <button
              className="modal__submit"
              onClick={handleSaveSchedule}
              disabled={!scheduleForm.title.trim() || !scheduleForm.startAt || !scheduleForm.endAt || scheduleSaving}
            >
              {scheduleSaving ? '저장 중...' : editingSchedule ? '수정하기' : '등록하기'}
            </button>
          </>
        }
      >
        <div className="modal__field">
          <label className="modal__label">제목 *</label>
          <input
            type="text"
            className="modal__input"
            placeholder="일정 제목을 입력하세요"
            value={scheduleForm.title}
            onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
            maxLength={200}
          />
        </div>

        <div className="modal__row">
          <div className="modal__field modal__field--half">
            <label className="modal__label">시작 *</label>
            <input
              type="datetime-local"
              className="modal__input"
              value={scheduleForm.startAt}
              onChange={(e) => setScheduleForm({ ...scheduleForm, startAt: e.target.value })}
            />
          </div>
          <div className="modal__field modal__field--half">
            <label className="modal__label">종료 *</label>
            <input
              type="datetime-local"
              className="modal__input"
              value={scheduleForm.endAt}
              onChange={(e) => setScheduleForm({ ...scheduleForm, endAt: e.target.value })}
            />
          </div>
        </div>

        <div className="modal__field">
          <label className="modal__checkbox-label">
            <input
              type="checkbox"
              checked={scheduleForm.isAllDay}
              onChange={(e) => setScheduleForm({ ...scheduleForm, isAllDay: e.target.checked })}
            />
            <span>종일 일정</span>
          </label>
        </div>

        <div className="modal__field">
          <label className="modal__label">장소</label>
          <input
            type="text"
            className="modal__input"
            placeholder="장소를 입력하세요"
            value={scheduleForm.location}
            onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
            maxLength={300}
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">설명</label>
          <textarea
            className="modal__textarea"
            placeholder="일정에 대한 설명을 입력하세요"
            value={scheduleForm.description}
            onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">색상</label>
          <div className="modal__color-picker">
            {scheduleColors.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`modal__color-option ${scheduleForm.color === color.value ? 'active' : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => setScheduleForm({ ...scheduleForm, color: color.value })}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupDetailPage;
