import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store';
import { groupApi, locationApi } from '@/api';
import type { FavoriteLocation } from '@/api';
import { useToast } from '@/components';
import { useLoading } from '@/hooks';
import type { GroupMember, SubGroupRequest } from '@/types';
import type { TabType } from '../tabs';

type CalendarValue = Date | null | [Date | null, Date | null];

export const useGroupDetail = () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // 탭별 lazy loading
  useEffect(() => {
    if (!groupId || groupId === 'undefined' || !currentGroup) return;

    const loadTabData = async () => {
      switch (activeTab) {
        case 'home':
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

  // Handler Functions
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

  return {
    // IDs & Navigation
    groupId,
    user,
    // Group data
    currentGroup,
    currentGroupLoading,
    members,
    membersLoading,
    subGroups,
    subGroupsLoading,
    subGroupRequests,
    // Permissions
    currentMember,
    myRole,
    isOwner,
    isAdmin,
    memberCount,
    canWriteAnnouncement,
    canWriteSchedule,
    // Tab state
    activeTab,
    setActiveTab,
    // Modal states
    showLeaveModal,
    setShowLeaveModal,
    showDeleteModal,
    setShowDeleteModal,
    showSubGroupModal,
    setShowSubGroupModal,
    showMemberModal,
    setShowMemberModal,
    selectedMember,
    // SubGroup form
    subGroupName,
    setSubGroupName,
    subGroupDesc,
    setSubGroupDesc,
    subGroupLoading,
    // Member management
    newRole,
    setNewRole,
    roleLoading,
    memberSearch,
    setMemberSearch,
    filteredMembers,
    // Invite code
    regeneratingCode,
    // Calendar
    homeCalendarDate,
    setHomeCalendarDate,
    selectedDate,
    // Locations
    favoriteLocations,
    // Handlers
    handleLeaveGroup,
    handleDeleteGroup,
    copyInviteCode,
    isInviteCodeExpired,
    formatExpiryDate,
    handleRegenerateInviteCode,
    handleCreateSubGroup,
    handleApproveRequest,
    handleRejectRequest,
    openMemberModal,
    handleUpdateRole,
    handleRemoveMember,
  };
};
