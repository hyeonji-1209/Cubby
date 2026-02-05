"use client";

import { useState, useMemo, useRef, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { CalendarEvent, Group, Lesson, RoomReservation } from "@/types";
import { cn } from "@/lib/utils";
import { getHolidaysForMonth, Holiday } from "@/lib/holidays";
import {
  CALENDAR_COLORS,
  DEFAULT_EVENT_COLOR,
  HOLIDAY_COLOR,
  CalendarColor,
} from "@/lib/calendar-colors";
import { BookOpen, Calendar as CalendarIcon, Repeat } from "lucide-react";

export interface ColorMapping {
  id: string;
  color: CalendarColor;
}

// 통합 일정 아이템
interface ScheduleItem {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  type: "event" | "lesson" | "reservation";
  all_day?: boolean;
  color: CalendarColor;
  original?: CalendarEvent | LessonWithDetails | RoomReservation;
  instructor?: string;
}

// 수업에 학생/강사 정보가 포함된 타입
export interface LessonWithDetails extends Lesson {
  student?: { id: string; name: string };
  instructor?: { id: string; name: string };
  room?: { id: string; name: string };
}

// 정규수업 스케줄 타입 (멤버별 반복 수업)
export interface RegularSchedule {
  memberId: string;
  studentName: string;
  instructorId?: string;
  instructorName?: string;
  dayOfWeek: number; // 0-6 (일-토)
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  roomId?: string;
  roomName?: string;
  subject?: string;  // 과목/비고 (국어, 수학, 음악 등)
}

export interface CalendarViewProps {
  events: CalendarEvent[];
  // 학생용 수업 (선택)
  lessons?: LessonWithDetails[];
  // 학생용 예약 (선택)
  reservations?: RoomReservation[];
  // 색상 매핑 (location_id 또는 group_id로 색상 결정)
  colorMappings?: ColorMapping[];
  // 그룹 목록 (대시보드용 - 그룹명 표시)
  groups?: Group[];
  // 이벤트 클릭 핸들러 (클릭 가능 여부 결정)
  onEventClick?: (event: CalendarEvent) => void;
  // 개인 일정만 클릭 가능할지 (대시보드용)
  personalEventsOnly?: boolean;
  // 추가 버튼 클릭
  onAddClick?: (date: Date) => void;
  // 날짜 더블클릭
  onDateDoubleClick?: (date: Date) => void;
  // 월 변경 콜백
  onMonthChange?: (date: Date) => void;
  // 휴일 표시 라벨 (교육 타입용)
  showHolidayBadge?: boolean;
  // 헤더 추가 요소
  headerExtra?: ReactNode;
  // 사이드 패널 숨김
  hideSidePanel?: boolean;
  // 수업 상세 표시 (강사/오너용)
  showLessonDetails?: boolean;
  // 오너 여부 (강사명 표시용)
  isOwner?: boolean;
  // 예약 라벨 숨김
  hideReservationLabels?: boolean;
  // 정규수업 스케줄 (매주 반복)
  regularSchedules?: RegularSchedule[];
}

export function CalendarView({
  events,
  lessons = [],
  reservations = [],
  colorMappings = [],
  groups = [],
  onEventClick,
  personalEventsOnly = false,
  onAddClick,
  onDateDoubleClick,
  onMonthChange,
  showHolidayBadge = false,
  headerExtra,
  hideSidePanel = false,
  showLessonDetails = false,
  isOwner = false,
  hideReservationLabels = false,
  regularSchedules = [],
}: CalendarViewProps) {
  // 수업/예약 색상
  const LESSON_COLOR: CalendarColor = { bg: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400" };
  const RESERVATION_COLOR: CalendarColor = { bg: "bg-purple-500", light: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" };
  const REGULAR_SCHEDULE_COLOR: CalendarColor = { bg: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" };
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [sidePanelView, setSidePanelView] = useState<"list" | "timeline">("timeline");
  const [maxLabels, setMaxLabels] = useState(5);
  const cellRef = useRef<HTMLButtonElement>(null);

  // 색상 매핑
  const colorMap = useMemo(() => {
    const map = new Map<string, CalendarColor>();
    colorMappings.forEach((mapping, idx) => {
      map.set(mapping.id, CALENDAR_COLORS[idx % CALENDAR_COLORS.length]);
    });
    return map;
  }, [colorMappings]);

  // 이벤트 색상 가져오기
  const getEventColor = (event: CalendarEvent) => {
    if (event.is_academy_holiday) {
      return HOLIDAY_COLOR;
    }
    // location_id 우선
    if (event.location_id && colorMap.has(event.location_id)) {
      return colorMap.get(event.location_id)!;
    }
    // group_id로 색상
    if (event.group_id && colorMap.has(event.group_id)) {
      return colorMap.get(event.group_id)!;
    }
    return DEFAULT_EVENT_COLOR;
  };

  // 현재 월의 공휴일
  const holidays = useMemo(() => {
    return getHolidaysForMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1
    );
  }, [currentMonth]);

  // 날짜별 공휴일 맵
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach((h) => {
      map.set(h.date, h);
    });
    return map;
  }, [holidays]);

  // 셀 높이 기반 라벨 수 계산
  useEffect(() => {
    const calculateMaxLabels = () => {
      if (!cellRef.current) return;
      const cellHeight = cellRef.current.clientHeight;
      const headerHeight = 28;
      const labelHeight = 23;
      const availableHeight = cellHeight - headerHeight;
      const calculatedMax = Math.max(2, Math.min(12, Math.floor(availableHeight / labelHeight)));
      setMaxLabels(calculatedMax);
    };

    const timer = setTimeout(calculateMaxLabels, 100);
    const resizeObserver = new ResizeObserver(calculateMaxLabels);
    if (cellRef.current) {
      resizeObserver.observe(cellRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, []);

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddClick = () => {
    onAddClick?.(selectedDate || new Date());
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const startDate = new Date(event.start_at);
      const endDate = new Date(event.end_at);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  // 해당 날짜의 수업 가져오기
  const getLessonsForDate = (date: Date) => {
    return lessons.filter((lesson) => {
      return isSameDay(new Date(lesson.scheduled_at), date);
    });
  };

  // 해당 날짜의 예약 가져오기
  const getReservationsForDate = (date: Date) => {
    return reservations.filter((res) => {
      return isSameDay(new Date(res.start_at), date);
    });
  };

  // 해당 날짜의 정규수업 스케줄 가져오기 (요일 기준)
  const getRegularSchedulesForDate = (date: Date) => {
    const dayOfWeek = date.getDay(); // 0-6 (일-토)
    return regularSchedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek);
  };

  // 해당 날짜의 모든 일정 아이템 (이벤트 + 수업 + 예약)
  const getScheduleItemsForDate = (date: Date): ScheduleItem[] => {
    const items: ScheduleItem[] = [];

    // 이벤트 추가
    getEventsForDate(date).forEach((event) => {
      items.push({
        id: event.id,
        title: event.title,
        start_at: event.start_at,
        end_at: event.end_at,
        type: "event",
        all_day: event.all_day,
        color: getEventColor(event),
        original: event,
      });
    });

    // 수업 추가
    getLessonsForDate(date).forEach((lesson) => {
      const startAt = new Date(lesson.scheduled_at);
      const endAt = new Date(startAt.getTime() + (lesson.duration_minutes || 60) * 60 * 1000);
      let title = `수업 (${lesson.duration_minutes || 60}분)`;
      let instructor: string | undefined;
      if (showLessonDetails) {
        const studentName = lesson.student?.name || "";
        const roomName = lesson.room?.name || "";
        title = `${roomName ? `[${roomName}] ` : ""}${studentName} 수업`;
        if (isOwner && lesson.instructor?.name) {
          instructor = lesson.instructor.name;
        }
      }
      items.push({
        id: `lesson-${lesson.id}`,
        title,
        start_at: lesson.scheduled_at,
        end_at: endAt.toISOString(),
        type: "lesson",
        all_day: false,
        color: LESSON_COLOR,
        original: lesson,
        instructor,
      });
    });

    // 예약 추가 (hideReservationLabels가 true면 추가하지 않음)
    if (!hideReservationLabels) {
      getReservationsForDate(date).forEach((res) => {
        items.push({
          id: `res-${res.id}`,
          title: "연습실 예약",
          start_at: res.start_at,
          end_at: res.end_at,
          type: "reservation",
          all_day: false,
          color: RESERVATION_COLOR,
          original: res,
        });
      });
    }

    // 시간순 정렬
    items.sort((a, b) => {
      if (a.all_day && !b.all_day) return -1;
      if (!a.all_day && b.all_day) return 1;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });

    return items;
  };

  const getHolidayForDate = (date: Date): Holiday | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return holidayMap.get(dateStr) || null;
  };

  // 이벤트 클릭 가능 여부
  const isEventClickable = (event: CalendarEvent) => {
    if (!onEventClick) return false;
    if (personalEventsOnly) return !event.group_id;
    return true;
  };

  // 캘린더 날짜 계산
  const calendarMonthStart = startOfMonth(currentMonth);
  const calendarMonthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(calendarMonthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(calendarMonthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const selectedDateScheduleItems = selectedDate ? getScheduleItemsForDate(selectedDate) : [];
  const selectedDateHoliday = selectedDate ? getHolidayForDate(selectedDate) : null;

  return (
    <div className={cn("h-full flex", hideSidePanel ? "flex-col" : "flex-col md:flex-row")}>
      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </h2>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleMonthChange(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleMonthChange(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                handleMonthChange(new Date());
                setSelectedDate(new Date());
              }}
            >
              오늘
            </Button>
          </div>
          {headerExtra}
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day, idx) => (
            <div
              key={day}
              className={cn(
                "py-2 text-center text-xs font-medium",
                idx === 0 && "text-red-500",
                idx === 6 && "text-blue-500"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          className="flex-1 grid overflow-hidden"
          style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}
        >
          {weeks.map((week, weekIndex) => {
            const weekEndDate = week[6] || week[week.length - 1];

            // 멀티데이 이벤트 계산 (여러 날에 걸친 이벤트)
            const multiDayEvents: { event: CalendarEvent; startIdx: number; span: number; isStart: boolean; isEnd: boolean }[] = [];
            const processedEventIds = new Set<string>();

            week.forEach((day, dayIdx) => {
              const dayEvents = getEventsForDate(day);
              dayEvents.forEach((event) => {
                if (processedEventIds.has(event.id)) return;

                const eventStart = new Date(event.start_at);
                const eventEnd = new Date(event.end_at);
                eventStart.setHours(0, 0, 0, 0);
                eventEnd.setHours(0, 0, 0, 0);

                // 여러 날에 걸친 이벤트인지 확인
                const daysDiff = Math.floor((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff < 1) return; // 하루 이벤트는 제외

                // 이 날짜가 이벤트 시작일이거나, 주의 첫 날인 경우에만 바 표시
                if (isSameDay(eventStart, day) || dayIdx === 0) {
                  const weekEnd = new Date(weekEndDate);
                  weekEnd.setHours(23, 59, 59, 999);
                  const displayEnd = eventEnd < weekEnd ? eventEnd : weekEnd;
                  const currentDate = new Date(day);
                  currentDate.setHours(0, 0, 0, 0);
                  const span = Math.min(
                    Math.floor((displayEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
                    7 - dayIdx
                  );

                  const isStart = isSameDay(eventStart, day);
                  const isEnd = isSameDay(eventEnd, week[dayIdx + span - 1] || weekEndDate);
                  multiDayEvents.push({ event, startIdx: dayIdx, span, isStart, isEnd });
                  processedEventIds.add(event.id);
                }
              });
            });

            // 멀티데이 이벤트 정렬
            multiDayEvents.sort((a, b) => {
              if (a.event.all_day && !b.event.all_day) return -1;
              if (!a.event.all_day && b.event.all_day) return 1;
              return new Date(a.event.start_at).getTime() - new Date(b.event.start_at).getTime();
            });

            const multiDayBarCount = Math.min(multiDayEvents.length, 3);

            return (
              <div key={weekIndex} className="relative grid grid-cols-7 border-b last:border-b-0">
                {/* 날짜 셀들 */}
                {week.map((date, dayIndex) => {
                  const holiday = getHolidayForDate(date);
                  const isCurrentMonth = isSameMonth(date, currentMonth);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);

                  // 해당 날짜의 단일 이벤트만 (멀티데이 제외)
                  const dayEvents = getEventsForDate(date);
                  const singleDayEvents = dayEvents.filter((event) => {
                    const eventStart = new Date(event.start_at);
                    const eventEnd = new Date(event.end_at);
                    eventStart.setHours(0, 0, 0, 0);
                    eventEnd.setHours(0, 0, 0, 0);
                    const daysDiff = Math.floor((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
                    return daysDiff < 1;
                  });

                  // 수업과 예약 가져오기
                  const dayLessons = getLessonsForDate(date);
                  const dayReservations = getReservationsForDate(date);
                  const dayRegularSchedules = getRegularSchedulesForDate(date);

                  // 통합 일정 아이템
                  const allDayItems: { type: "event" | "lesson" | "reservation" | "regular"; time: string; title: string; color: CalendarColor; id: string; event?: CalendarEvent; instructor?: string }[] = [];

                  // 단일 이벤트 추가
                  singleDayEvents.forEach((event) => {
                    allDayItems.push({
                      type: "event",
                      time: event.all_day ? "" : format(new Date(event.start_at), "HH:mm"),
                      title: event.title,
                      color: getEventColor(event),
                      id: event.id,
                      event,
                    });
                  });

                  // 수업 추가
                  dayLessons.forEach((lesson) => {
                    let title = "수업";
                    let instructor: string | undefined;
                    if (showLessonDetails) {
                      // 시간[장소] 학생이름 수업 형식 (강사는 맨 오른쪽에 별도 표시)
                      const time = format(new Date(lesson.scheduled_at), "HH:mm");
                      const roomName = lesson.room?.name || "";
                      const studentName = lesson.student?.name || "";

                      title = `${time}${roomName ? `[${roomName}]` : ""} ${studentName} 수업`;

                      if (isOwner && lesson.instructor?.name) {
                        instructor = lesson.instructor.name;
                      }
                    }
                    allDayItems.push({
                      type: "lesson",
                      time: showLessonDetails ? "" : format(new Date(lesson.scheduled_at), "HH:mm"),
                      title,
                      color: LESSON_COLOR,
                      id: `lesson-${lesson.id}`,
                      instructor,
                    });
                  });

                  // 예약 추가 (hideReservationLabels가 true면 라벨 숨김)
                  if (!hideReservationLabels) {
                    dayReservations.forEach((res) => {
                      allDayItems.push({
                        type: "reservation",
                        time: format(new Date(res.start_at), "HH:mm"),
                        title: "예약",
                        color: RESERVATION_COLOR,
                        id: `res-${res.id}`,
                      });
                    });
                  }

                  // 정규수업 추가 (실제 수업이 없는 경우에만)
                  dayRegularSchedules.forEach((schedule) => {
                    // 해당 학생의 같은 시간대 수업이 이미 있는지 확인
                    const hasActualLesson = dayLessons.some(
                      (lesson) =>
                        lesson.student?.id === schedule.memberId ||
                        format(new Date(lesson.scheduled_at), "HH:mm") === schedule.startTime
                    );
                    if (hasActualLesson) return;

                    let title = "정규수업";
                    let instructor: string | undefined;
                    if (showLessonDetails) {
                      // 형식: 시간[장소] 학생이름과목수업 (강사는 맨 오른쪽 별도 표시)
                      const subjectText = schedule.subject ? schedule.subject : "";
                      title = `${schedule.startTime}${schedule.roomName ? `[${schedule.roomName}]` : ""} ${schedule.studentName}${subjectText}수업`;
                      if (isOwner && schedule.instructorName) {
                        instructor = schedule.instructorName;
                      }
                    }
                    allDayItems.push({
                      type: "regular",
                      time: showLessonDetails ? "" : schedule.startTime,
                      title,
                      color: REGULAR_SCHEDULE_COLOR,
                      id: `regular-${schedule.memberId}-${schedule.dayOfWeek}-${schedule.startTime}`,
                      instructor,
                    });
                  });

                  // 시간순 정렬
                  allDayItems.sort((a, b) => {
                    if (!a.time && b.time) return -1;
                    if (a.time && !b.time) return 1;
                    return a.time.localeCompare(b.time);
                  });

                  const availableLabels = Math.max(0, maxLabels - multiDayBarCount);

                  return (
                    <button
                      key={date.toISOString()}
                      ref={weekIndex === 0 && dayIndex === 0 ? cellRef : null}
                      onClick={() => handleDateClick(date)}
                      onDoubleClick={() => onDateDoubleClick?.(date)}
                      className={cn(
                        "h-full min-h-[70px] px-0.5 pt-1 text-left transition-colors relative flex flex-col border-r last:border-r-0 overflow-hidden",
                        !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                        isCurrentMonth && "hover:bg-muted/30",
                        isSelected && "bg-primary/10 ring-2 ring-primary ring-inset"
                      )}
                    >
                      {/* Date Header */}
                      <div className="flex items-center justify-between w-full px-0.5 mb-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] shrink-0",
                            // 공휴일 또는 일요일은 빨간색
                            (holiday || dayIndex === 0) && "text-red-500",
                            // 토요일은 파란색 (공휴일 아닐 때만)
                            dayIndex === 6 && !holiday && "text-blue-500",
                            // 오늘 날짜 (우선순위 높음)
                            isTodayDate && "bg-primary text-primary-foreground font-bold"
                          )}
                        >
                          {format(date, "d")}
                        </span>
                        {/* +N more 표시 */}
                        {isCurrentMonth && allDayItems.length > availableLabels && (
                          <span className="text-[9px] text-muted-foreground">
                            +{Math.max(0, allDayItems.length - availableLabels)}
                          </span>
                        )}
                      </div>
                      {holiday && isCurrentMonth && (
                        <div className="text-[9px] text-red-500 truncate leading-tight px-0.5">
                          {holiday.name}
                        </div>
                      )}

                      {/* 일정 라벨 (이벤트 + 수업 + 예약) */}
                      {isCurrentMonth && allDayItems.length > 0 && (
                        <div
                          className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden"
                          style={{ marginTop: `${multiDayBarCount * 21 + 2}px` }}
                        >
                          {allDayItems.slice(0, availableLabels).map((item) => {
                            const groupName = item.event?.group_id
                              ? groups.find(g => g.id === item.event?.group_id)?.name
                              : null;
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-center gap-1 text-xs leading-tight px-1 py-0.5",
                                  item.type === "event" ? "bg-muted/50" : item.color.light,
                                  "hover:opacity-80"
                                )}
                              >
                                {/* 타입별 아이콘/닷 */}
                                {item.type === "lesson" && (
                                  <BookOpen className="h-2.5 w-2.5 shrink-0 text-blue-500" />
                                )}
                                {item.type === "regular" && (
                                  <Repeat className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
                                )}
                                {item.type === "reservation" && (
                                  <CalendarIcon className="h-2.5 w-2.5 shrink-0 text-purple-500" />
                                )}
                                {item.type === "event" && (
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.color.bg)} />
                                )}
                                {item.time && (
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {item.time}
                                  </span>
                                )}
                                <span className="truncate flex-1">{item.title}</span>
                                {/* 수업/정규수업 담당강사 (맨 오른쪽) */}
                                {(item.type === "lesson" || item.type === "regular") && item.instructor && (
                                  <span className="text-[9px] text-muted-foreground shrink-0 ml-auto">
                                    {item.instructor}
                                  </span>
                                )}
                                {groups.length > 0 && item.type === "event" && (
                                  <span className="text-[9px] text-muted-foreground shrink-0">
                                    {groupName || "개인"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* 멀티데이 이벤트 바 (절대 위치) */}
                {multiDayEvents.slice(0, 3).map(({ event, startIdx, span, isStart, isEnd }, idx) => {
                  const eventColor = getEventColor(event);
                  const groupName = event.group_id
                    ? groups.find(g => g.id === event.group_id)?.name
                    : null;
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute h-[19px] flex items-center cursor-pointer z-10",
                        "text-xs truncate",
                        eventColor.light,
                        eventColor.text,
                        "hover:opacity-80",
                        isStart ? "pl-1.5" : "pl-0.5",
                        isEnd ? "pr-1.5" : "pr-0.5"
                      )}
                      style={{
                        top: `${28 + idx * 21}px`,
                        left: `calc(${startIdx} / 7 * 100%)`,
                        width: `calc(${span} / 7 * 100% - 2px)`,
                        marginLeft: '1px',
                      }}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0 mr-1",
                          eventColor.bg
                        )}
                      />
                      <span className="truncate flex-1 font-medium">{event.title}</span>
                      {groups.length > 0 && (
                        <span className="text-[9px] text-muted-foreground shrink-0 ml-1">
                          {groupName || "개인"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Panel */}
      {!hideSidePanel && (
      <div className="w-full md:w-80 border-t md:border-t-0 md:border-l flex flex-col bg-background">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {selectedDate
                  ? format(selectedDate, "yyyy년", { locale: ko })
                  : format(new Date(), "yyyy년", { locale: ko })}
              </p>
              <p className="text-base font-semibold mt-0.5">
                {selectedDate
                  ? format(selectedDate, "M월 d일 (EEE)", { locale: ko })
                  : format(new Date(), "M월 d일 (EEE)", { locale: ko })}
              </p>
            </div>
            {onAddClick && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                추가
              </Button>
            )}
          </div>
          {selectedDateHoliday && (
            <p className="text-xs text-red-500 mt-1.5 font-medium">
              {selectedDateHoliday.name}
            </p>
          )}
        </div>

        {/* View Toggle */}
        <div className="px-4 py-2 border-b flex items-center gap-3">
          <span className="text-xs text-muted-foreground">보기</span>
          <div className="flex items-center bg-muted/50 rounded p-0.5">
            <button
              onClick={() => setSidePanelView("timeline")}
              className={cn(
                "px-2.5 py-1 text-xs rounded transition-colors",
                sidePanelView === "timeline"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              타임라인
            </button>
            <button
              onClick={() => setSidePanelView("list")}
              className={cn(
                "px-2.5 py-1 text-xs rounded transition-colors",
                sidePanelView === "list"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              리스트
            </button>
          </div>
        </div>

        {/* Events List/Timeline */}
        <div className="flex-1 overflow-auto p-3">
          {sidePanelView === "list" ? (
            /* 리스트 뷰 */
            selectedDateScheduleItems.length > 0 ? (
              <div className="space-y-1.5">
                {selectedDateScheduleItems.map((item) => {
                  const clickable = item.type === "event" && item.original && isEventClickable(item.original as CalendarEvent);
                  const event = item.type === "event" ? item.original as CalendarEvent : null;
                  const groupName = event?.group_id ? groups.find(g => g.id === event?.group_id)?.name : null;

                  return (
                    <button
                      key={item.id}
                      onClick={() => clickable && event && onEventClick?.(event)}
                      disabled={!clickable}
                      className={cn(
                        "w-full p-2.5 rounded border border-border/40 transition-colors text-left",
                        clickable
                          ? "hover:border-border hover:bg-muted/30 cursor-pointer"
                          : "cursor-default"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            "w-1 h-full min-h-[36px] rounded-full shrink-0 mt-0.5",
                            item.color.bg
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate flex-1">
                              {item.title}
                            </p>
                            {item.type === "lesson" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 shrink-0 flex items-center gap-0.5">
                                <BookOpen className="h-2.5 w-2.5" />
                                수업
                              </span>
                            )}
                            {item.type === "reservation" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 shrink-0 flex items-center gap-0.5">
                                <CalendarIcon className="h-2.5 w-2.5" />
                                예약
                              </span>
                            )}
                            {showHolidayBadge && event?.is_academy_holiday && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 shrink-0">
                                휴일
                              </span>
                            )}
                            {groupName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground shrink-0">
                                {groupName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {item.all_day ? (
                              <span>하루 종일</span>
                            ) : (
                              <span>
                                {format(new Date(item.start_at), "HH:mm")} - {format(new Date(item.end_at), "HH:mm")}
                              </span>
                            )}
                            {event?.location && (
                              <>
                                <span className="text-muted-foreground/50">·</span>
                                <span className="truncate">{event.location}</span>
                              </>
                            )}
                            {/* 수업 담당강사 (맨 오른쪽) */}
                            {item.type === "lesson" && item.instructor && (
                              <>
                                <span className="ml-auto shrink-0">{item.instructor}</span>
                              </>
                            )}
                          </div>
                          {event?.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">일정이 없습니다</p>
                {onAddClick && (
                  <button
                    onClick={handleAddClick}
                    className="text-xs text-primary hover:underline mt-1.5"
                  >
                    일정 추가하기
                  </button>
                )}
              </div>
            )
          ) : (
            /* 타임라인 뷰 */
            <div className="relative">
              {/* 하루종일 이벤트 */}
              {selectedDateScheduleItems.filter(e => e.all_day).length > 0 && (
                <div className="mb-3 pb-3 border-b space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">하루 종일</p>
                  {selectedDateScheduleItems.filter(e => e.all_day).map((item) => {
                    const clickable = item.type === "event" && item.original && isEventClickable(item.original as CalendarEvent);
                    const event = item.type === "event" ? item.original as CalendarEvent : null;
                    const groupName = event?.group_id ? groups.find(g => g.id === event?.group_id)?.name : null;

                    return (
                      <button
                        key={item.id}
                        onClick={() => clickable && event && onEventClick?.(event)}
                        disabled={!clickable}
                        className={cn(
                          "w-full text-left text-xs px-2 py-1.5 rounded-sm flex items-center gap-2 border border-border/30",
                          item.color.light,
                          clickable ? "hover:opacity-80 cursor-pointer" : "cursor-default"
                        )}
                      >
                        <span className="font-medium truncate flex-1">{item.title}</span>
                        {groupName && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-background/50 text-muted-foreground shrink-0">
                            {groupName}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 시간 그리드 */}
              <div className="relative flex">
                <div className="w-12 shrink-0">
                  {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                    <div
                      key={hour}
                      className="h-10 text-[10px] text-muted-foreground pr-2 text-right"
                    >
                      {hour.toString().padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                <div className="flex-1 relative">
                  {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                    <div
                      key={hour}
                      className="h-10 border-b border-dashed border-muted"
                    />
                  ))}

                  {/* 현재 시간 표시 */}
                  {selectedDate && isToday(selectedDate) && (() => {
                    const now = new Date();
                    const currentHour = now.getHours() + now.getMinutes() / 60;
                    if (currentHour >= 7 && currentHour < 22) {
                      const topOffset = (currentHour - 7) * 40;
                      return (
                        <div
                          className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                          style={{ top: `${topOffset}px` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* 이벤트 바 (이벤트 + 수업 + 예약) */}
                  {(() => {
                    const timeItems = selectedDateScheduleItems.filter(e => !e.all_day);
                    const itemColumns: { item: ScheduleItem; col: number; totalCols: number }[] = [];

                    timeItems.forEach((item) => {
                      const startDate = new Date(item.start_at);
                      const endDate = new Date(item.end_at);
                      const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                      const endHour = endDate.getHours() + endDate.getMinutes() / 60;

                      let col = 0;
                      const overlapping = itemColumns.filter(ic => {
                        const icStart = new Date(ic.item.start_at);
                        const icEnd = new Date(ic.item.end_at);
                        const icStartHour = icStart.getHours() + icStart.getMinutes() / 60;
                        const icEndHour = icEnd.getHours() + icEnd.getMinutes() / 60;
                        return startHour < icEndHour && endHour > icStartHour;
                      });

                      const usedCols = overlapping.map(o => o.col);
                      while (usedCols.includes(col)) col++;

                      itemColumns.push({ item, col, totalCols: 1 });
                    });

                    itemColumns.forEach(ic => {
                      const startDate = new Date(ic.item.start_at);
                      const endDate = new Date(ic.item.end_at);
                      const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                      const endHour = endDate.getHours() + endDate.getMinutes() / 60;

                      const overlapping = itemColumns.filter(other => {
                        const otherStart = new Date(other.item.start_at);
                        const otherEnd = new Date(other.item.end_at);
                        const otherStartHour = otherStart.getHours() + otherStart.getMinutes() / 60;
                        const otherEndHour = otherEnd.getHours() + otherEnd.getMinutes() / 60;
                        return startHour < otherEndHour && endHour > otherStartHour;
                      });

                      ic.totalCols = Math.max(...overlapping.map(o => o.col)) + 1;
                    });

                    return itemColumns.map(({ item, col, totalCols }) => {
                      const startDate = new Date(item.start_at);
                      const endDate = new Date(item.end_at);
                      const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                      const endHour = endDate.getHours() + endDate.getMinutes() / 60;
                      const duration = endHour - startHour;

                      const topOffset = (startHour - 7) * 40;
                      const height = Math.max(duration * 40, 24);

                      if (startHour < 7 || startHour >= 22) return null;

                      const width = `calc((100% - 8px) / ${totalCols})`;
                      const left = `calc(4px + (100% - 8px) / ${totalCols} * ${col})`;

                      const clickable = item.type === "event" && item.original && isEventClickable(item.original as CalendarEvent);

                      return (
                        <button
                          key={item.id}
                          onClick={() => clickable && item.original && onEventClick?.(item.original as CalendarEvent)}
                          disabled={!clickable}
                          className={cn(
                            "absolute text-left text-xs px-1.5 py-1 rounded overflow-hidden border border-border/30",
                            item.color.light,
                            "border-l-2",
                            item.color.bg.replace("bg-", "border-l-"),
                            clickable ? "hover:opacity-80 cursor-pointer" : "cursor-default"
                          )}
                          style={{
                            top: `${topOffset}px`,
                            height: `${height}px`,
                            width,
                            left,
                          }}
                        >
                          <div className="font-medium truncate text-[11px] flex items-center gap-1">
                            {item.type === "lesson" && <BookOpen className="h-2.5 w-2.5 shrink-0" />}
                            {item.type === "reservation" && <CalendarIcon className="h-2.5 w-2.5 shrink-0" />}
                            {item.title}
                          </div>
                          <div className="text-[9px] opacity-70 truncate">
                            {format(startDate, "HH:mm")}-{format(endDate, "HH:mm")}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* 일정 없을 때 */}
              {selectedDateScheduleItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">일정이 없습니다</p>
                  {onAddClick && (
                    <button
                      onClick={handleAddClick}
                      className="text-xs text-primary hover:underline mt-1.5"
                    >
                      일정 추가하기
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
