import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { Notification, NotificationType } from '@/types';
import './Header.scss';

// 알림 타입별 아이콘 및 색상
const getNotificationIcon = (type: NotificationType): { icon: string; color: string } => {
  switch (type) {
    case 'member_join_request':
    case 'member_approved':
    case 'member_rejected':
    case 'member_joined':
    case 'member_left':
    case 'member_removed':
      return { icon: '👤', color: '#3b82f6' };
    case 'role_changed':
      return { icon: '🎖️', color: '#8b5cf6' };
    case 'subgroup_request':
    case 'subgroup_approved':
    case 'subgroup_rejected':
    case 'subgroup_created_notify':
      return { icon: '👥', color: '#10b981' };
    case 'schedule_created':
    case 'schedule_updated':
    case 'schedule_cancelled':
    case 'schedule_reminder':
    case 'new_schedule':
      return { icon: '📅', color: '#f59e0b' };
    case 'schedule_change_request':
    case 'schedule_change_approved':
    case 'schedule_change_rejected':
      return { icon: '🔄', color: '#06b6d4' };
    case 'absence_request':
    case 'absence_approved':
    case 'absence_rejected':
      return { icon: '🚫', color: '#ef4444' };
    case 'reservation_created':
    case 'reservation_cancelled':
    case 'reservation_reminder':
      return { icon: '🏠', color: '#84cc16' };
    case 'announcement_new':
    case 'new_announcement':
      return { icon: '📢', color: '#ec4899' };
    case 'group_settings_updated':
      return { icon: '⚙️', color: '#6b7280' };
    default:
      return { icon: '🔔', color: '#6b7280' };
  }
};

// 시간 포맷
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
};

// 알림 아이템 컴포넌트
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
}

const NotificationItem = ({ notification, onMarkAsRead, onDelete, onClick }: NotificationItemProps) => {
  const { icon, color } = getNotificationIcon(notification.type);
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    onClick(notification);
  };

  return (
    <div
      className={`header__notification-item ${!notification.isRead ? 'unread' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="header__notification-item-main" onClick={handleClick}>
        <div className="header__notification-icon" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <div className="header__notification-content">
          <p className="header__notification-title">{notification.title}</p>
          {notification.message && (
            <p className="header__notification-message">{notification.message}</p>
          )}
          <div className="header__notification-meta">
            <span className="header__notification-time">{formatTime(notification.createdAt)}</span>
            {notification.group && (
              <span className="header__notification-group">{notification.group.name}</span>
            )}
          </div>
        </div>
        {!notification.isRead && <span className="header__notification-dot" />}
      </div>
      {showActions && (
        <div className="header__notification-actions">
          <button
            className="header__notification-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            title="삭제"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const { user, logout } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotificationStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 마운트시 및 주기적으로 알림 개수 체크
  useEffect(() => {
    fetchUnreadCount();

    // 30초마다 알림 개수 체크
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // 드롭다운 열 때 알림 목록 로드
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications({ refresh: true });
    }
  }, [showNotifications, fetchNotifications]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 알림 클릭 시 관련 페이지로 이동
  const handleNotificationClick = (notification: Notification) => {
    setShowNotifications(false);

    // data에 링크 정보가 있으면 해당 링크로 이동
    if (notification.data?.link) {
      navigate(notification.data.link as string);
      return;
    }

    // 그룹 관련 알림이면 해당 그룹으로 이동
    if (notification.groupId) {
      navigate(`/groups/${notification.groupId}`);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllNotifications();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="header">
      <div className="header__left">
        <Link to="/dashboard" className="header__logo">
          Cubby
        </Link>
      </div>

      <div className="header__right">
        {/* 알림 버튼 */}
        <div className="header__notification" ref={dropdownRef}>
          <button
            className="header__notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="알림"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="header__notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* 알림 드롭다운 */}
          {showNotifications && (
            <div className="header__notification-dropdown">
              <div className="header__notification-header">
                <h3>알림</h3>
                <div className="header__notification-header-actions">
                  {unreadCount > 0 && (
                    <button
                      className="header__notification-header-btn"
                      onClick={handleMarkAllAsRead}
                    >
                      모두 읽음
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      className="header__notification-header-btn header__notification-header-btn--delete"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      전체 삭제
                    </button>
                  )}
                </div>
              </div>

              {showDeleteConfirm && (
                <div className="header__notification-confirm">
                  <p>모든 알림을 삭제하시겠습니까?</p>
                  <div className="header__notification-confirm-actions">
                    <button onClick={() => setShowDeleteConfirm(false)}>취소</button>
                    <button className="delete" onClick={handleDeleteAll}>삭제</button>
                  </div>
                </div>
              )}

              <div className="header__notification-list">
                {loading ? (
                  <div className="header__notification-loading">로딩 중...</div>
                ) : notifications.length === 0 ? (
                  <div className="header__notification-empty">
                    <span className="header__notification-empty-icon">🔔</span>
                    <p>알림이 없습니다</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                      onClick={handleNotificationClick}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <span className="header__user-name">{user?.name}</span>
        <button className="header__logout-btn" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
};

export default Header;
