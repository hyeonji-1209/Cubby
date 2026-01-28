import { useEffect, useMemo, useState } from 'react';
import ReactCalendar from 'react-calendar';
import { useGroupDetailStore } from '@/store';
import { lessonRecordApi } from '@/api';
import type { StudentLessonRecord } from '@/api';
import { formatDate } from '@/utils/dateFormat';
import { isHoliday, getHolidayName } from '@/utils/holidays';
import { ATTENDANCE_STATUS_LABELS } from '@/constants/labels';
import type { HomeTabProps } from './types';
import type { Announcement, Schedule, Attendance } from '@/types';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const HomeTab: React.FC<HomeTabProps> = ({
  groupId,
  currentGroup,
  isOwner,
  isAdmin,
  homeCalendarDate,
  setHomeCalendarDate,
  selectedDate,
  regeneratingCode,
  onCopyInviteCode,
  onRegenerateInviteCode,
  onNavigateToTab,
  formatExpiryDate,
  isInviteCodeExpired,
  hasAttendance,
}) => {
  const {
    announcements,
    announcementsLoading,
    schedules,
    myAttendanceMap,
    fetchAnnouncements,
    fetchSchedules,
    fetchMyAttendances,
    selectAnnouncement,
  } = useGroupDetailStore();

  // 학생용 수업 기록 (1:1 교육 그룹에서 학생인 경우)
  const [myLessons, setMyLessons] = useState<StudentLessonRecord[]>([]);
  const [myAttendanceList, setMyAttendanceList] = useState<Attendance[]>([]);
  const [myLessonsLoading, setMyLessonsLoading] = useState(false);

  // 1:1 교육 그룹인지 확인
  const isOneOnOneEducation = currentGroup.type === 'education' && !currentGroup.hasClasses;
  const showMyLessons = isOneOnOneEducation && !isAdmin;

  useEffect(() => {
    if (groupId) {
      if (announcements.length === 0) fetchAnnouncements(groupId);
      if (schedules.length === 0) fetchSchedules(groupId);
    }
  }, [groupId, announcements.length, schedules.length, fetchAnnouncements, fetchSchedules]);

  // 출석 기능이 활성화된 경우 내 출석 기록 로드
  useEffect(() => {
    if (groupId && hasAttendance) {
      fetchMyAttendances(groupId);
    }
  }, [groupId, hasAttendance, fetchMyAttendances]);

  // 1:1 교육 그룹에서 학생인 경우 내 수업 기록 로드
  useEffect(() => {
    const fetchMyLessons = async () => {
      if (!groupId || !showMyLessons) return;
      setMyLessonsLoading(true);
      try {
        const response = await lessonRecordApi.getMyLessons(groupId, { limit: 10 });
        if (response.success && response.data) {
          setMyLessons(response.data.items);
          setMyAttendanceList(response.data.attendanceList);
        }
      } catch (error) {
        console.error('Failed to fetch my lessons:', error);
      } finally {
        setMyLessonsLoading(false);
      }
    };
    fetchMyLessons();
  }, [groupId, showMyLessons]);

  // 출석 상태에 따른 뱃지 표시
  const getAttendanceBadge = (scheduleId: string) => {
    if (!hasAttendance) return null;
    const status = myAttendanceMap[scheduleId];
    if (!status) return null;

    const badges: Record<string, { text: string; className: string }> = {
      present: { text: '출석', className: 'badge--present' },
      late: { text: '지각', className: 'badge--late' },
      absent: { text: '결석', className: 'badge--absent' },
      excused: { text: '사유', className: 'badge--excused' },
    };
    const badge = badges[status];
    return badge ? (
      <span className={`attendance-badge ${badge.className}`}>{badge.text}</span>
    ) : null;
  };

  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return [];
    return schedules.filter((schedule) => {
      const startDate = new Date(schedule.startAt);
      const endDate = new Date(schedule.endAt);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return selectedDate >= startDate && selectedDate <= endDate;
    });
  }, [selectedDate, schedules]);

  // 날짜별 일정 매핑 (캘린더 타일용)
  const getSchedulesForDate = (date: Date): Schedule[] => {
    return schedules.filter((schedule) => {
      const startDate = new Date(schedule.startAt);
      const endDate = new Date(schedule.endAt);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return date >= startDate && date <= endDate;
    });
  };

  const homeTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const daySchedules = getSchedulesForDate(date);
    if (daySchedules.length === 0) return null;

    return (
      <div className="calendar-dots">
        {daySchedules.slice(0, 3).map((schedule, idx) => (
          <span
            key={idx}
            className="calendar-dot"
            style={{ backgroundColor: schedule.color || '#3b82f6' }}
          />
        ))}
      </div>
    );
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return '';
    const classes: string[] = [];
    if (isHoliday(date)) classes.push('holiday');
    if (date.getDay() === 0) classes.push('sunday');
    if (date.getDay() === 6) classes.push('saturday');
    return classes.join(' ');
  };

  const handleSelectAnnouncement = async (announcement: Announcement) => {
    onNavigateToTab('announcements');
    await selectAnnouncement(announcement);
  };

  return (
    <div className="group-detail__home">
      {isOwner && (
        <div className={`group-detail__invite-box ${isInviteCodeExpired() ? 'group-detail__invite-box--expired' : ''}`}>
          <div className="group-detail__invite-header">
            <h3>초대 코드</h3>
            <span className={`group-detail__invite-expiry ${isInviteCodeExpired() ? 'expired' : ''}`}>
              {formatExpiryDate(currentGroup.inviteCodeExpiresAt)}
            </span>
          </div>
          <div className="group-detail__invite-code">
            <code className={isInviteCodeExpired() ? 'expired' : ''}>{currentGroup.inviteCode}</code>
            <button onClick={onCopyInviteCode} disabled={isInviteCodeExpired()}>복사</button>
            <button
              className="regenerate"
              onClick={onRegenerateInviteCode}
              disabled={regeneratingCode}
            >
              {regeneratingCode ? '생성 중...' : '재생성'}
            </button>
          </div>
          <p>
            {isInviteCodeExpired()
              ? '초대 코드가 만료되었습니다. 새 코드를 생성해주세요.'
              : '이 코드를 공유하여 새 멤버를 초대하세요'}
          </p>
        </div>
      )}

      <div className="group-detail__home-grid">
        {/* 왼쪽: 캘린더 + 선택 날짜 일정 */}
        <div className="group-detail__home-left">
          <div className="group-detail__home-calendar">
            <ReactCalendar
              onChange={setHomeCalendarDate}
              value={homeCalendarDate}
              tileContent={homeTileContent}
              tileClassName={tileClassName}
              locale="ko-KR"
              formatDay={(_locale, date) => date.getDate().toString()}
              calendarType="gregory"
              showNeighboringMonth={false}
              next2Label={null}
              prev2Label={null}
            />
          </div>
          <div className="group-detail__home-day">
            <div className="group-detail__home-day-header">
              <span className="date">
                {selectedDate
                  ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${DAYS[selectedDate.getDay()]})`
                  : '날짜를 선택하세요'}
                {selectedDate && getHolidayName(selectedDate) && (
                  <span className="holiday-name">{getHolidayName(selectedDate)}</span>
                )}
              </span>
              <button className="group-detail__home-more" onClick={() => onNavigateToTab('schedules')}>
                전체 일정
              </button>
            </div>
            {selectedDateSchedules.length === 0 ? (
              <p className="group-detail__home-empty">일정이 없습니다</p>
            ) : (
              <ul className="group-detail__home-schedule-list">
                {selectedDateSchedules.map((schedule) => (
                  <li
                    key={schedule.id}
                    className={`group-detail__home-schedule-item ${myAttendanceMap[schedule.id] ? 'attended' : ''}`}
                  >
                    <span className="color" style={{ backgroundColor: schedule.color || '#3b82f6' }} />
                    <span className="title">{schedule.title}</span>
                    {getAttendanceBadge(schedule.id)}
                    <span className="time">
                      {schedule.isAllDay
                        ? '종일'
                        : new Date(schedule.startAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 오른쪽: 공지사항 (1:1 교육 학생이면 수업 기록) */}
        <div className="group-detail__home-right">
          {showMyLessons ? (
            <>
              {/* 학생용 수업 기록 */}
              <div className="group-detail__home-section-header">
                <h3>내 수업 기록</h3>
              </div>
              {myLessonsLoading ? (
                <p className="group-detail__home-empty">로딩 중...</p>
              ) : myLessons.length === 0 ? (
                <p className="group-detail__home-empty">수업 기록이 없습니다</p>
              ) : (
                <div className="group-detail__my-lessons">
                  {myLessons.map((lesson) => {
                    // 해당 수업의 출석 정보 찾기
                    const attendance = myAttendanceList.find(
                      a => a.scheduleId?.includes(lesson.lessonDate) && a.scheduleId?.includes(lesson.lessonStartTime.replace(':', ''))
                    );
                    return (
                      <div key={lesson.id} className="group-detail__my-lesson-item">
                        <div className="group-detail__my-lesson-header">
                          <span className="date">{lesson.lessonDate}</span>
                          <span className="time">{lesson.lessonStartTime} - {lesson.lessonEndTime}</span>
                          {attendance && (
                            <span className={`attendance-badge badge--${attendance.status}`}>
                              {ATTENDANCE_STATUS_LABELS[attendance.status] || attendance.status}
                            </span>
                          )}
                        </div>
                        {lesson.currentContent && (
                          <div className="group-detail__my-lesson-section">
                            <strong>수업 내용</strong>
                            <p>{lesson.currentContent}</p>
                          </div>
                        )}
                        {lesson.homework && (
                          <div className="group-detail__my-lesson-section">
                            <strong>과제</strong>
                            <p>{lesson.homework}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* 공지사항 */}
              <div className="group-detail__home-section-header">
                <h3>공지사항</h3>
                <button className="group-detail__home-more" onClick={() => onNavigateToTab('announcements')}>
                  더보기
                </button>
              </div>
              {announcementsLoading ? (
                <p className="group-detail__home-empty">로딩 중...</p>
              ) : announcements.length === 0 ? (
                <p className="group-detail__home-empty">등록된 공지사항이 없습니다</p>
              ) : (
                <div className="group-detail__home-announcements">
                  {announcements.slice(0, 5).map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`group-detail__home-announcement ${announcement.isPinned ? 'pinned' : ''}`}
                      onClick={() => handleSelectAnnouncement(announcement)}
                      style={{ cursor: 'pointer' }}
                    >
                      {announcement.isPinned && <span className="pin-badge">고정</span>}
                      <span className="title">{announcement.title}</span>
                      <span className="date">{formatDate(announcement.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeTab;
