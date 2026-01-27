import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { usersIcon, calendarIcon, bellIcon } from '@/assets';
import { Modal } from '@/components/common';
import { useDashboard } from './hooks';
import { SchedulePanel, GroupPanel, NotificationPanel, formatTime } from './components';
import type { Schedule } from '@/types';
import './DashboardPage.scss';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const DashboardPage = () => {
  const {
    activeTab,
    setActiveTab,
    currentDate,
    setCurrentDate,
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
    handleMarkAsRead,
    handleGroupAction,
    openDeleteModal,
    closeDeleteModal,
    getScheduleColor,
    navigateToGroup,
  } = useDashboard();

  // 캘린더 타일에 일정 표시
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const dateKey = date.toISOString().split('T')[0];
    const daySchedules = schedulesByDate.get(dateKey) || [];

    if (daySchedules.length === 0) return null;

    const uniqueColors = [...new Set(daySchedules.map((s) => getScheduleColor(s)))];

    return (
      <div className="calendar-dots">
        {uniqueColors.slice(0, 4).map((color, index) => (
          <span key={index} className="calendar-dot" style={{ backgroundColor: color }} />
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
        <CalendarDetail
          selectedDate={selectedDate}
          schedules={selectedDateSchedules}
          getScheduleColor={getScheduleColor}
          onScheduleClick={navigateToGroup}
        />
      </div>

      {/* 우측: 탭 패널 */}
      <div className="dashboard__right">
        {/* 탭 헤더 */}
        <DashboardTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          schedulesCount={allSchedules.length}
          schedulesLoading={schedulesLoading}
          groupsCount={myGroups.length}
          groupsLoading={myGroupsLoading}
          unreadCount={unreadCount}
        />

        {/* 탭 콘텐츠 */}
        <div className="dashboard__panel">
          {activeTab === 'schedule' && (
            <div className="panel-content">
              <SchedulePanel
                schedules={allSchedules}
                loading={schedulesLoading}
                getScheduleColor={getScheduleColor}
                onScheduleClick={navigateToGroup}
              />
            </div>
          )}

          {activeTab === 'group' && (
            <div className="panel-content">
              <GroupPanel
                groups={myGroups}
                loading={myGroupsLoading}
                onDeleteClick={openDeleteModal}
              />
            </div>
          )}

          {activeTab === 'notification' && (
            <div className="panel-content">
              <NotificationPanel
                notifications={notifications}
                loading={notificationsLoading}
                onMarkAsRead={handleMarkAsRead}
              />
            </div>
          )}
        </div>
      </div>

      {/* 탈퇴/삭제 확인 모달 */}
      <DeleteGroupModal
        isOpen={deleteModal.isOpen}
        groupName={deleteModal.groupName}
        isOwner={deleteModal.isOwner}
        loading={deleteLoading}
        onConfirm={handleGroupAction}
        onClose={closeDeleteModal}
      />
    </div>
  );
};

// ==================== 서브 컴포넌트 ====================

interface CalendarDetailProps {
  selectedDate: Date | null;
  schedules: Schedule[];
  getScheduleColor: (schedule: Schedule) => string;
  onScheduleClick: (groupId: string) => void;
}

const CalendarDetail = ({ selectedDate, schedules, getScheduleColor, onScheduleClick }: CalendarDetailProps) => {
  if (!selectedDate) {
    return (
      <div className="calendar-detail">
        <p className="calendar-detail__empty">날짜를 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="calendar-detail">
      <h3 className="calendar-detail__title">
        {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 ({DAYS[selectedDate.getDay()]})
      </h3>
      {schedules.length === 0 ? (
        <p className="calendar-detail__empty">일정이 없습니다</p>
      ) : (
        <ul className="calendar-detail__list">
          {schedules.map((schedule) => (
            <li
              key={schedule.id}
              className="calendar-detail__item"
              onClick={() => onScheduleClick(schedule.groupId)}
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
    </div>
  );
};

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: 'schedule' | 'group' | 'notification') => void;
  schedulesCount: number;
  schedulesLoading: boolean;
  groupsCount: number;
  groupsLoading: boolean;
  unreadCount: number;
}

const DashboardTabs = ({
  activeTab,
  onTabChange,
  schedulesCount,
  schedulesLoading,
  groupsCount,
  groupsLoading,
  unreadCount,
}: DashboardTabsProps) => (
  <div className="dashboard__tabs">
    <button
      className={`dashboard__tab ${activeTab === 'schedule' ? 'dashboard__tab--active' : ''}`}
      onClick={() => onTabChange('schedule')}
    >
      <img src={calendarIcon} alt="" width="18" height="18" />
      <span>이번 달 일정</span>
      <span className="dashboard__tab-count">{schedulesLoading ? '-' : schedulesCount}</span>
    </button>
    <button
      className={`dashboard__tab ${activeTab === 'group' ? 'dashboard__tab--active' : ''}`}
      onClick={() => onTabChange('group')}
    >
      <img src={usersIcon} alt="" width="18" height="18" />
      <span>내 모임</span>
      <span className="dashboard__tab-count">{groupsLoading ? '-' : groupsCount}</span>
    </button>
    <button
      className={`dashboard__tab ${activeTab === 'notification' ? 'dashboard__tab--active' : ''}`}
      onClick={() => onTabChange('notification')}
    >
      <img src={bellIcon} alt="" width="18" height="18" />
      <span>알림</span>
      {unreadCount > 0 && <span className="dashboard__tab-badge">{unreadCount}</span>}
    </button>
  </div>
);

interface DeleteGroupModalProps {
  isOpen: boolean;
  groupName: string;
  isOwner: boolean;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteGroupModal = ({ isOpen, groupName, isOwner, loading, onConfirm, onClose }: DeleteGroupModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={isOwner ? '모임 삭제' : '모임 탈퇴'}
    description={`${groupName} 모임을 ${isOwner ? '삭제' : '탈퇴'}하시겠습니까?\n${
      isOwner
        ? '삭제 후에는 모든 멤버가 모임에 접근할 수 없으며 복구할 수 없습니다.'
        : '탈퇴 후에는 모임의 일정과 공지사항을 확인할 수 없습니다.'
    }`}
    showCloseButton
    size="sm"
    actions={
      <>
        <button className="modal__cancel" onClick={onClose}>
          취소
        </button>
        <button
          className="modal__submit modal__submit--danger"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (isOwner ? '삭제 중...' : '탈퇴 중...') : isOwner ? '삭제' : '탈퇴'}
        </button>
      </>
    }
  />
);

export default DashboardPage;
