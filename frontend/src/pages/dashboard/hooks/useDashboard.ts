import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { scheduleApi, notificationApi } from '@/api';
import { useToast } from '@/components/common';
import type { Schedule, Notification } from '@/types';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];
export type DashboardTabType = 'schedule' | 'group' | 'notification';

// 모임별 색상 팔레트
const GROUP_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface DeleteModalState {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

export const useDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { myGroups, myGroupsLoading, fetchMyGroups, leaveGroup, deleteGroup } = useGroupStore();

  // 탭
  const [activeTab, setActiveTab] = useState<DashboardTabType>('schedule');

  // 캘린더
  const [currentDate, setCurrentDate] = useState<Value>(new Date());
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // 알림
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  // 모달
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    groupId: '',
    groupName: '',
    isOwner: false,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const year = activeStartDate.getFullYear();
  const month = activeStartDate.getMonth();

  // 일정 조회
  const fetchMonthSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const response = await scheduleApi.getMySchedules({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      setAllSchedules(response.data);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setSchedulesLoading(false);
    }
  }, [year, month]);

  // 알림 조회
  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const response = await notificationApi.getList({ limit: 50 });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchMyGroups();
  }, [fetchMyGroups]);

  useEffect(() => {
    fetchMonthSchedules();
  }, [fetchMonthSchedules]);

  // 탭별 lazy loading
  useEffect(() => {
    if (activeTab === 'notification' && !notificationsLoaded) {
      fetchNotifications();
      setNotificationsLoaded(true);
    }
  }, [activeTab, notificationsLoaded, fetchNotifications]);

  // 알림 읽음 처리
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // 모임 탈퇴/삭제
  const handleGroupAction = useCallback(async () => {
    if (!deleteModal.groupId) return;

    setDeleteLoading(true);
    try {
      if (deleteModal.isOwner) {
        await deleteGroup(deleteModal.groupId);
        toast.success('모임이 삭제되었습니다');
      } else {
        await leaveGroup(deleteModal.groupId);
        toast.success('모임에서 탈퇴했습니다');
      }
      setDeleteModal({ isOpen: false, groupId: '', groupName: '', isOwner: false });
    } catch {
      toast.error(deleteModal.isOwner ? '모임 삭제에 실패했습니다' : '모임 탈퇴에 실패했습니다');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteModal, deleteGroup, leaveGroup, toast]);

  const openDeleteModal = useCallback((groupId: string, groupName: string, isOwner: boolean) => {
    setDeleteModal({ isOpen: true, groupId, groupName, isOwner });
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({ isOpen: false, groupId: '', groupName: '', isOwner: false });
  }, []);

  // 모임별 색상 매핑
  const groupColorMap = useMemo(() => {
    const map = new Map<string, string>();
    myGroups.forEach((group, index) => {
      map.set(group.id, GROUP_COLORS[index % GROUP_COLORS.length]);
    });
    return map;
  }, [myGroups]);

  // 일정 색상 가져오기
  const getScheduleColor = useCallback((schedule: Schedule) => {
    if (schedule.color) return schedule.color;
    if (schedule.groupId && groupColorMap.has(schedule.groupId)) {
      return groupColorMap.get(schedule.groupId)!;
    }
    return '#3b82f6';
  }, [groupColorMap]);

  // 날짜별 일정 매핑
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();

    allSchedules.forEach((schedule) => {
      const startDate = new Date(schedule.startAt);
      const endDate = new Date(schedule.endAt);
      const currentDate = new Date(startDate);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(schedule);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return map;
  }, [allSchedules]);

  // 선택된 날짜의 일정
  const selectedDateSchedules = useMemo(() => {
    if (!currentDate || Array.isArray(currentDate)) return [];
    const dateKey = currentDate.toISOString().split('T')[0];
    return schedulesByDate.get(dateKey) || [];
  }, [currentDate, schedulesByDate]);

  const selectedDate = currentDate instanceof Date ? currentDate : null;

  const navigateToGroup = useCallback((groupId: string) => {
    navigate(`/groups/${groupId}`);
  }, [navigate]);

  return {
    // 상태
    activeTab,
    setActiveTab,
    currentDate,
    setCurrentDate,
    activeStartDate,
    setActiveStartDate,
    allSchedules,
    schedulesLoading,
    notifications,
    notificationsLoading,
    unreadCount,
    myGroups,
    myGroupsLoading,
    deleteModal,
    deleteLoading,
    selectedDate,
    selectedDateSchedules,
    schedulesByDate,

    // 액션
    handleMarkAsRead,
    handleGroupAction,
    openDeleteModal,
    closeDeleteModal,
    getScheduleColor,
    navigateToGroup,
  };
};
