import { useState, useMemo } from 'react';
import type { Schedule } from '@/types';
import { isHoliday, getHolidayName } from '@/utils/holidays';
import './Calendar.scss';

interface CalendarProps {
  schedules: Schedule[];
  onDateClick?: (date: Date) => void;
  onDateSelect?: (date: Date) => void;
  onScheduleClick?: (schedule: Schedule) => void;
  selectedDate?: Date;
  compact?: boolean;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const Calendar = ({ schedules, onDateClick, onDateSelect, onScheduleClick, selectedDate, compact }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 달력에 표시할 날짜 배열 생성
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // 첫 주의 빈 날짜
    const startDay = firstDayOfMonth.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // 해당 월의 모든 날짜
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [year, month]);

  // 날짜별 일정 매핑
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();

    schedules.forEach((schedule) => {
      const startDate = new Date(schedule.startAt);
      const endDate = new Date(schedule.endAt);

      // 일정이 여러 날에 걸칠 수 있으므로 해당하는 모든 날짜에 추가
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
  }, [schedules]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleDateClick = (date: Date | null) => {
    if (date) {
      onDateClick?.(date);
      onDateSelect?.(date);
    }
  };

  const handleScheduleClick = (e: React.MouseEvent, schedule: Schedule) => {
    e.stopPropagation();
    if (onScheduleClick) {
      onScheduleClick(schedule);
    }
  };

  return (
    <div className={`calendar ${compact ? 'calendar--compact' : ''}`}>
      <div className="calendar__header">
        <button className="calendar__nav-btn" onClick={prevMonth}>
          ◀
        </button>
        <div className="calendar__title">
          <span className="calendar__year">{year}년</span>
          <span className="calendar__month">{MONTHS[month]}</span>
        </div>
        <button className="calendar__nav-btn" onClick={nextMonth}>
          ▶
        </button>
        <button className="calendar__today-btn" onClick={goToToday}>
          오늘
        </button>
      </div>

      <div className="calendar__days-header">
        {DAYS.map((day, index) => (
          <div
            key={day}
            className={`calendar__day-name ${index === 0 ? 'sunday' : ''} ${index === 6 ? 'saturday' : ''}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="calendar__grid">
        {calendarDays.map((date, index) => {
          const dateKey = date?.toISOString().split('T')[0];
          const daySchedules = dateKey ? schedulesByDate.get(dateKey) || [] : [];
          const hasSchedules = daySchedules.length > 0;

          return (
            <div
              key={index}
              className={`calendar__cell ${!date ? 'empty' : ''} ${isToday(date) ? 'today' : ''} ${
                isSelected(date) ? 'selected' : ''
              } ${date?.getDay() === 0 ? 'sunday' : ''} ${date?.getDay() === 6 ? 'saturday' : ''} ${date && isHoliday(date) ? 'holiday' : ''}`}
              onClick={() => handleDateClick(date)}
              title={date ? getHolidayName(date) || undefined : undefined}
            >
              {date && (
                <>
                  <span className="calendar__date">{date.getDate()}</span>
                  {compact ? (
                    hasSchedules && <span className="calendar__dot" />
                  ) : (
                    <div className="calendar__schedules">
                      {daySchedules.slice(0, 3).map((schedule) => (
                        <div
                          key={schedule.id}
                          className="calendar__schedule-item"
                          style={{ backgroundColor: schedule.color || '#3b82f6' }}
                          onClick={(e) => handleScheduleClick(e, schedule)}
                          title={schedule.title}
                        >
                          {schedule.title}
                        </div>
                      ))}
                      {daySchedules.length > 3 && (
                        <div className="calendar__more">+{daySchedules.length - 3}개</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
