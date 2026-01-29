import { useEffect, useMemo, useState } from 'react';
import ReactCalendar from 'react-calendar';
import { Modal, LocationPicker, ScheduleAttendanceModal, ScheduleChangeRequestModal, AbsenceRequestModal } from '@/components';
import { useGroupDetailStore } from '@/store';
import { isHoliday, getHolidayName } from '@/utils/holidays';
import { HolidaySection } from './components';
import type { SchedulesTabProps } from './types';
import type { Schedule } from '@/types';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const SchedulesTab: React.FC<SchedulesTabProps> = ({
  groupId,
  groupType,
  isAdmin,
  canWriteSchedule,
  userId,
  favoriteLocations,
  hasAttendance,
}) => {
  const [calendarDate, setCalendarDate] = useState<Date | null | [Date | null, Date | null]>(new Date());
  const [attendanceSchedule, setAttendanceSchedule] = useState<Schedule | null>(null);
  const [changeRequestSchedule, setChangeRequestSchedule] = useState<Schedule | null>(null);
  const [absenceRequestSchedule, setAbsenceRequestSchedule] = useState<Schedule | null>(null);

  const {
    schedules,
    schedulesLoading,
    showScheduleModal,
    editingSchedule,
    scheduleForm,
    scheduleSaving,
    myAttendanceMap,
    fetchSchedules,
    fetchMyAttendances,
    openNewScheduleModal,
    openEditScheduleModal,
    closeScheduleModal,
    setScheduleForm,
    saveSchedule,
    deleteSchedule,
  } = useGroupDetailStore();

  useEffect(() => {
    if (groupId && schedules.length === 0) {
      fetchSchedules(groupId);
    }
  }, [groupId, schedules.length, fetchSchedules]);

  // 출석 기능이 활성화된 경우 내 출석 기록 로드
  useEffect(() => {
    if (groupId && hasAttendance) {
      fetchMyAttendances(groupId);
    }
  }, [groupId, hasAttendance, fetchMyAttendances]);

  const selectedDate = useMemo(() => {
    if (calendarDate instanceof Date) return calendarDate;
    if (Array.isArray(calendarDate) && calendarDate[0]) return calendarDate[0];
    return null;
  }, [calendarDate]);

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

  const handleSave = async () => {
    await saveSchedule(groupId);
  };

  const handleDelete = async (schedule: Schedule) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteSchedule(schedule.id);
    }
  };

  const handleEditSchedule = async (scheduleId: string) => {
    await openEditScheduleModal(scheduleId);
  };

  const locationDataForPicker = favoriteLocations.map(loc => ({
    name: loc.name,
    address: loc.address,
    detail: loc.detail,
    placeId: loc.placeId,
    lat: loc.lat,
    lng: loc.lng,
  }));

  // 출석 상태에 따른 뱃지 표시
  const getAttendanceBadge = (scheduleId: string) => {
    if (!hasAttendance) return null;
    const status = myAttendanceMap[scheduleId];
    if (!status) return null;

    const badges: Record<string, { text: string; className: string }> = {
      present: { text: '출석', className: 'schedule-item__badge--present' },
      late: { text: '지각', className: 'schedule-item__badge--late' },
      absent: { text: '결석', className: 'schedule-item__badge--absent' },
      excused: { text: '사유', className: 'schedule-item__badge--excused' },
    };
    const badge = badges[status];
    return badge ? (
      <span className={`schedule-item__badge ${badge.className}`}>{badge.text}</span>
    ) : null;
  };

  return (
    <div className="group-detail__schedules">
      <div className="group-detail__schedules-header">
        <h2>일정</h2>
        <span className="group-detail__schedules-hint">날짜를 클릭하여 일정을 추가하세요</span>
      </div>

      {/* 휴일 관리 섹션 (학원 타입 전용) */}
      {groupType === 'education' && (
        <HolidaySection groupId={groupId} isAdmin={isAdmin} hideAddButton />
      )}

      {schedulesLoading ? (
        <p className="group-detail__loading-text">로딩 중...</p>
      ) : (
        <div className="schedule-view">
          {/* 캘린더 */}
          <div className="schedule-view__calendar">
            <ReactCalendar
              onChange={setCalendarDate}
              value={calendarDate}
              onClickDay={(date) => canWriteSchedule && openNewScheduleModal(date)}
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

          {/* 선택된 날짜 일정 */}
          <div className="schedule-view__selected">
            <h3 className="schedule-view__date">
              {selectedDate
                ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${DAYS[selectedDate.getDay()]})`
                : '날짜를 선택하세요'}
              {selectedDate && getHolidayName(selectedDate) && (
                <span className="holiday-name">{getHolidayName(selectedDate)}</span>
              )}
            </h3>
            {selectedDateSchedules.length === 0 ? (
              <p className="schedule-view__empty">이 날짜에 일정이 없습니다</p>
            ) : (
              <div className="schedule-view__list">
                {selectedDateSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`schedule-item ${myAttendanceMap[schedule.id] ? 'schedule-item--attended' : ''}`}
                    onClick={() => (isAdmin || schedule.authorId === userId) && handleEditSchedule(schedule.id)}
                  >
                    <span
                      className="schedule-item__color"
                      style={{ backgroundColor: schedule.color || '#3b82f6' }}
                    />
                    <div className="schedule-item__info">
                      <div className="schedule-item__title-row">
                        <span className="schedule-item__title">{schedule.title}</span>
                        {getAttendanceBadge(schedule.id)}
                      </div>
                      <span className="schedule-item__time">
                        {schedule.isAllDay
                          ? '종일'
                          : `${new Date(schedule.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(schedule.endAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                      {schedule.location && (
                        <span className="schedule-item__location">📍 {schedule.location}</span>
                      )}
                    </div>
                    <div className="schedule-item__actions">
                      {/* 일정 변경 요청 버튼 (일반 멤버) */}
                      {!isAdmin && (
                        <button
                          className="schedule-item__action-btn"
                          onClick={(e) => { e.stopPropagation(); setChangeRequestSchedule(schedule); }}
                          title="일정 변경 요청"
                        >
                          🔄
                        </button>
                      )}
                      {/* 결석 신청 버튼 (출석 기능 활성화 시) */}
                      {hasAttendance && (
                        <button
                          className="schedule-item__action-btn"
                          onClick={(e) => { e.stopPropagation(); setAbsenceRequestSchedule(schedule); }}
                          title="결석 신청"
                        >
                          🙋
                        </button>
                      )}
                      {/* 출석 관리 버튼 (관리자 & 출석 기능 활성화) */}
                      {isAdmin && hasAttendance && (
                        <button
                          className="schedule-item__attendance-btn"
                          onClick={(e) => { e.stopPropagation(); setAttendanceSchedule(schedule); }}
                          title="출석 관리"
                        >
                          📋
                        </button>
                      )}
                      {(isAdmin || schedule.authorId === userId) && (
                        <button
                          className="schedule-item__delete"
                          onClick={(e) => { e.stopPropagation(); handleDelete(schedule); }}
                          title="삭제"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 출석 관리 모달 */}
      <ScheduleAttendanceModal
        isOpen={!!attendanceSchedule}
        onClose={() => setAttendanceSchedule(null)}
        groupId={groupId}
        scheduleId={attendanceSchedule?.id || ''}
        scheduleTitle={attendanceSchedule?.title}
      />

      {/* 일정 변경 요청 모달 */}
      <ScheduleChangeRequestModal
        isOpen={!!changeRequestSchedule}
        onClose={() => setChangeRequestSchedule(null)}
        groupId={groupId}
        schedule={changeRequestSchedule}
        onSuccess={() => {
          setChangeRequestSchedule(null);
        }}
      />

      {/* 결석 신청 모달 */}
      <AbsenceRequestModal
        isOpen={!!absenceRequestSchedule}
        onClose={() => setAbsenceRequestSchedule(null)}
        groupId={groupId}
        scheduleId={absenceRequestSchedule?.id}
        scheduleTitle={absenceRequestSchedule?.title}
        onSuccess={() => {
          setAbsenceRequestSchedule(null);
          if (hasAttendance) fetchMyAttendances(groupId);
        }}
      />

      {/* 일정 추가/수정 모달 */}
      <Modal
        isOpen={showScheduleModal}
        onClose={closeScheduleModal}
        title={editingSchedule ? '일정 수정' : '일정 추가'}
        size="md"
      >
        <div className="schedule-form">
          <div className="schedule-form__field">
            <label>제목 *</label>
            <input
              type="text"
              value={scheduleForm.title}
              onChange={(e) => setScheduleForm({ title: e.target.value })}
              placeholder="일정 제목을 입력하세요"
            />
          </div>

          {scheduleForm.isAllDay ? (
            <div className="schedule-form__row">
              <div className="schedule-form__field">
                <label>시작일 *</label>
                <input
                  type="date"
                  value={scheduleForm.startDate}
                  onChange={(e) => setScheduleForm({ startDate: e.target.value })}
                />
              </div>
              <div className="schedule-form__field">
                <label>종료일 *</label>
                <input
                  type="date"
                  value={scheduleForm.endDate}
                  onChange={(e) => setScheduleForm({ endDate: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="schedule-form__row">
                <div className="schedule-form__field">
                  <label>시작일 *</label>
                  <input
                    type="date"
                    value={scheduleForm.startDate}
                    onChange={(e) => setScheduleForm({ startDate: e.target.value })}
                  />
                </div>
                <div className="schedule-form__field">
                  <label>시작 시간</label>
                  <input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ startTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="schedule-form__row">
                <div className="schedule-form__field">
                  <label>종료일 *</label>
                  <input
                    type="date"
                    value={scheduleForm.endDate}
                    onChange={(e) => setScheduleForm({ endDate: e.target.value })}
                  />
                </div>
                <div className="schedule-form__field">
                  <label>종료 시간</label>
                  <input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ endTime: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="schedule-form__field schedule-form__checkbox-group">
            <label className="schedule-form__checkbox">
              <input
                type="checkbox"
                checked={scheduleForm.isAllDay}
                onChange={(e) => setScheduleForm({ isAllDay: e.target.checked })}
              />
              <span>종일 일정</span>
            </label>
            <label className="schedule-form__checkbox">
              <input
                type="checkbox"
                checked={scheduleForm.requiresMakeup}
                onChange={(e) => setScheduleForm({ requiresMakeup: e.target.checked })}
              />
              <span>보강 필요</span>
            </label>
          </div>

          <div className="schedule-form__field">
            <label>장소</label>
            <LocationPicker
              value={scheduleForm.locationData}
              onChange={(location) => setScheduleForm({ locationData: location })}
              placeholder="장소를 검색하세요"
              favoriteLocations={locationDataForPicker}
            />
          </div>

          <div className="schedule-form__field">
            <label>설명</label>
            <textarea
              value={scheduleForm.description}
              onChange={(e) => setScheduleForm({ description: e.target.value })}
              placeholder="일정에 대한 설명을 입력하세요"
              rows={3}
            />
          </div>

          <div className="schedule-form__actions">
            <button
              type="button"
              className="schedule-form__cancel"
              onClick={closeScheduleModal}
              disabled={scheduleSaving}
            >
              취소
            </button>
            <button
              type="button"
              className="schedule-form__submit"
              onClick={handleSave}
              disabled={!scheduleForm.title.trim() || !scheduleForm.startDate || !scheduleForm.endDate || scheduleSaving}
            >
              {scheduleSaving ? '저장 중...' : editingSchedule ? '수정하기' : '추가하기'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SchedulesTab;
