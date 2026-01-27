import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useGroupStore } from '@/store/groupStore';
import { scheduleApi, notificationApi } from '@/api';
import { GROUP_TYPE_LABELS, MEMBER_ROLE_LABELS } from '@/constants/labels';
import { usersIcon, calendarIcon, bellIcon, trashIcon } from '@/assets';
import { getIconById } from '@/assets/icons';
import { useToast, Modal } from '@/components/common';
import type { Schedule, Notification } from '@/types';
import './DashboardPage.scss';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];
type TabType = 'schedule' | 'group' | 'notification';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 모임별 색상 팔레트
const GROUP_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { myGroups, myGroupsLoading, fetchMyGroups, leaveGroup, deleteGroup } = useGroupStore();

  // 탭
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

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
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; groupId: string; groupName: string; isOwner: boolean }>({
    isOpen: false,
    groupId: '',
    groupName: '',
    isOwner: false,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const year = activeStartDate.getFullYear();
  const month = activeStartDate.getMonth();

  // 초기 로드: 모임 목록 + 일정 (기본 탭)
  useEffect(() => {
    fetchMyGroups();
  }, [fetchMyGroups]);

  useEffect(() => {
    fetchMonthSchedules();
  }, [year, month]);

  // 탭별 lazy loading
  useEffect(() => {
    if (activeTab === 'notification' && !notificationsLoaded) {
      fetchNotifications();
      setNotificationsLoaded(true);
    }
  }, [activeTab, notificationsLoaded]);

  const fetchMonthSchedules = async () => {
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
  };

  const fetchNotifications = async () => {
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
  };

  // 알림 읽음 처리
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // 모임 탈퇴/삭제
  const handleGroupAction = async () => {
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
  };

  // 모임별 색상 매핑
  const groupColorMap = useMemo(() => {
    const map = new Map<string, string>();
    myGroups.forEach((group, index) => {
      map.set(group.id, GROUP_COLORS[index % GROUP_COLORS.length]);
    });
    return map;
  }, [myGroups]);

  // 일정 색상 가져오기 (일정 자체 색상 > 모임 색상 > 기본 색상)
  const getScheduleColor = (schedule: Schedule) => {
    if (schedule.color) return schedule.color;
    if (schedule.groupId && groupColorMap.has(schedule.groupId)) {
      return groupColorMap.get(schedule.groupId)!;
    }
    return '#3b82f6';
  };

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

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // 캘린더 타일에 일정 표시
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const dateKey = date.toISOString().split('T')[0];
    const daySchedules = schedulesByDate.get(dateKey) || [];

    if (daySchedules.length === 0) return null;

    // 중복 색상 제거 (같은 모임의 여러 일정은 하나의 점으로)
    const uniqueColors = [...new Set(daySchedules.map((s) => getScheduleColor(s)))];

    return (
      <div className="calendar-dots">
        {uniqueColors.slice(0, 4).map((color, index) => (
          <span
            key={index}
            className="calendar-dot"
            style={{ backgroundColor: color }}
          />
        ))}
        {uniqueColors.length > 4 && (
          <span className="calendar-dot-more">+{uniqueColors.length - 4}</span>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard">
      {/* 좌측: 캘린더 */}
      <div className="dashboard__left">
        <div className="calendar-wrapper">
          <Calendar
            onChange={setCurrentDate}
            value={currentDate}
            onActiveStartDateChange={({ activeStartDate }) =>
              activeStartDate && setActiveStartDate(activeStartDate)
            }
            tileContent={tileContent}
            locale="ko-KR"
            formatDay={(_locale, date) => date.getDate().toString()}
            calendarType="gregory"
            showNeighboringMonth={false}
            next2Label={null}
            prev2Label={null}
          />
        </div>

        {/* 선택된 날짜의 일정 */}
        <div className="calendar-detail">
          {selectedDate ? (
            <>
              <h3 className="calendar-detail__title">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 ({DAYS[selectedDate.getDay()]})
              </h3>
              {selectedDateSchedules.length === 0 ? (
                <p className="calendar-detail__empty">일정이 없습니다</p>
              ) : (
                <ul className="calendar-detail__list">
                  {selectedDateSchedules.map((schedule) => (
                    <li
                      key={schedule.id}
                      className="calendar-detail__item"
                      onClick={() => navigate(`/groups/${schedule.groupId}`)}
                    >
                      <span
                        className="calendar-detail__color"
                        style={{ backgroundColor: getScheduleColor(schedule) }}
                      />
                      <div className="calendar-detail__content">
                        <span className="calendar-detail__name">{schedule.title}</span>
                        <span className="calendar-detail__group">{schedule.group?.name}</span>
                      </div>
                      <span className="calendar-detail__time">
                        {schedule.isAllDay ? '종일' : formatTime(schedule.startAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="calendar-detail__empty">날짜를 선택하세요</p>
          )}
        </div>
      </div>

      {/* 우측: 탭 패널 */}
      <div className="dashboard__right">
        {/* 탭 헤더 */}
        <div className="dashboard__tabs">
          <button
            className={`dashboard__tab ${activeTab === 'schedule' ? 'dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <img src={calendarIcon} alt="" width="18" height="18" />
            <span>이번 달 일정</span>
            <span className="dashboard__tab-count">{schedulesLoading ? '-' : allSchedules.length}</span>
          </button>
          <button
            className={`dashboard__tab ${activeTab === 'group' ? 'dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            <img src={usersIcon} alt="" width="18" height="18" />
            <span>내 모임</span>
            <span className="dashboard__tab-count">{myGroupsLoading ? '-' : myGroups.length}</span>
          </button>
          <button
            className={`dashboard__tab ${activeTab === 'notification' ? 'dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('notification')}
          >
            <img src={bellIcon} alt="" width="18" height="18" />
            <span>알림</span>
            {unreadCount > 0 && <span className="dashboard__tab-badge">{unreadCount}</span>}
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="dashboard__panel">
          {/* 이번 달 일정 탭 */}
          {activeTab === 'schedule' && (
            <div className="panel-content">
              {schedulesLoading ? (
                <div className="panel-loading">
                  <div className="spinner" />
                </div>
              ) : allSchedules.length === 0 ? (
                <div className="panel-empty">
                  <p>이번 달 일정이 없습니다</p>
                </div>
              ) : (
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>일정</th>
                      <th>모임</th>
                      <th>시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSchedules
                      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                      .map((schedule) => (
                        <tr
                          key={schedule.id}
                          onClick={() => navigate(`/groups/${schedule.groupId}`)}
                        >
                          <td>
                            <span className="schedule-table__date">{formatDate(schedule.startAt)}</span>
                          </td>
                          <td>
                            <div className="schedule-table__title">
                              <span
                                className="schedule-table__color"
                                style={{ backgroundColor: getScheduleColor(schedule) }}
                              />
                              {schedule.title}
                            </div>
                          </td>
                          <td>
                            <span className="schedule-table__group">{schedule.group?.name}</span>
                          </td>
                          <td>
                            <span className="schedule-table__time">
                              {schedule.isAllDay ? '종일' : formatTime(schedule.startAt)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 내 모임 탭 */}
          {activeTab === 'group' && (
            <div className="panel-content">
              {myGroupsLoading ? (
                <div className="panel-loading">
                  <div className="spinner" />
                </div>
              ) : myGroups.length === 0 ? (
                <div className="panel-empty">
                  <p>가입한 모임이 없습니다</p>
                  <Link to="/groups/create" className="panel-empty__btn">
                    새 모임 만들기
                  </Link>
                </div>
              ) : (
                <table className="group-table">
                  <thead>
                    <tr>
                      <th>모임</th>
                      <th>유형</th>
                      <th>역할</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {myGroups.map((group) => (
                      <tr key={group.id}>
                        <td>
                          <Link to={`/groups/${group.id}`} className="group-table__info">
                            <div
                              className="group-table__avatar"
                              style={group.color && group.color !== 'transparent' ? { background: group.color } : undefined}
                            >
                              {group.logoImage ? (
                                <img src={group.logoImage} alt={group.name} />
                              ) : group.icon && getIconById(group.icon) ? (
                                <img src={getIconById(group.icon)} alt="" className="group-table__icon" />
                              ) : (
                                <span>{group.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="group-table__name">{group.name}</span>
                          </Link>
                        </td>
                        <td>
                          <span className="group-table__type">{GROUP_TYPE_LABELS[group.type]}</span>
                        </td>
                        <td>
                          <span className={`group-table__role group-table__role--${group.myRole}`}>
                            {MEMBER_ROLE_LABELS[group.myRole || 'member']}
                          </span>
                        </td>
                        <td>
                          <button
                            className="group-table__delete"
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                groupId: group.id,
                                groupName: group.name,
                                isOwner: group.myRole === 'owner',
                              })
                            }
                            title={group.myRole === 'owner' ? '모임 삭제' : '모임 탈퇴'}
                          >
                            <img src={trashIcon} alt={group.myRole === 'owner' ? '삭제' : '탈퇴'} width="16" height="16" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 알림 탭 */}
          {activeTab === 'notification' && (
            <div className="panel-content">
              {notificationsLoading ? (
                <div className="panel-loading">
                  <div className="spinner" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="panel-empty">
                  <p>알림이 없습니다</p>
                </div>
              ) : (
                <table className="notification-table">
                  <thead>
                    <tr>
                      <th>상태</th>
                      <th>알림</th>
                      <th>시간</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((notification) => (
                      <tr
                        key={notification.id}
                        className={notification.isRead ? '' : 'notification-table__row--unread'}
                      >
                        <td>
                          <span
                            className={`notification-table__status ${
                              notification.isRead ? 'notification-table__status--read' : ''
                            }`}
                          />
                        </td>
                        <td>
                          <div className="notification-table__content">
                            <span className="notification-table__title">{notification.title}</span>
                            {notification.message && (
                              <span className="notification-table__message">{notification.message}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="notification-table__time">
                            {formatDateTime(notification.createdAt)}
                          </span>
                        </td>
                        <td>
                          {!notification.isRead && (
                            <button
                              className="notification-table__read-btn"
                              onClick={() => handleMarkAsRead(notification.id)}
                              title="읽음 처리"
                            >
                              확인
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 탈퇴/삭제 확인 모달 */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, groupId: '', groupName: '', isOwner: false })}
        title={deleteModal.isOwner ? '모임 삭제' : '모임 탈퇴'}
        description={`${deleteModal.groupName} 모임을 ${deleteModal.isOwner ? '삭제' : '탈퇴'}하시겠습니까?\n${deleteModal.isOwner ? '삭제 후에는 모든 멤버가 모임에 접근할 수 없으며 복구할 수 없습니다.' : '탈퇴 후에는 모임의 일정과 공지사항을 확인할 수 없습니다.'}`}
        showCloseButton
        size="sm"
        actions={
          <>
            <button
              className="modal__cancel"
              onClick={() => setDeleteModal({ isOpen: false, groupId: '', groupName: '', isOwner: false })}
            >
              취소
            </button>
            <button
              className="modal__submit modal__submit--danger"
              onClick={handleGroupAction}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? (deleteModal.isOwner ? '삭제 중...' : '탈퇴 중...')
                : (deleteModal.isOwner ? '삭제' : '탈퇴')}
            </button>
          </>
        }
      />
    </div>
  );
};

export default DashboardPage;
