import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { notificationApi } from '@/api';
import type { Notification } from '@/types';
import './Header.scss';

const Header = () => {
  const { user, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 알림 데이터 로드
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationApi.getList({ limit: 10 });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // 읽지 않은 알림 개수만 로드 (polling용)
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // 컴포넌트 마운트시 및 주기적으로 알림 개수 체크
  useEffect(() => {
    fetchUnreadCount();

    // 30초마다 알림 개수 체크
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // 드롭다운 열 때 알림 목록 로드
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 알림 읽음 처리
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
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
                {unreadCount > 0 && (
                  <button
                    className="header__notification-mark-all"
                    onClick={handleMarkAllAsRead}
                  >
                    모두 읽음
                  </button>
                )}
              </div>

              <div className="header__notification-list">
                {loading ? (
                  <div className="header__notification-loading">로딩 중...</div>
                ) : notifications.length === 0 ? (
                  <div className="header__notification-empty">
                    알림이 없습니다
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`header__notification-item ${!notification.isRead ? 'unread' : ''}`}
                      onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                    >
                      <div className="header__notification-content">
                        <p className="header__notification-title">
                          {notification.title}
                        </p>
                        <p className="header__notification-message">
                          {notification.message}
                        </p>
                        <span className="header__notification-time">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      {!notification.isRead && (
                        <span className="header__notification-dot" />
                      )}
                    </div>
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
