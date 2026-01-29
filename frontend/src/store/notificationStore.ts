import { create } from 'zustand';
import { notificationApi } from '@/api';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  currentOffset: number;

  // Actions
  fetchNotifications: (params?: { limit?: number; offset?: number; unreadOnly?: boolean; refresh?: boolean }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;

  // 새 알림 추가 (푸시용)
  addNotification: (notification: Notification) => void;

  // 초기화
  reset: () => void;
}

const LIMIT = 20;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  hasMore: true,
  currentOffset: 0,

  fetchNotifications: async ({ limit = LIMIT, offset = 0, unreadOnly = false, refresh = false } = {}) => {
    set({ loading: true });
    try {
      const response = await notificationApi.getList({ limit, offset, unreadOnly });
      const newNotifications = response.data.notifications;

      set((state) => ({
        notifications: refresh || offset === 0
          ? newNotifications
          : [...state.notifications, ...newNotifications],
        unreadCount: response.data.unreadCount,
        loading: false,
        hasMore: newNotifications.length === limit,
        currentOffset: offset + newNotifications.length,
      }));
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  loadMore: async () => {
    const { hasMore, loading, currentOffset } = get();
    if (!hasMore || loading) return;

    await get().fetchNotifications({ offset: currentOffset });
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      set({ unreadCount: response.data.unreadCount });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  markAsRead: async (notificationId: string) => {
    const notification = get().notifications.find(n => n.id === notificationId);
    if (notification?.isRead) return; // 이미 읽은 경우 skip

    await notificationApi.markAsRead(notificationId);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await notificationApi.markAllAsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString()
      })),
      unreadCount: 0,
    }));
  },

  deleteNotification: async (notificationId: string) => {
    const notification = get().notifications.find(n => n.id === notificationId);
    await notificationApi.delete(notificationId);
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      unreadCount: notification && !notification.isRead
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));
  },

  deleteAllNotifications: async () => {
    await notificationApi.deleteAll();
    set({
      notifications: [],
      unreadCount: 0,
      hasMore: false,
      currentOffset: 0,
    });
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      hasMore: true,
      currentOffset: 0,
    });
  },
}));
