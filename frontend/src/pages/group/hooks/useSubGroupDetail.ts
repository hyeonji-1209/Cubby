import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { subGroupApi, groupApi } from '@/api';
import { useToast } from '@/components';
import type { SubGroup, SubGroupRequest, GroupMember } from '@/types';

export type SubGroupTabType = 'home' | 'subgroups' | 'requests' | 'settings';

interface UseSubGroupDetailParams {
  groupId: string | undefined;
  subGroupId: string | undefined;
}

export interface SubGroupDetailState {
  subGroup: SubGroup | null;
  childSubGroups: SubGroup[];
  subGroupRequests: SubGroupRequest[];
  members: GroupMember[];
  loading: boolean;
  childrenLoading: boolean;
  activeTab: SubGroupTabType;
  showSubGroupModal: boolean;
  newSubGroupName: string;
  newSubGroupDesc: string;
  createLoading: boolean;
}

export interface SubGroupDetailActions {
  setActiveTab: (tab: SubGroupTabType) => void;
  setShowSubGroupModal: (show: boolean) => void;
  setNewSubGroupName: (name: string) => void;
  setNewSubGroupDesc: (desc: string) => void;
  handleCreateSubGroup: () => Promise<void>;
  handleApproveRequest: (request: SubGroupRequest) => Promise<void>;
  handleRejectRequest: (request: SubGroupRequest) => Promise<void>;
  handleSubGroupClick: (child: SubGroup) => void;
  refreshChildSubGroups: () => Promise<void>;
  updateSubGroup: (updated: SubGroup) => void;
}

export interface SubGroupDetailComputed {
  currentMember: GroupMember | undefined;
  isGroupAdmin: boolean;
  isLeader: boolean;
  isAdmin: boolean;
  pendingRequestsCount: number;
}

export const useSubGroupDetail = ({ groupId, subGroupId }: UseSubGroupDetailParams) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();

  // 상태
  const [subGroup, setSubGroup] = useState<SubGroup | null>(null);
  const [childSubGroups, setChildSubGroups] = useState<SubGroup[]>([]);
  const [subGroupRequests, setSubGroupRequests] = useState<SubGroupRequest[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [childrenLoading, setChildrenLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<SubGroupTabType>('home');
  const [showSubGroupModal, setShowSubGroupModal] = useState(false);

  // 소모임 생성 폼
  const [newSubGroupName, setNewSubGroupName] = useState('');
  const [newSubGroupDesc, setNewSubGroupDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // 하위 소모임 조회
  const fetchChildSubGroups = useCallback(async () => {
    if (!groupId || !subGroupId) return;

    setChildrenLoading(true);
    try {
      const res = await subGroupApi.getList(groupId, subGroupId);
      setChildSubGroups(res.data);
    } catch (error) {
      console.error('Failed to fetch child subgroups:', error);
    } finally {
      setChildrenLoading(false);
    }
  }, [groupId, subGroupId]);

  // 소모임 요청 조회
  const fetchSubGroupRequests = useCallback(async () => {
    if (!groupId) return;

    try {
      const res = await subGroupApi.getRequests(groupId, 'pending');
      const filtered = res.data.filter((r: SubGroupRequest) => r.parentSubGroupId === subGroupId);
      setSubGroupRequests(filtered);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  }, [groupId, subGroupId]);

  // 데이터 로드
  const fetchData = useCallback(async () => {
    if (!groupId || !subGroupId) return;

    setLoading(true);
    try {
      // 소모임 정보 조회
      const subGroupRes = await subGroupApi.getById(groupId, subGroupId);
      setSubGroup(subGroupRes.data);

      // 하위 소모임 조회
      await fetchChildSubGroups();

      // 상위 그룹 멤버 조회 (권한 확인용)
      const membersRes = await groupApi.getMembers(groupId);
      setMembers(membersRes.data);
    } catch (error) {
      console.error('Failed to fetch subgroup:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, subGroupId, fetchChildSubGroups]);

  useEffect(() => {
    if (groupId && subGroupId) {
      fetchData();
    }
  }, [groupId, subGroupId, fetchData]);

  // 권한 계산
  const currentMember = members.find((m) => m.userId === user?.id);
  // 새로운 권한 시스템: owner만 그룹 관리자
  const isGroupAdmin = currentMember?.role === 'owner';
  const isLeader = subGroup?.leaderId === user?.id;
  const isAdmin = isGroupAdmin || isLeader;
  const pendingRequestsCount = subGroupRequests.length;

  // 관리자인 경우 승인 요청 조회
  useEffect(() => {
    if (isAdmin && groupId) {
      fetchSubGroupRequests();
    }
  }, [isAdmin, groupId, fetchSubGroupRequests]);

  // 하위 소모임 생성
  const handleCreateSubGroup = async () => {
    if (!groupId || !subGroupId || !newSubGroupName.trim()) return;

    setCreateLoading(true);
    try {
      const result = await subGroupApi.requestCreate(groupId, {
        name: newSubGroupName.trim(),
        description: newSubGroupDesc.trim() || undefined,
        parentSubGroupId: subGroupId,
      });

      if ('status' in result.data && result.data.status === 'pending') {
        toast.info('소모임 생성 요청이 전송되었습니다. 관리자 승인을 기다려주세요.');
      } else {
        toast.success('소모임이 생성되었습니다!');
        await fetchChildSubGroups();
      }

      setShowSubGroupModal(false);
      setNewSubGroupName('');
      setNewSubGroupDesc('');
    } catch {
      toast.error('소모임 생성에 실패했습니다.');
    } finally {
      setCreateLoading(false);
    }
  };

  // 승인 처리
  const handleApproveRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;

    try {
      await subGroupApi.approveRequest(groupId, request.id);
      toast.success(`"${request.name}" 소모임이 승인되었습니다.`);
      await fetchChildSubGroups();
      await fetchSubGroupRequests();
    } catch {
      toast.error('승인에 실패했습니다.');
    }
  };

  // 거절 처리
  const handleRejectRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;

    const reason = prompt('거절 사유를 입력하세요 (선택사항):');
    try {
      await subGroupApi.rejectRequest(groupId, request.id, reason || undefined);
      toast.success('요청이 거절되었습니다.');
      await fetchSubGroupRequests();
    } catch {
      toast.error('거절에 실패했습니다.');
    }
  };

  // 소모임 클릭
  const handleSubGroupClick = (childSubGroup: SubGroup) => {
    navigate(`/groups/${groupId}/subgroups/${childSubGroup.id}`);
  };

  const state: SubGroupDetailState = {
    subGroup,
    childSubGroups,
    subGroupRequests,
    members,
    loading,
    childrenLoading,
    activeTab,
    showSubGroupModal,
    newSubGroupName,
    newSubGroupDesc,
    createLoading,
  };

  const actions: SubGroupDetailActions = {
    setActiveTab,
    setShowSubGroupModal,
    setNewSubGroupName,
    setNewSubGroupDesc,
    handleCreateSubGroup,
    handleApproveRequest,
    handleRejectRequest,
    handleSubGroupClick,
    refreshChildSubGroups: fetchChildSubGroups,
    updateSubGroup: setSubGroup,
  };

  const computed: SubGroupDetailComputed = {
    currentMember,
    isGroupAdmin,
    isLeader,
    isAdmin,
    pendingRequestsCount,
  };

  return { state, actions, computed };
};
