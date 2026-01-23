import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useGroupStore } from '@/store/groupStore';
import { scheduleApi, notificationApi, announcementApi } from '@/api';
import { useToast } from '@/components/common';
import { formatRelativeTime, formatScheduleDateTime, isToday, isSameDay } from '@/utils/dateFormat';
import { GROUP_TYPE_LABELS, MEMBER_ROLE_LABELS } from '@/constants/labels';
import type { Schedule, Notification, Announcement } from '@/types';
import './DashboardPage.scss';

const DashboardPage = () => {
  const { user } = useAuthStore();
  const { myGroups, myGroupsLoading, fetchMyGroups, joinGroup } = useGroupStore();
  const toast = useToast();

  const [inviteCode, setInviteCode] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  useEffect(() => {
    fetchMyGroups();
    fetchUpcomingSchedules();
    fetchRecentNotifications();
  }, [fetchMyGroups]);

  useEffect(() => {
    if (myGroups.length > 0) {
      fetchRecentAnnouncements();
    }
  }, [myGroups]);

  const fetchUpcomingSchedules = async () => {
    setSchedulesLoading(true);
    try {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const response = await scheduleApi.getMySchedules({
        startDate: today.toISOString(),
        endDate: nextMonth.toISOString(),
      });

      const sorted = response.data
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 5);

      setUpcomingSchedules(sorted);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const fetchRecentNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await notificationApi.getList({ limit: 5 });
      setRecentNotifications(response.data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchRecentAnnouncements = async () => {
    if (myGroups.length === 0) return;

    setAnnouncementsLoading(true);
    try {
      const response = await announcementApi.getByGroup(myGroups[0].id, { limit: 3 });
      setRecentAnnouncements(response.data);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      setJoinError('초대 코드를 입력해주세요');
      return;
    }

    setJoinLoading(true);
    setJoinError('');

    try {
      await joinGroup(inviteCode.trim());
      setShowInviteModal(false);
      setInviteCode('');
      toast.success('모임에 가입되었습니다!');
      fetchUpcomingSchedules();
    } catch {
      setJoinError('유효하지 않은 초대 코드입니다');
    } finally {
      setJoinLoading(false);
    }
  };

  const getScheduleDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (isToday(dateStr)) return '오늘';
    if (isSameDay(date, tomorrow)) return '내일';
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="dashboard">
      {/* 헤더 */}
      <header className="dashboard__header">
        <div className="dashboard__greeting">
          <h1 className="dashboard__title">
            안녕하세요, <span className="dashboard__name">{user?.name}</span>님!
          </h1>
          <p className="dashboard__subtitle">오늘도 좋은 하루 되세요 ✨</p>
        </div>
      </header>

      {/* 통계 카드 */}
      <section className="dashboard__stats">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">{myGroupsLoading ? '-' : myGroups.length}</span>
            <span className="stat-card__label">내 모임</span>
          </div>
          <Link to="/groups" className="stat-card__link">
            보기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__value">{schedulesLoading ? '-' : upcomingSchedules.length}</span>
            <span className="stat-card__label">예정 일정</span>
          </div>
        </div>

        <div className="stat-card stat-card--action">
          <div className="stat-card__icon stat-card__icon--warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">초대 코드로 가입</span>
          </div>
          <button className="stat-card__btn" onClick={() => setShowInviteModal(true)}>
            입력하기
          </button>
        </div>

        <Link to="/groups/create" className="stat-card stat-card--create">
          <div className="stat-card__icon stat-card__icon--accent">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">새 모임 만들기</span>
          </div>
        </Link>
      </section>

      {/* 메인 그리드 */}
      <div className="dashboard__grid">
        {/* 다가오는 일정 */}
        <section className="dashboard__card">
          <div className="dashboard__card-header">
            <h2 className="dashboard__card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              다가오는 일정
            </h2>
          </div>
          <div className="dashboard__card-body">
            {schedulesLoading ? (
              <div className="dashboard__loading">
                <div className="spinner" />
              </div>
            ) : upcomingSchedules.length === 0 ? (
              <div className="dashboard__empty">
                <p>예정된 일정이 없습니다</p>
              </div>
            ) : (
              <ul className="schedule-list">
                {upcomingSchedules.map((schedule) => (
                  <li key={schedule.id}>
                    <Link to={`/groups/${schedule.groupId}`} className="schedule-item">
                      <div
                        className="schedule-item__indicator"
                        style={{ backgroundColor: schedule.color || '#6366f1' }}
                      />
                      <div className="schedule-item__content">
                        <span className="schedule-item__title">{schedule.title}</span>
                        <span className="schedule-item__group">{schedule.group?.name}</span>
                      </div>
                      <div className="schedule-item__date">
                        <span className="schedule-item__day">{getScheduleDateLabel(schedule.startAt)}</span>
                        {!schedule.isAllDay && (
                          <span className="schedule-item__time">
                            {new Date(schedule.startAt).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 최근 알림 */}
        <section className="dashboard__card">
          <div className="dashboard__card-header">
            <h2 className="dashboard__card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              최근 알림
            </h2>
          </div>
          <div className="dashboard__card-body">
            {notificationsLoading ? (
              <div className="dashboard__loading">
                <div className="spinner" />
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="dashboard__empty">
                <p>새로운 알림이 없습니다</p>
              </div>
            ) : (
              <ul className="notification-list">
                {recentNotifications.map((notification) => (
                  <li key={notification.id} className={!notification.isRead ? 'unread' : ''}>
                    <div className="notification-item">
                      {!notification.isRead && <span className="notification-item__dot" />}
                      <div className="notification-item__content">
                        <p className="notification-item__title">{notification.title}</p>
                        {notification.message && (
                          <p className="notification-item__message">{notification.message}</p>
                        )}
                      </div>
                      <span className="notification-item__time">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* 내 모임 */}
      {myGroups.length > 0 && (
        <section className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">내 모임</h2>
            <Link to="/groups" className="dashboard__section-link">
              전체 보기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="group-grid">
            {myGroups.slice(0, 4).map((group) => (
              <Link key={group.id} to={`/groups/${group.id}`} className="group-card">
                <div className="group-card__avatar">
                  {group.logoImage ? (
                    <img src={group.logoImage} alt={group.name} />
                  ) : (
                    <span>{group.name.charAt(0)}</span>
                  )}
                </div>
                <div className="group-card__info">
                  <h3 className="group-card__name">{group.name}</h3>
                  <span className="group-card__type">{GROUP_TYPE_LABELS[group.type]}</span>
                </div>
                <span className="group-card__role">
                  {MEMBER_ROLE_LABELS[group.myRole || 'member']}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 최근 공지사항 */}
      {recentAnnouncements.length > 0 && (
        <section className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">최근 공지사항</h2>
            {myGroups.length > 0 && (
              <Link to={`/groups/${myGroups[0].id}`} className="dashboard__section-link">
                전체 보기
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
          <div className="announcement-list">
            {announcementsLoading ? (
              <div className="dashboard__loading">
                <div className="spinner" />
              </div>
            ) : (
              recentAnnouncements.map((announcement) => (
                <article key={announcement.id} className="announcement-card">
                  <div className="announcement-card__header">
                    {announcement.isPinned && (
                      <span className="announcement-card__pin">📌</span>
                    )}
                    <h3 className="announcement-card__title">{announcement.title}</h3>
                  </div>
                  <p className="announcement-card__content">
                    {announcement.content.length > 120
                      ? `${announcement.content.slice(0, 120)}...`
                      : announcement.content}
                  </p>
                  <span className="announcement-card__date">
                    {formatRelativeTime(announcement.createdAt)}
                  </span>
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {/* 초대 코드 모달 */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">초대 코드로 가입</h2>
              <button
                className="modal__close"
                onClick={() => setShowInviteModal(false)}
                aria-label="닫기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="modal__desc">모임 초대 코드를 입력해주세요</p>

            {joinError && <div className="modal__error">{joinError}</div>}

            <div className="modal__field">
              <input
                type="text"
                className="modal__input"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="초대 코드 입력 (예: ABC123)"
                maxLength={10}
                autoFocus
              />
            </div>

            <div className="modal__actions">
              <button
                type="button"
                className="modal__btn modal__btn--secondary"
                onClick={() => setShowInviteModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="modal__btn modal__btn--primary"
                onClick={handleJoinGroup}
                disabled={joinLoading || !inviteCode.trim()}
              >
                {joinLoading ? '가입 중...' : '가입하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
