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
  MapPin,
  List,
  AlignJustify,
} from "lucide-react";
import { CalendarEvent, Group } from "@/types";
import { cn } from "@/lib/utils";
import { getHolidaysForMonth, Holiday } from "@/lib/holidays";
import { EventModal } from "@/components/calendar/event-modal";

// 장소별 색상 팔레트
const LOCATION_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-200 dark:bg-blue-900/60", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-emerald-500", light: "bg-emerald-200 dark:bg-emerald-900/60", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-amber-500", light: "bg-amber-200 dark:bg-amber-900/60", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-purple-500", light: "bg-purple-200 dark:bg-purple-900/60", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-pink-500", light: "bg-pink-200 dark:bg-pink-900/60", text: "text-pink-700 dark:text-pink-300" },
  { bg: "bg-cyan-500", light: "bg-cyan-200 dark:bg-cyan-900/60", text: "text-cyan-700 dark:text-cyan-300" },
  { bg: "bg-orange-500", light: "bg-orange-200 dark:bg-orange-900/60", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-indigo-500", light: "bg-indigo-200 dark:bg-indigo-900/60", text: "text-indigo-700 dark:text-indigo-300" },
];

// 기본 색상 (장소 미지정)
const DEFAULT_COLOR = { bg: "bg-primary", light: "bg-primary/25", text: "text-primary" };

interface CalendarPageProps {
  params: { id: string };
}

export default function CalendarPage({ params }: CalendarPageProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // 사이드 패널 뷰 모드 상태 (list: 리스트, timeline: 타임라인)
  const [sidePanelView, setSidePanelView] = useState<"list" | "timeline">("list");

  // 모달 상태
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const isEducationType = group?.type === "education";

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

    calculateMaxLabels();

    const resizeObserver = new ResizeObserver(calculateMaxLabels);
    if (cellRef.current) {
      resizeObserver.observe(cellRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

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
    const map = new Map<string, typeof LOCATION_COLORS[0]>();
    locations.forEach((loc, idx) => {
      map.set(loc.id, LOCATION_COLORS[idx % LOCATION_COLORS.length]);
    });
    return map;
  }, [group?.settings?.classes]);

  // 이벤트의 색상 가져오기
  const getEventColor = (event: CalendarEvent) => {
    if (event.is_academy_holiday) {
      return { bg: "bg-red-500", light: "bg-red-200 dark:bg-red-900/60", text: "text-red-600 dark:text-red-400" };
    }
    if (event.location_id) {
      return locationColorMap.get(event.location_id) || DEFAULT_COLOR;
    }
    return DEFAULT_COLOR;
  };

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
                      const sortedDayEvents = [...singleDayEvents].sort((a, b) => {
                        if (a.all_day && !b.all_day) return -1;
                        if (!a.all_day && b.all_day) return 1;
                        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
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
                            {isCurrentMonth && (sortedDayEvents.length > availableLabels || dayEvents.length > maxLabels) && (
                              <span className="text-[9px] text-muted-foreground">
                                +{Math.max(0, sortedDayEvents.length - availableLabels)}
                              </span>
                            )}
                          </div>
                          {holiday && isCurrentMonth && (
                            <div className="text-[9px] text-red-500 truncate leading-tight px-0.5">
                              {holiday.name}
                            </div>
                          )}
                          {/* 일정 라벨 (단일 이벤트만) */}
                          {isCurrentMonth && sortedDayEvents.length > 0 && (
                            <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden" style={{ marginTop: `${multiDayBarCount * 21 + 2}px` }}>
                              {sortedDayEvents.slice(0, availableLabels).map((event) => {
                                const eventColor = getEventColor(event);
                                return (
                                  <div
                                    key={event.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventClick(event);
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 text-xs leading-tight truncate px-1.5 py-0.5 rounded cursor-pointer",
                                      "bg-muted/60 hover:bg-muted text-foreground/90"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        eventColor.bg
                                      )}
                                    />
                                    {!event.all_day && (
                                      <span className="text-muted-foreground shrink-0">
                                        {format(new Date(event.start_at), "HH:mm")}
                                      </span>
                                    )}
                                    <span className="truncate">{event.title}</span>
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
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          className={cn(
                            "absolute h-[19px] flex items-center cursor-pointer z-10",
                            "text-xs text-foreground/90 truncate",
                            eventColor.light,
                            "hover:opacity-80",
                            isStart ? "rounded-l-sm pl-1.5" : "pl-0.5",
                            isEnd ? "rounded-r-sm pr-1.5" : "pr-0.5"
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
                              "w-2 h-2 rounded-full shrink-0 mr-1",
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

            {/* Events List/Timeline */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">일정</span>
                  {/* 뷰 모드 토글 */}
                  <div className="flex items-center rounded-md border p-0.5">
                    <button
                      onClick={() => setSidePanelView("list")}
                      className={cn(
                        "p-1 rounded transition-colors",
                        sidePanelView === "list"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                      title="리스트"
                    >
                      <List className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setSidePanelView("timeline")}
                      className={cn(
                        "p-1 rounded transition-colors",
                        sidePanelView === "timeline"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                      title="타임라인"
                    >
                      <AlignJustify className="h-3 w-3" />
                    </button>
                  </div>
                </div>
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

              {sidePanelView === "list" ? (
                /* 리스트 뷰 */
                selectedDateEvents.length > 0 ? (
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
                        {event.location && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {event.location}
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
                )
              ) : (
                /* 타임라인 뷰 (24시간) */
                <div className="relative">
                  {/* 시간 그리드 */}
                  <div className="space-y-0">
                    {Array.from({ length: 24 }, (_, hour) => {
                      // 해당 시간에 시작하는 이벤트들
                      const hourEvents = selectedDateEvents.filter((event) => {
                        if (event.all_day) return hour === 0;
                        const eventHour = new Date(event.start_at).getHours();
                        return eventHour === hour;
                      });

                      return (
                        <div key={hour} className="flex min-h-[40px] border-b border-dashed border-muted">
                          <div className="w-12 shrink-0 text-[10px] text-muted-foreground py-1 pr-2 text-right">
                            {hour.toString().padStart(2, "0")}:00
                          </div>
                          <div className="flex-1 py-1 space-y-1">
                            {hourEvents.map((event) => (
                              <button
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className={cn(
                                  "w-full text-left text-xs px-2 py-1 rounded truncate",
                                  event.is_academy_holiday
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                    : "bg-primary/20 text-primary hover:bg-primary/30"
                                )}
                              >
                                {event.all_day ? (
                                  <span className="font-medium">하루종일 - {event.title}</span>
                                ) : (
                                  <>
                                    <span className="opacity-70">
                                      {format(new Date(event.start_at), "HH:mm")}
                                    </span>
                                    {" "}{event.title}
                                    {event.location && (
                                      <span className="opacity-50"> · {event.location}</span>
                                    )}
                                  </>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
