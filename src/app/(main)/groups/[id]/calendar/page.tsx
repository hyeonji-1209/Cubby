"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { CalendarEvent, Group } from "@/types";
import { cn } from "@/lib/utils";
import { getHolidaysForMonth, Holiday } from "@/lib/holidays";
import { EventModal } from "@/components/calendar/event-modal";

interface CalendarPageProps {
  params: { id: string };
}

export default function CalendarPage({ params }: CalendarPageProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // 모달 상태
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const isEducationType = group?.type === "education";

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

  useEffect(() => {
    loadGroup();
  }, [params.id]);

  useEffect(() => {
    if (group) {
      loadEvents();
    }
  }, [params.id, currentMonth, group]);

  const loadGroup = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("id", params.id)
      .single();

    setGroup(data as Group);
  };

  const loadEvents = async () => {
    const supabase = createClient();

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("group_id", params.id)
      .gte("start_at", monthStart.toISOString())
      .lte("start_at", monthEnd.toISOString())
      .order("start_at");

    setEvents((data as CalendarEvent[]) || []);
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

  // 해당 날짜에서 이벤트가 몇 일 더 지속되는지 (해당 주 내에서)
  const getEventSpanInWeek = (event: CalendarEvent, date: Date, weekEndDate: Date) => {
    const eventEnd = new Date(event.end_at);
    eventEnd.setHours(23, 59, 59, 999);

    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekEndDate);
    weekEnd.setHours(23, 59, 59, 999);

    // 이벤트 종료일과 주 종료일 중 더 이른 날짜까지
    const endDate = eventEnd < weekEnd ? eventEnd : weekEnd;

    // 날짜 차이 계산 (일 수)
    const diffTime = endDate.getTime() - currentDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return Math.min(diffDays, 7 - date.getDay()); // 주 끝까지만
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

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
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

                // 이번 주에 표시할 이벤트들 계산
                const weekEvents: { event: CalendarEvent; startIdx: number; span: number; isStart: boolean; isEnd: boolean }[] = [];
                const processedEventIds = new Set<string>();

                week.forEach((day, dayIdx) => {
                  const dayEvents = getEventsForDate(day);
                  dayEvents.forEach((event) => {
                    if (processedEventIds.has(event.id)) return;

                    const eventStart = new Date(event.start_at);
                    const eventEnd = new Date(event.end_at);
                    eventStart.setHours(0, 0, 0, 0);
                    eventEnd.setHours(23, 59, 59, 999);

                    // 이 날짜가 이벤트 시작일이거나, 주의 첫 날인 경우에만 바 표시
                    if (isSameDay(eventStart, day) || dayIdx === 0) {
                      const span = getEventSpanInWeek(event, day, weekEndDate);
                      const isStart = isSameDay(eventStart, day);
                      const isEnd = isSameDay(eventEnd, week[dayIdx + span - 1] || weekEndDate);
                      weekEvents.push({ event, startIdx: dayIdx, span, isStart, isEnd });
                      processedEventIds.add(event.id);
                    }
                  });
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

                      return (
                        <button
                          key={dayIdx}
                          onClick={() => handleDateClick(day)}
                          onDoubleClick={() => handleDateDoubleClick(day)}
                          className={cn(
                            "relative flex flex-col px-1 pt-1 border-r last:border-r-0 text-left transition-colors",
                            "hover:bg-muted/50",
                            !isCurrentMonth && "bg-muted/20",
                            isSelected && "bg-primary/5 ring-2 ring-primary ring-inset"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs shrink-0",
                              isToday(day) && "bg-primary text-primary-foreground font-bold",
                              !isCurrentMonth && "text-muted-foreground/50",
                              isCurrentMonth && !isToday(day) && isHolidayDay && "text-red-500",
                              isCurrentMonth && !isToday(day) && dayOfWeek === 6 && !isHolidayDay && "text-blue-500"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          {holiday && isCurrentMonth && (
                            <div className="text-[8px] text-red-500 truncate leading-tight">
                              {holiday.name}
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* 이벤트 바 (절대 위치) */}
                    <div className="absolute inset-0 pointer-events-none" style={{ top: '32px' }}>
                      {weekEvents.slice(0, 3).map(({ event, startIdx, span, isStart, isEnd }, idx) => (
                        <div
                          key={event.id}
                          className={cn(
                            "absolute h-[16px] text-[10px] leading-[16px] truncate px-1.5 cursor-pointer pointer-events-auto",
                            event.is_academy_holiday
                              ? "bg-red-500 text-white"
                              : "bg-primary/80 text-primary-foreground",
                            isStart && "rounded-l",
                            isEnd && "rounded-r"
                          )}
                          style={{
                            left: `calc(${(startIdx / 7) * 100}% + 2px)`,
                            width: `calc(${(span / 7) * 100}% - 4px)`,
                            top: `${idx * 18}px`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          {isStart && event.title}
                        </div>
                      ))}
                      {weekEvents.length > 3 && (
                        <div className="absolute right-1 text-[10px] text-muted-foreground pointer-events-auto" style={{ top: '54px' }}>
                          +{weekEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l flex flex-col bg-muted/10">
            {/* Selected Date Header */}
            <div className="p-4 border-b">
              <p className="text-xs text-muted-foreground">
                {selectedDate
                  ? format(selectedDate, "yyyy년", { locale: ko })
                  : format(new Date(), "yyyy년", { locale: ko })}
              </p>
              <p className="text-lg font-bold">
                {selectedDate
                  ? format(selectedDate, "M월 d일 EEEE", { locale: ko })
                  : format(new Date(), "M월 d일 EEEE", { locale: ko })}
              </p>
              {selectedDateHoliday && (
                <p className="text-sm text-red-500 mt-1">
                  {selectedDateHoliday.name}
                </p>
              )}
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">일정</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleAddClick}
                >
                  <Plus className="h-3 w-3" />
                  추가
                </Button>
              </div>

              {selectedDateEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={cn(
                        "w-full p-3 rounded-lg border transition-colors text-left",
                        event.is_academy_holiday
                          ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900 hover:border-red-300 dark:hover:border-red-800"
                          : "bg-card hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "font-medium text-sm",
                            event.is_academy_holiday &&
                              "text-red-600 dark:text-red-400"
                          )}
                        >
                          {event.title}
                        </p>
                        {event.is_academy_holiday && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                            휴일
                          </span>
                        )}
                      </div>
                      {!event.all_day && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.start_at), "HH:mm")} -{" "}
                          {format(new Date(event.end_at), "HH:mm")}
                        </div>
                      )}
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    일정이 없습니다
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={handleAddClick}
                  >
                    일정 추가하기
                  </Button>
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
      />
    </>
  );
}
