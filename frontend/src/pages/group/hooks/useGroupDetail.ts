import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store';
import { groupApi, locationApi, attendanceApi, scheduleApi, subgroupMemberApi, lessonRoomApi } from '@/api';
import type { FavoriteLocation, MemberAttendanceStats, LessonQRToken, InstructorSubGroup, SubGroupMemberInfo, LessonRoom } from '@/api';
import { useToast } from '@/components';
import { useLoading } from '@/hooks';
import type { GroupMember, SubGroupRequest, Schedule, LessonSchedule } from '@/types';
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

  // 강사별 필터링 (다중 강사 모드)
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const [instructorSubGroups, setInstructorSubGroups] = useState<InstructorSubGroup[]>([]);
  const [instructorSubGroupMembers, setInstructorSubGroupMembers] = useState<Map<string, string[]>>(new Map());

  // 초대코드 재생성
  const { loading: regeneratingCode, withLoading: withRegeneratingCode } = useLoading();

  // 캘린더 (HomeTab용)
  const [homeCalendarDate, setHomeCalendarDate] = useState<CalendarValue>(new Date());

  // 자주 쓰는 장소 (SchedulesTab용)
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>([]);

  // 멤버 출석 통계 (1:1 수업용)
  const [memberAttendanceStats, setMemberAttendanceStats] = useState<MemberAttendanceStats | null>(null);

  // 멤버 수업 정보 (1:1 수업용)
  const [lessonSchedule, setLessonSchedule] = useState<LessonSchedule[]>([]);
  const [paymentDueDay, setPaymentDueDay] = useState<number | null>(null);
  const { loading: lessonInfoLoading, withLoading: withLessonInfoLoading } = useLoading();

  // 출석 QR 모달 상태
  const [showAttendanceQRModal, setShowAttendanceQRModal] = useState(false);
  const [attendanceQRMember, setAttendanceQRMember] = useState<GroupMember | null>(null);
  const [attendanceQRSchedule, setAttendanceQRSchedule] = useState<Schedule | null>(null);
  const [attendanceQRToken, setAttendanceQRToken] = useState<LessonQRToken | null>(null);
  const [attendanceQRLoading, setAttendanceQRLoading] = useState(false);

  // 수업 패널 상태 (1:1 교육용)
  const [showLessonPanel, setShowLessonPanel] = useState(false);
  const [lessonPanelMember, setLessonPanelMember] = useState<GroupMember | null>(null);

  // 레슨실 목록 (1:1 교육용)
  const [lessonRooms, setLessonRooms] = useState<LessonRoom[]>([]);

  // 오늘의 일정 목록 (멤버별 다음 수업 조회용)
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);

  // 수업 시간 체크용 (1분마다 갱신)
  const [, setLessonTimeCheck] = useState(0);

  // 데이터 로드 상태 (lazy loading용)
  const loadedRef = useRef({
    members: false,
    subGroups: false,
    requests: false,
    favoriteLocations: false,
    instructorSubGroups: false,
    lessonRooms: false,
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

  // 강사 소그룹 조회
  const fetchInstructorSubGroups = useCallback(async () => {
    if (!groupId) return;
    try {
      const response = await subgroupMemberApi.getInstructorSubGroups(groupId);
      setInstructorSubGroups(response.data || []);

      // 각 강사 소그룹의 멤버 목록 조회
      const memberMap = new Map<string, string[]>();
      for (const subGroup of response.data || []) {
        try {
          const membersResponse = await subgroupMemberApi.getSubGroupMembers(groupId, subGroup.id);
          const memberIds = (membersResponse.data || [])
            .filter((m: SubGroupMemberInfo) => m.groupMember)
            .map((m: SubGroupMemberInfo) => m.groupMemberId);
          memberMap.set(subGroup.id, memberIds);
        } catch (error) {
          console.error('Failed to fetch subgroup members:', error);
        }
      }
      setInstructorSubGroupMembers(memberMap);
    } catch (error) {
      console.error('Failed to fetch instructor subgroups:', error);
    }
  }, [groupId]);

  // 필터링된 멤버 목록
  const filteredMembers = useMemo(() => {
    let result = members;

    // 강사별 필터링 (다중 강사 모드)
    if (instructorFilter && instructorFilter !== 'all') {
      if (instructorFilter === 'unassigned') {
        // 미배정 학생: 어느 강사 소그룹에도 속하지 않은 멤버
        const allAssignedMemberIds = new Set<string>();
        instructorSubGroupMembers.forEach((memberIds) => {
          memberIds.forEach((id) => allAssignedMemberIds.add(id));
        });
        result = result.filter((m) => m.role !== 'owner' && m.role !== 'admin' && !allAssignedMemberIds.has(m.id));
      } else {
        // 특정 강사의 학생
        const memberIds = instructorSubGroupMembers.get(instructorFilter) || [];
        result = result.filter((m) => memberIds.includes(m.id));
      }
    }

    // 검색어 필터링
    if (memberSearch) {
      const searchLower = memberSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(searchLower) ||
          m.user?.email?.toLowerCase().includes(searchLower) ||
          m.nickname?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [members, memberSearch, instructorFilter, instructorSubGroupMembers]);

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

  // 레슨실 조회 (1:1 교육용)
  const fetchLessonRooms = useCallback(async () => {
    if (!groupId) return;
    try {
      const response = await lessonRoomApi.getByGroup(groupId);
      setLessonRooms(response.data || []);
    } catch (error) {
      console.error('Failed to fetch lesson rooms:', error);
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
          // 다중 강사 모드인 경우 강사 소그룹 조회
          if (currentGroup.hasMultipleInstructors && !loadedRef.current.instructorSubGroups) {
            loadedRef.current.instructorSubGroups = true;
            await fetchInstructorSubGroups();
          }
          // 1:1 교육 그룹인 경우 레슨실 목록 조회
          if (currentGroup.type === 'education' && !currentGroup.hasClasses && !loadedRef.current.lessonRooms) {
            loadedRef.current.lessonRooms = true;
            await fetchLessonRooms();
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
  }, [groupId, activeTab, currentGroup, isAdmin, fetchMembers, fetchSubGroups, fetchSubGroupRequests, fetchFavoriteLocations, fetchInstructorSubGroups, fetchLessonRooms]);

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

  const openMemberModal = async (member: GroupMember) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setMemberAttendanceStats(null);
    setShowMemberModal(true);

    // 1:1 수업 정보 초기화
    setLessonSchedule(member.lessonSchedule || []);
    setPaymentDueDay(member.paymentDueDay ?? null);

    // 1:1 수업 그룹에서 출석 기능이 활성화된 경우 출석 통계 조회
    const memberId = member.userId || member.user?.id;
    if (groupId && memberId && currentGroup?.type === 'education' && !currentGroup?.hasClasses && currentGroup?.hasAttendance) {
      try {
        const response = await attendanceApi.getMemberStats(groupId, memberId);
        setMemberAttendanceStats(response.data);
      } catch (error) {
        console.error('Failed to fetch member attendance stats:', error);
      }
    }
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

  // 멤버 수업 정보 저장
  const handleSaveLessonInfo = async () => {
    if (!groupId || !selectedMember) return;

    await withLessonInfoLoading(async () => {
      await groupApi.updateMemberLessonInfo(groupId, selectedMember.id, {
        lessonSchedule,
        paymentDueDay,
      });
      await fetchMembers(groupId);
      toast.success('수업 정보가 저장되었습니다.');
    }).catch(() => toast.error('수업 정보 저장에 실패했습니다.'));
  };

  // 오늘 일정 조회 (멤버 탭에서 출석 QR용)
  const fetchTodaySchedules = useCallback(async () => {
    if (!groupId) return;
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const response = await scheduleApi.getByGroup(groupId, {
        startDate: todayStr,
        endDate: todayStr,
      });
      setTodaySchedules(response.data || []);
    } catch (error) {
      console.error('Failed to fetch today schedules:', error);
    }
  }, [groupId]);

  // 멤버의 다음 수업 일정 조회 (10분 전부터 수업 종료까지 활성화)
  const getMemberNextSchedule = useCallback(
    (memberId: string): { id: string; title: string; startAt: Date; endAt: Date } | null => {
      const now = new Date();
      const todayDayOfWeek = now.getDay(); // 0 = 일요일, 1 = 월요일, ...

      // 1:1 수업 (hasClasses가 false)인 경우: 멤버의 lessonSchedule 체크
      if (currentGroup?.type === 'education' && !currentGroup?.hasClasses) {
        const member = members.find(m => m.userId === memberId || m.user?.id === memberId);
        if (member?.lessonSchedule && member.lessonSchedule.length > 0) {
          for (const lesson of member.lessonSchedule) {
            // 오늘 요일과 일치하는지 확인
            if (lesson.dayOfWeek === todayDayOfWeek) {
              // 시작/종료 시간을 오늘 날짜로 변환
              const [startHour, startMin] = lesson.startTime.split(':').map(Number);
              const [endHour, endMin] = lesson.endTime.split(':').map(Number);

              const startAt = new Date(now);
              startAt.setHours(startHour, startMin, 0, 0);

              const endAt = new Date(now);
              endAt.setHours(endHour, endMin, 0, 0);

              const tenMinutesBefore = new Date(startAt.getTime() - 10 * 60 * 1000);

              // 10분 전부터 수업 종료까지
              if (now >= tenMinutesBefore && now <= endAt) {
                return {
                  id: `lesson-${member.id}-${lesson.dayOfWeek}`,
                  title: `${member.user?.name || member.nickname} 수업`,
                  startAt,
                  endAt,
                };
              }
            }
          }
        }
        return null;
      }

      // 반 수업 (hasClasses가 true)인 경우: todaySchedules에서 찾기
      for (const schedule of todaySchedules) {
        const startAt = new Date(schedule.startAt);
        const endAt = new Date(schedule.endAt);
        const tenMinutesBefore = new Date(startAt.getTime() - 10 * 60 * 1000);

        if (now >= tenMinutesBefore && now <= endAt) {
          return {
            id: schedule.id,
            title: schedule.title,
            startAt,
            endAt,
          };
        }
      }
      return null;
    },
    [currentGroup?.type, currentGroup?.hasClasses, members, todaySchedules]
  );

  // 출석 QR 모달 열기
  const openAttendanceQRModal = useCallback(
    async (member: GroupMember) => {
      const memberId = member.userId || member.user?.id || '';
      const nextSchedule = getMemberNextSchedule(memberId);
      if (!nextSchedule) {
        toast.error('현재 예정된 수업이 없습니다.');
        return;
      }

      // 1:1 수업인 경우 토큰 발급 API 호출
      if (currentGroup?.type === 'education' && !currentGroup?.hasClasses && groupId) {
        setAttendanceQRLoading(true);
        setAttendanceQRToken(null);
        setAttendanceQRMember(member);
        setAttendanceQRSchedule({
          id: nextSchedule.id,
          groupId: groupId,
          title: nextSchedule.title,
          startAt: nextSchedule.startAt.toISOString(),
          endAt: nextSchedule.endAt.toISOString(),
        } as any);
        setShowAttendanceQRModal(true);

        try {
          const response = await attendanceApi.generateLessonQRToken(groupId, memberId);
          setAttendanceQRToken(response.data);
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'QR 토큰 생성에 실패했습니다.');
        } finally {
          setAttendanceQRLoading(false);
        }
        return;
      }

      // 반 수업인 경우 todaySchedules에서 찾기
      const schedule = todaySchedules.find((s) => s.id === nextSchedule.id);
      if (schedule) {
        setAttendanceQRMember(member);
        setAttendanceQRSchedule(schedule);
        setShowAttendanceQRModal(true);
      }
    },
    [getMemberNextSchedule, currentGroup?.type, currentGroup?.hasClasses, groupId, todaySchedules, toast]
  );

  // 1:1 교육 그룹 여부
  const isOneOnOneEducation = currentGroup?.type === 'education' && !currentGroup?.hasClasses;

  // 멤버 탭에서 출석 기능이 활성화되어 있으면 오늘 일정 조회
  useEffect(() => {
    if (
      activeTab === 'members' &&
      groupId &&
      currentGroup?.type === 'education' &&
      currentGroup?.hasAttendance
    ) {
      fetchTodaySchedules();
    }
  }, [activeTab, groupId, currentGroup?.type, currentGroup?.hasAttendance, fetchTodaySchedules]);

  // 1:1 교육 그룹에서 수업 탭 표시를 위해 멤버 데이터 미리 로드
  useEffect(() => {
    if (groupId && isOneOnOneEducation && isAdmin && !loadedRef.current.members) {
      loadedRef.current.members = true;
      fetchMembers(groupId);
    }
  }, [groupId, isOneOnOneEducation, isAdmin, fetchMembers]);

  // 수업 시간 체크 주기적 갱신 (1분마다)
  useEffect(() => {
    if (!isOneOnOneEducation || !isAdmin) return;

    const interval = setInterval(() => {
      setLessonTimeCheck((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [isOneOnOneEducation, isAdmin]);

  // 수업 패널 열기 (1:1 교육용)
  const openLessonPanel = useCallback((member: GroupMember) => {
    setLessonPanelMember(member);
    setShowLessonPanel(true);
  }, []);

  // 조퇴 처리 (1:1 교육용)
  const handleEarlyLeave = useCallback(async (attendanceId: string) => {
    if (!groupId) return;
    try {
      await attendanceApi.markEarlyLeave(groupId, attendanceId);
      toast.success('조퇴 처리되었습니다.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '조퇴 처리에 실패했습니다.');
    }
  }, [groupId, toast]);

  // 현재 수업 중인 멤버 찾기 (1:1 교육 그룹용)
  const activeLessonMember = useMemo(() => {
    if (!isOneOnOneEducation || !isAdmin) return null;

    const now = new Date();
    const todayDayOfWeek = now.getDay();

    for (const member of members) {
      if (member.role === 'owner') continue;
      if (!member.lessonSchedule || member.lessonSchedule.length === 0) continue;

      for (const lesson of member.lessonSchedule) {
        if (lesson.dayOfWeek === todayDayOfWeek) {
          const [startHour, startMin] = lesson.startTime.split(':').map(Number);
          const [endHour, endMin] = lesson.endTime.split(':').map(Number);

          const startAt = new Date(now);
          startAt.setHours(startHour, startMin, 0, 0);

          const endAt = new Date(now);
          endAt.setHours(endHour, endMin, 0, 0);

          const tenMinutesBefore = new Date(startAt.getTime() - 10 * 60 * 1000);

          // 10분 전부터 수업 종료까지
          if (now >= tenMinutesBefore && now <= endAt) {
            return member;
          }
        }
      }
    }
    return null;
  }, [isOneOnOneEducation, isAdmin, members]);

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
    // 강사별 필터링 (다중 강사 모드)
    instructorFilter,
    setInstructorFilter,
    instructorSubGroups,
    // Invite code
    regeneratingCode,
    // Calendar
    homeCalendarDate,
    setHomeCalendarDate,
    selectedDate,
    // Locations
    favoriteLocations,
    // 1:1 수업 멤버 관리
    showAttendanceStats: currentGroup?.type === 'education' && !currentGroup?.hasClasses && currentGroup?.hasAttendance,
    memberAttendanceStats,
    // 1:1 수업 정보
    showLessonInfo: currentGroup?.type === 'education' && !currentGroup?.hasClasses,
    lessonSchedule,
    setLessonSchedule,
    paymentDueDay,
    setPaymentDueDay,
    lessonInfoLoading,
    handleSaveLessonInfo,
    // 레슨실 (1:1 교육용)
    lessonRooms,
    // 출석 QR
    showAttendanceQRModal,
    setShowAttendanceQRModal,
    attendanceQRMember,
    attendanceQRSchedule,
    attendanceQRToken,
    attendanceQRLoading,
    openAttendanceQRModal,
    getMemberNextSchedule,
    // 수업 패널 (1:1 교육용)
    showLessonPanel,
    setShowLessonPanel,
    lessonPanelMember,
    openLessonPanel,
    handleEarlyLeave,
    isOneOnOneEducation,
    activeLessonMember,
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
