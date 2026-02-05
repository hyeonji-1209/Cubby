"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Loader2,
  Clock,
  BookOpen,
  Calendar as CalendarIcon,
} from "lucide-react";
import { CalendarEvent, Lesson, RoomReservation, LessonChangeRequest } from "@/types";
import { cn } from "@/lib/utils";
import { getHolidaysForMonth, Holiday } from "@/lib/holidays";
import { EventModal } from "@/components/calendar/event-modal";
import {
  CALENDAR_COLORS,
  DEFAULT_EVENT_COLOR,
  HOLIDAY_COLOR,
  CalendarColor,
} from "@/lib/calendar-colors";
import { useGroup } from "@/lib/contexts/group-context";
import { useUser } from "@/lib/contexts/user-context";

interface CalendarPageProps {
  params: { id: string };
}

// Unified schedule item type for display
interface ScheduleItem {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  type: "event" | "lesson" | "reservation" | "changed";
  all_day?: boolean;
  location?: string;
  location_id?: string;
  is_academy_holiday?: boolean;
  original?: CalendarEvent | Lesson | RoomReservation | LessonChangeRequest;
}

export default function CalendarPage({ params }: CalendarPageProps) {
  const { group, isStudent, isGuardian } = useGroup();
  const { user } = useUser();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [reservations, setReservations] = useState<RoomReservation[]>([]);
  const [approvedChanges, setApprovedChanges] = useState<LessonChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const isStudentOrGuardian = isStudent || isGuardian;

  // 사이드 패널 뷰 모드 상태 (list: 리스트, timeline: 타임라인)
  const [sidePanelView, setSidePanelView] = useState<"list" | "timeline">("timeline");

  // 모달 상태
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const isEducationType = group.type === "education";

  // 셀 높이 기반 라벨 수 계산
  const [maxLabels, setMaxLabels] = useState(5);
  const cellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const calculateMaxLabels = () => {
      if (!cellRef.current) return;
      const cellHeight = cellRef.current.clientHeight;
      // 헤더 영역(날짜, 공휴일): 약 28px
      // 각 라벨 높이: 약 23px
      const headerHeight = 28;
      const labelHeight = 23;
      const availableHeight = cellHeight - headerHeight;
      const calculatedMax = Math.max(2, Math.min(12, Math.floor(availableHeight / labelHeight)));
      setMaxLabels(calculatedMax);
    };

    // 로딩 완료 후 계산
    if (!isLoading) {
      // 렌더링 완료 후 계산을 위해 약간 딜레이
      const timer = setTimeout(calculateMaxLabels, 100);

      const resizeObserver = new ResizeObserver(calculateMaxLabels);
      if (cellRef.current) {
        resizeObserver.observe(cellRef.current);
      }

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
      };
    }
  }, [isLoading]);

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

  // 장소별 색상 매핑 (장소 ID를 인덱스로 변환)
  const locationColorMap = useMemo(() => {
    const locations = group?.settings?.classes || [];
    const map = new Map<string, CalendarColor>();
    locations.forEach((loc, idx) => {
      map.set(loc.id, CALENDAR_COLORS[idx % CALENDAR_COLORS.length]);
    });
    return map;
  }, [group?.settings?.classes]);

  // 이벤트의 색상 가져오기
  const getEventColor = (event: CalendarEvent) => {
    if (event.is_academy_holiday) {
      return HOLIDAY_COLOR;
    }
    if (event.location_id) {
      return locationColorMap.get(event.location_id) || DEFAULT_EVENT_COLOR;
    }
    return DEFAULT_EVENT_COLOR;
  };

  useEffect(() => {
    loadEvents();
  }, [params.id, currentMonth, user?.id]);

  const loadEvents = async () => {
    const supabase = createClient();

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Load calendar events
    const { data: eventData } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("group_id", params.id)
      .gte("start_at", monthStart.toISOString())
      .lte("start_at", monthEnd.toISOString())
      .order("start_at");

    setEvents((eventData as CalendarEvent[]) || []);

    // Load student's lessons and reservations if student/guardian
    if (isStudentOrGuardian && user?.id) {
      // Load lessons where user is the student
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("group_id", params.id)
        .eq("student_id", user.id)
        .gte("scheduled_at", monthStart.toISOString())
        .lte("scheduled_at", monthEnd.toISOString())
        .in("status", ["scheduled", "in_progress", "completed"])
        .order("scheduled_at");

      setLessons((lessonData as Lesson[]) || []);

      // Load user's reservations
      const { data: reservationData } = await supabase
        .from("room_reservations")
        .select("*")
        .eq("group_id", params.id)
        .eq("reserved_by", user.id)
        .gte("start_at", monthStart.toISOString())
        .lte("start_at", monthEnd.toISOString())
        .eq("status", "approved")
        .order("start_at");

      setReservations((reservationData as RoomReservation[]) || []);

      // 승인된 수업 변경 요청 로드 (원래 일정을 "변경됨"으로 표시하기 위해)
      const { data: changeData } = await supabase
        .from("lesson_change_requests")
        .select("*")
        .eq("requested_by", user.id)
        .eq("status", "approved")
        .not("original_date", "is", null)
        .gte("original_date", monthStart.toISOString())
        .lte("original_date", monthEnd.toISOString());

      setApprovedChanges((changeData as LessonChangeRequest[]) || []);
    }

    setIsLoading(false);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleDateDoubleClick = (date: Date) => {
    setSelectedEvent(null);
    setModalInitialDate(date);
    setShowEventModal(true);
  };

  const handleAddClick = () => {
    setSelectedEvent(null);
    setModalInitialDate(selectedDate || new Date());
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalInitialDate(undefined);
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
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

  // Get all schedule items for a date (events + lessons + reservations)
  const getScheduleItemsForDate = (date: Date): ScheduleItem[] => {
    const items: ScheduleItem[] = [];

    // Add calendar events
    const dateEvents = getEventsForDate(date);
    dateEvents.forEach((event) => {
      items.push({
        id: event.id,
        title: event.title,
        start_at: event.start_at,
        end_at: event.end_at,
        type: "event",
        all_day: event.all_day,
        location: event.location,
        location_id: event.location_id,
        is_academy_holiday: event.is_academy_holiday,
        original: event,
      });
    });

    // Add lessons for students
    if (isStudentOrGuardian) {
      const dateLessons = lessons.filter((lesson) => {
        const lessonDate = new Date(lesson.scheduled_at);
        return isSameDay(lessonDate, date);
      });

      dateLessons.forEach((lesson) => {
        const startAt = new Date(lesson.scheduled_at);
        const endAt = new Date(startAt.getTime() + (lesson.duration_minutes || 60) * 60 * 1000);

        items.push({
          id: `lesson-${lesson.id}`,
          title: `수업 (${lesson.duration_minutes || 60}분)`,
          start_at: lesson.scheduled_at,
          end_at: endAt.toISOString(),
          type: "lesson",
          all_day: false,
          original: lesson,
        });
      });

      // Add reservations
      const dateReservations = reservations.filter((res) => {
        const resDate = new Date(res.start_at);
        return isSameDay(resDate, date);
      });

      dateReservations.forEach((res) => {
        items.push({
          id: `res-${res.id}`,
          title: `연습실 예약`,
          start_at: res.start_at,
          end_at: res.end_at,
          type: "reservation",
          all_day: false,
          original: res,
        });
      });

      // 승인된 변경 요청의 원래 일정 (변경됨으로 표시)
      const dateChangedLessons = approvedChanges.filter((change) => {
        if (!change.original_date) return false;
        const changeDate = new Date(change.original_date);
        return isSameDay(changeDate, date);
      });

      dateChangedLessons.forEach((change) => {
        if (!change.original_date) return;
        const originalDate = new Date(change.original_date);
        const endAt = new Date(originalDate.getTime() + 60 * 60 * 1000); // 기본 1시간

        items.push({
          id: `changed-${change.id}`,
          title: `수업 일정 변경됨`,
          start_at: change.original_date,
          end_at: endAt.toISOString(),
          type: "changed",
          all_day: false,
          original: change,
        });
      });
    }

    // Sort by time
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

  // 캘린더 날짜 계산
  const calendarMonthStart = startOfMonth(currentMonth);
  const calendarMonthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(calendarMonthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(calendarMonthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // 주 단위로 캘린더 일 그룹화
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedDateScheduleItems = selectedDate ? getScheduleItemsForDate(selectedDate) : [];
  const selectedDateHoliday = selectedDate
    ? getHolidayForDate(selectedDate)
    : null;

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </h2>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDate(new Date());
              }}
            >
              오늘
            </Button>
            <Button size="sm" onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-1" />
              일정 추가
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
                {/* Week Headers */}
                <div className="grid grid-cols-7 border-b bg-muted/30">
              {weekDays.map((day, i) => (
                <div
                  key={day}
                  className={cn(
                    "py-2 text-center text-xs font-medium",
                    i === 0 && "text-red-500",
                    i === 6 && "text-blue-500"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
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
                      // 이번 주에서 몇 일 동안 표시할지 계산
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

                return (
                  <div key={weekIndex} className="flex-1 relative grid grid-cols-7 border-b last:border-b-0">
                    {/* 날짜 셀들 */}
                    {week.map((day, dayIdx) => {
                      const holiday = getHolidayForDate(day);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const dayOfWeek = day.getDay();
                      const isHolidayDay = holiday !== null || dayOfWeek === 0;

                      // 해당 날짜의 단일 이벤트만 (멀티데이 제외)
                      const dayEvents = getEventsForDate(day);
                      const singleDayEvents = dayEvents.filter((event) => {
                        const eventStart = new Date(event.start_at);
                        const eventEnd = new Date(event.end_at);
                        eventStart.setHours(0, 0, 0, 0);
                        eventEnd.setHours(0, 0, 0, 0);
                        const daysDiff = Math.floor((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24));
                        return daysDiff < 1; // 하루 이벤트만
                      });

                      // 학생용: 해당 날짜의 수업과 예약
                      const dayLessons = isStudentOrGuardian ? lessons.filter(l => isSameDay(new Date(l.scheduled_at), day)) : [];
                      const dayReservations = isStudentOrGuardian ? reservations.filter(r => isSameDay(new Date(r.start_at), day)) : [];
                      // 학생용: 승인된 변경 요청 (원래 일정)
                      const dayChangedLessons = isStudentOrGuardian ? approvedChanges.filter(c => c.original_date && isSameDay(new Date(c.original_date), day)) : [];

                      // 통합 일정 아이템
                      const allDayItems: { type: "event" | "lesson" | "reservation" | "changed"; time: string; title: string; color: { bg: string; light: string; text: string }; id: string }[] = [];

                      // 단일 이벤트 추가
                      singleDayEvents.forEach((event) => {
                        allDayItems.push({
                          type: "event",
                          time: event.all_day ? "" : format(new Date(event.start_at), "HH:mm"),
                          title: event.title,
                          color: getEventColor(event),
                          id: event.id,
                        });
                      });

                      // 수업 추가
                      dayLessons.forEach((lesson) => {
                        allDayItems.push({
                          type: "lesson",
                          time: format(new Date(lesson.scheduled_at), "HH:mm"),
                          title: "수업",
                          color: { bg: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400" },
                          id: `lesson-${lesson.id}`,
                        });
                      });

                      // 예약 추가
                      dayReservations.forEach((res) => {
                        allDayItems.push({
                          type: "reservation",
                          time: format(new Date(res.start_at), "HH:mm"),
                          title: "예약",
                          color: { bg: "bg-purple-500", light: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" },
                          id: `res-${res.id}`,
                        });
                      });

                      // 변경된 수업 추가 (원래 일정)
                      dayChangedLessons.forEach((change) => {
                        if (!change.original_date) return;
                        allDayItems.push({
                          type: "changed",
                          time: format(new Date(change.original_date), "HH:mm"),
                          title: "변경됨",
                          color: { bg: "bg-gray-400", light: "bg-gray-100 dark:bg-gray-800/30", text: "text-gray-500 dark:text-gray-400" },
                          id: `changed-${change.id}`,
                        });
                      });

                      // 시간순 정렬
                      allDayItems.sort((a, b) => {
                        if (!a.time && b.time) return -1;
                        if (a.time && !b.time) return 1;
                        return a.time.localeCompare(b.time);
                      });

                      // 멀티데이 바 개수만큼 라벨 공간 확보
                      const multiDayBarCount = Math.min(multiDayEvents.length, 3);
                      const availableLabels = Math.max(0, maxLabels - multiDayBarCount);

                      return (
                        <button
                          key={dayIdx}
                          ref={weekIndex === 0 && dayIdx === 0 ? cellRef : undefined}
                          onClick={() => handleDateClick(day)}
                          onDoubleClick={() => handleDateDoubleClick(day)}
                          className={cn(
                            "relative flex flex-col px-0.5 pt-1 border-r last:border-r-0 text-left transition-colors overflow-hidden",
                            "hover:bg-muted/50",
                            !isCurrentMonth && "bg-muted/20",
                            isSelected && "bg-primary/5 ring-2 ring-primary ring-inset"
                          )}
                        >
                          {/* 날짜 헤더 */}
                          <div className="flex items-center justify-between w-full px-0.5 mb-0.5">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] shrink-0",
                                isToday(day) && "bg-primary text-primary-foreground font-bold",
                                !isCurrentMonth && "text-muted-foreground/50",
                                isCurrentMonth && !isToday(day) && isHolidayDay && "text-red-500",
                                isCurrentMonth && !isToday(day) && dayOfWeek === 6 && !isHolidayDay && "text-blue-500"
                              )}
                            >
                              {format(day, "d")}
                            </span>
                            {/* +N more 표시 */}
                            {isCurrentMonth && (allDayItems.length > availableLabels) && (
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
                          {/* 일정 라벨 (이벤트 + 수업 + 예약 + 변경됨) */}
                          {isCurrentMonth && allDayItems.length > 0 && (
                            <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden" style={{ marginTop: `${multiDayBarCount * 21 + 2}px` }}>
                              {allDayItems.slice(0, availableLabels).map((item) => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "flex items-center gap-1 text-xs leading-tight truncate px-1 py-0.5",
                                    item.type === "event" ? "bg-muted/50" : item.color.light,
                                    item.type === "changed" && "opacity-60",
                                    "hover:opacity-80"
                                  )}
                                >
                                  {/* 타입별 아이콘/닷 */}
                                  {item.type === "lesson" && (
                                    <BookOpen className="h-2.5 w-2.5 shrink-0 text-blue-500" />
                                  )}
                                  {item.type === "reservation" && (
                                    <CalendarIcon className="h-2.5 w-2.5 shrink-0 text-purple-500" />
                                  )}
                                  {item.type === "changed" && (
                                    <BookOpen className="h-2.5 w-2.5 shrink-0 text-gray-400" />
                                  )}
                                  {item.type === "event" && (
                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.color.bg)} />
                                  )}
                                  {item.time && (
                                    <span className={cn(
                                      "text-[10px] shrink-0",
                                      item.type === "changed" ? "text-gray-400 line-through" : "text-muted-foreground"
                                    )}>
                                      {item.time}
                                    </span>
                                  )}
                                  <span className={cn(
                                    "truncate",
                                    item.type === "changed" && "line-through text-gray-400"
                                  )}>{item.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* 멀티데이 이벤트 바 (절대 위치) */}
                    {multiDayEvents.slice(0, 3).map(({ event, startIdx, span, isStart, isEnd }, idx) => {
                      const eventColor = getEventColor(event);
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
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
                          <span className="truncate font-medium">{event.title}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l flex flex-col bg-background">
            {/* Selected Date Header */}
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleAddClick}
                >
                  <Plus className="h-3.5 w-3.5" />
                  추가
                </Button>
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
                      // Get color based on item type
                      const getItemColor = () => {
                        if (item.type === "lesson") {
                          return { bg: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400" };
                        }
                        if (item.type === "reservation") {
                          return { bg: "bg-purple-500", light: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" };
                        }
                        if (item.type === "changed") {
                          return { bg: "bg-gray-400", light: "bg-gray-100 dark:bg-gray-800/30", text: "text-gray-500 dark:text-gray-400" };
                        }
                        // Calendar event
                        if (item.original && "is_academy_holiday" in item.original) {
                          return getEventColor(item.original as CalendarEvent);
                        }
                        return DEFAULT_EVENT_COLOR;
                      };
                      const itemColor = getItemColor();

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.type === "event" && item.original) {
                              handleEventClick(item.original as CalendarEvent);
                            }
                          }}
                          className={cn(
                            "w-full p-2.5 rounded border border-border/40 hover:border-border hover:bg-muted/30 transition-colors text-left group",
                            item.type !== "event" && "cursor-default",
                            item.type === "changed" && "opacity-60"
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={cn(
                                "w-1 h-full min-h-[36px] rounded-full shrink-0 mt-0.5",
                                itemColor.bg
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  "font-medium text-sm truncate flex-1",
                                  item.type === "changed" && "line-through text-gray-400"
                                )}>
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
                                {item.type === "changed" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 shrink-0">
                                    변경됨
                                  </span>
                                )}
                                {item.is_academy_holiday && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 shrink-0">
                                    휴일
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
                                {item.location && (
                                  <>
                                    <span className="text-muted-foreground/50">·</span>
                                    <span className="truncate">{item.location}</span>
                                  </>
                                )}
                              </div>
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
                    <p className="text-sm text-muted-foreground">
                      일정이 없습니다
                    </p>
                    {!isStudentOrGuardian && (
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
                        const itemColor = item.type === "event" && item.original
                          ? getEventColor(item.original as CalendarEvent)
                          : DEFAULT_EVENT_COLOR;
                        return (
                          <button
                            key={item.id}
                            onClick={() => item.type === "event" && item.original && handleEventClick(item.original as CalendarEvent)}
                            className={cn(
                              "w-full text-left text-xs px-2 py-1.5 rounded-sm flex items-center gap-2 border border-border/30",
                              itemColor.light,
                              "hover:opacity-80"
                            )}
                          >
                            <span className="font-medium truncate">{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 시간 그리드 + 이벤트 바 */}
                  <div className="relative flex">
                    {/* 시간 라벨 */}
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

                    {/* 그리드 라인 + 이벤트 */}
                    <div className="flex-1 relative">
                      {/* 그리드 라인 */}
                      {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                        <div
                          key={hour}
                          className="h-10 border-b border-dashed border-muted"
                        />
                      ))}

                      {/* 현재 시간 표시선 (오늘만) */}
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

                      {/* 이벤트 바 (절대 위치) - 겹치는 이벤트 처리 */}
                      {(() => {
                        const timeItems = selectedDateScheduleItems.filter(e => !e.all_day);
                        // 각 아이템의 열(column) 계산
                        const itemColumns: { item: ScheduleItem; col: number; totalCols: number }[] = [];

                        timeItems.forEach((item) => {
                          const startDate = new Date(item.start_at);
                          const endDate = new Date(item.end_at);
                          const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                          const endHour = endDate.getHours() + endDate.getMinutes() / 60;

                          // 겹치는 아이템들 찾기
                          let col = 0;
                          const overlapping = itemColumns.filter(ic => {
                            const icStart = new Date(ic.item.start_at);
                            const icEnd = new Date(ic.item.end_at);
                            const icStartHour = icStart.getHours() + icStart.getMinutes() / 60;
                            const icEndHour = icEnd.getHours() + icEnd.getMinutes() / 60;
                            return startHour < icEndHour && endHour > icStartHour;
                          });

                          // 사용 가능한 열 찾기
                          const usedCols = overlapping.map(o => o.col);
                          while (usedCols.includes(col)) col++;

                          itemColumns.push({ item, col, totalCols: 1 });
                        });

                        // totalCols 업데이트
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
                          // Get color based on item type
                          const getItemColor = () => {
                            if (item.type === "lesson") {
                              return { bg: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400" };
                            }
                            if (item.type === "reservation") {
                              return { bg: "bg-purple-500", light: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" };
                            }
                            if (item.type === "changed") {
                              return { bg: "bg-gray-400", light: "bg-gray-100 dark:bg-gray-800/30", text: "text-gray-500 dark:text-gray-400" };
                            }
                            if (item.type === "event" && item.original) {
                              return getEventColor(item.original as CalendarEvent);
                            }
                            return DEFAULT_EVENT_COLOR;
                          };
                          const itemColor = getItemColor();

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

                          return (
                            <button
                              key={item.id}
                              onClick={() => item.type === "event" && item.original && handleEventClick(item.original as CalendarEvent)}
                              className={cn(
                                "absolute text-left text-xs px-1.5 py-1 rounded overflow-hidden border border-border/30",
                                itemColor.light,
                                "hover:opacity-80 border-l-2",
                                itemColor.bg.replace("bg-", "border-l-"),
                                item.type !== "event" && "cursor-default",
                                item.type === "changed" && "opacity-60"
                              )}
                              style={{
                                top: `${topOffset}px`,
                                height: `${height}px`,
                                width,
                                left,
                              }}
                            >
                              <div className={cn(
                                "font-medium truncate text-[11px] flex items-center gap-1",
                                item.type === "changed" && "line-through text-gray-400"
                              )}>
                                {item.type === "lesson" && <BookOpen className="h-2.5 w-2.5 shrink-0" />}
                                {item.type === "reservation" && <CalendarIcon className="h-2.5 w-2.5 shrink-0" />}
                                {item.type === "changed" && <BookOpen className="h-2.5 w-2.5 shrink-0 text-gray-400" />}
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={handleCloseModal}
        onSuccess={loadEvents}
        groupId={params.id}
        isEducationType={isEducationType}
        initialDate={modalInitialDate}
        event={selectedEvent}
        locations={group?.settings?.classes || []}
        existingEvents={events}
      />
    </>
  );
}
