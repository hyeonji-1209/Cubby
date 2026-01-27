import { Link } from 'react-router-dom';
import { GROUP_TYPE_LABELS, MEMBER_ROLE_LABELS } from '@/constants/labels';
import { trashIcon } from '@/assets';
import { getIconById } from '@/assets/icons';
import { formatTime, formatDate, formatDateTime } from '../utils';
import type { Schedule, Notification, Group, GroupType, MemberRole } from '@/types';

// 일정 탭 패널
interface SchedulePanelProps {
  schedules: Schedule[];
  loading: boolean;
  getScheduleColor: (schedule: Schedule) => string;
  onScheduleClick: (groupId: string) => void;
}

export const SchedulePanel = ({ schedules, loading, getScheduleColor, onScheduleClick }: SchedulePanelProps) => {
  if (loading) {
    return (
      <div className="panel-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="panel-empty">
        <p>이번 달 일정이 없습니다</p>
      </div>
    );
  }

  const sortedSchedules = [...schedules].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  return (
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
        {sortedSchedules.map((schedule) => (
          <tr key={schedule.id} onClick={() => onScheduleClick(schedule.groupId)}>
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
  );
};

// 모임 탭 패널
interface GroupPanelProps {
  groups: Group[];
  loading: boolean;
  onDeleteClick: (groupId: string, groupName: string, isOwner: boolean) => void;
}

export const GroupPanel = ({ groups, loading, onDeleteClick }: GroupPanelProps) => {
  if (loading) {
    return (
      <div className="panel-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="panel-empty">
        <p>가입한 모임이 없습니다</p>
        <Link to="/groups/create" className="panel-empty__btn">
          새 모임 만들기
        </Link>
      </div>
    );
  }

  return (
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
        {groups.filter((group) => group.id).map((group) => (
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
                    <span>{group.name?.charAt(0) || '?'}</span>
                  )}
                </div>
                <span className="group-table__name">{group.name}</span>
              </Link>
            </td>
            <td>
              <span className="group-table__type">{GROUP_TYPE_LABELS[group.type as GroupType]}</span>
            </td>
            <td>
              <span className={`group-table__role group-table__role--${group.myRole}`}>
                {MEMBER_ROLE_LABELS[(group.myRole || 'member') as MemberRole]}
              </span>
            </td>
            <td>
              <button
                className="group-table__delete"
                onClick={() => onDeleteClick(group.id, group.name, group.myRole === 'owner')}
                title={group.myRole === 'owner' ? '모임 삭제' : '모임 탈퇴'}
              >
                <img src={trashIcon} alt={group.myRole === 'owner' ? '삭제' : '탈퇴'} width="16" height="16" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// 알림 탭 패널
interface NotificationPanelProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
}

export const NotificationPanel = ({ notifications, loading, onMarkAsRead }: NotificationPanelProps) => {
  if (loading) {
    return (
      <div className="panel-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="panel-empty">
        <p>알림이 없습니다</p>
      </div>
    );
  }

  return (
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
                  onClick={() => onMarkAsRead(notification.id)}
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
  );
};
