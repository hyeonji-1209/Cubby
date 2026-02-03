"use client";

import { useState, useMemo, ReactNode, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  differenceInDays,
  isBefore,
  isAfter,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { getHolidaysForMonth, Holiday } from "@/lib/holidays";
import { CalendarEvent, Group } from "@/types";
import { WEEK_DAYS } from "@/lib/constants";

export type { CalendarEvent };

// 모임별 색상 팔레트
const GROUP_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-100 dark:bg-blue-950/50", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-emerald-500", light: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-amber-500", light: "bg-amber-100 dark:bg-amber-950/50", text: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-purple-500", light: "bg-purple-100 dark:bg-purple-950/50", text: "text-purple-600 dark:text-purple-400" },
  { bg: "bg-pink-500", light: "bg-pink-100 dark:bg-pink-950/50", text: "text-pink-600 dark:text-pink-400" },
  { bg: "bg-cyan-500", light: "bg-cyan-100 dark:bg-cyan-950/50", text: "text-cyan-600 dark:text-cyan-400" },
  { bg: "bg-orange-500", light: "bg-orange-100 dark:bg-orange-950/50", text: "text-orange-600 dark:text-orange-400" },
  { bg: "bg-indigo-500", light: "bg-indigo-100 dark:bg-indigo-950/50", text: "text-indigo-600 dark:text-indigo-400" },
];

const DEFAULT_COLOR = { bg: "bg-primary", light: "bg-primary/20", text: "text-primary" };

interface EventPosition {
  event: CalendarEvent;
  startCol: number;
  span: number;
  row: number;
  isStart: boolean;
  isEnd: boolean;
}

interface BaseCalendarProps {
  events: CalendarEvent[];
  groups?: Group[]; // 모임별 색상 매핑용
  renderAddButton?: () => ReactNode;
}

export function BaseCalendar({ events, groups = [], renderAddButton }: BaseCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [maxLabels, setMaxLabels] = useState(3);
  const cellRef = useRef<HTMLButtonElement>(null);

  // 모임별 색상 매핑
  const groupColorMap = useMemo(() => {
    const map = new Map<string, typeof GROUP_COLORS[0]>();
    groups.forEach((group, idx) => {
      map.set(group.id, GROUP_COLORS[idx % GROUP_COLORS.length]);
    });
    return map;
  }, [groups]);

  // 이벤트 색상 가져오기 (모임 기반)
  const getEventColor = (event: CalendarEvent) => {
    if (event.is_academy_holiday) {
      return { bg: "bg-red-500", light: "bg-red-100 dark:bg-red-950/50", text: "text-red-600 dark:text-red-400" };
    }
    if (event.group_id) {
      return groupColorMap.get(event.group_id) || DEFAULT_COLOR;
    }
    return DEFAULT_COLOR;
  };

  // 셀 높이에 따라 최대 라벨 수 계산
  useEffect(() => {
    const calculateMaxLabels = () => {
      if (!cellRef.current) return;
      const cellHeight = cellRef.current.clientHeight;
      // 헤더 영역(날짜, 공휴일): 약 32px
      // 각 라벨 높이: 약 16px (padding 포함)
      const headerHeight = 32;
      const labelHeight = 16;
      const availableHeight = cellHeight - headerHeight;
      const calculatedMax = Math.max(1, Math.floor(availableHeight / labelHeight));
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

  const selectedDateEvents = getEventsForDate(selectedDate);

  const getHolidayForDate = (date: Date): Holiday | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return holidayMap.get(dateStr) || null;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 주 단위로 나누기
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // 멀티데이 이벤트인지 확인
  const isMultiDayEvent = (event: CalendarEvent) => {
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return differenceInDays(end, start) >= 1;
  };

  // 주별 이벤트 위치 계산
  const getWeekEventPositions = (daysInWeek: Date[]): EventPosition[] => {
    const weekStart = daysInWeek[0];
    const weekEnd = daysInWeek[6];
    const positions: EventPosition[] = [];
    const rows: boolean[][] = [];

    const multiDayEvents = events
      .filter((event) => {
        const eventStart = new Date(event.start_at);
        const eventEnd = new Date(event.end_at);
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(23, 59, 59, 999);

        return !isAfter(eventStart, weekEnd) && !isBefore(eventEnd, weekStart) && isMultiDayEvent(event);
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    multiDayEvents.forEach((event) => {
      const eventStart = new Date(event.start_at);
      const eventEnd = new Date(event.end_at);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(23, 59, 59, 999);

      const displayStart = isBefore(eventStart, weekStart) ? weekStart : eventStart;
      const displayEnd = isAfter(eventEnd, weekEnd) ? weekEnd : eventEnd;

      const startCol = daysInWeek.findIndex((d) => isSameDay(d, displayStart));
      const endCol = daysInWeek.findIndex((d) => isSameDay(d, displayEnd));
      const span = endCol - startCol + 1;

      const isStart = isSameDay(eventStart, displayStart);
      const isEnd = isSameDay(eventEnd, displayEnd);

      let row = 0;
      while (true) {
        if (!rows[row]) rows[row] = new Array(7).fill(false);

        let canPlace = true;
        for (let col = startCol; col <= endCol; col++) {
          if (rows[row][col]) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          for (let col = startCol; col <= endCol; col++) {
            rows[row][col] = true;
          }
          break;
        }
        row++;
        if (row > 3) break;
      }

      if (row <= 3) {
        positions.push({
          event,
          startCol,
          span,
          row,
          isStart,
          isEnd,
        });
      }
    });

    return positions;
  };

  const selectedDateHoliday = getHolidayForDate(selectedDate);

  const defaultAddButton = () => (
    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
      <Plus className="h-3 w-3" />
      추가
    </Button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 border-b">
        <div className="flex items-center gap-2 md:gap-4">
          <h2 className="text-base md:text-xl font-bold">
            {format(currentMonth, "yyyy년 M월", { locale: ko })}
          </h2>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs md:h-9 md:text-sm"
          onClick={() => {
            setCurrentMonth(new Date());
            setSelectedDate(new Date());
          }}
        >
          오늘
        </Button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 border-b">
            {WEEK_DAYS.map((day, i) => (
              <div
                key={day}
                className={`py-3 text-center text-xs font-medium ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 flex flex-col">
            {weeks.map((daysInWeek, weekIndex) => {
              const eventPositions = getWeekEventPositions(daysInWeek);

              return (
                <div key={weekIndex} className="flex-1 relative grid grid-cols-7 border-b last:border-b-0">
                  {/* 날짜 셀들 */}
                  {daysInWeek.map((day, dayIndex) => {
                    const holiday = getHolidayForDate(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const dayOfWeek = day.getDay();
                    const isHolidayDay = holiday !== null || dayOfWeek === 0;

                    const dayEvents = getEventsForDate(day);
                    // 하루종일 이벤트 먼저, 시간순 정렬
                    const sortedDayEvents = [...dayEvents].sort((a, b) => {
                      if (a.all_day && !b.all_day) return -1;
                      if (!a.all_day && b.all_day) return 1;
                      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
                    });

                    return (
                      <button
                        key={dayIndex}
                        ref={weekIndex === 0 && dayIndex === 0 ? cellRef : undefined}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          relative flex flex-col px-1 pt-1 border-r last:border-r-0 text-left transition-colors
                          hover:bg-muted/50
                          ${!isCurrentMonth ? "bg-muted/30" : ""}
                          ${isSelected ? "bg-primary/5 ring-2 ring-primary ring-inset" : ""}
                        `}
                      >
                        {/* 날짜 헤더 라인 */}
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`
                              inline-flex items-center justify-center w-6 h-6 rounded-full text-xs shrink-0
                              ${isToday(day) ? "bg-primary text-primary-foreground font-semibold" : ""}
                              ${!isCurrentMonth ? "text-muted-foreground/50" : ""}
                              ${isCurrentMonth && !isToday(day) && isHolidayDay ? "text-red-400" : ""}
                              ${dayOfWeek === 6 && isCurrentMonth && !isToday(day) && !isHolidayDay ? "text-blue-400" : ""}
                            `}
                          >
                            {format(day, "d")}
                          </span>
                          {/* +N more 표시 (오른쪽 끝) */}
                          {isCurrentMonth && sortedDayEvents.length > maxLabels && (
                            <span className="text-[8px] text-muted-foreground">
                              +{sortedDayEvents.length - maxLabels}
                            </span>
                          )}
                        </div>
                        {holiday && isCurrentMonth && (
                          <div className="text-[8px] text-red-400 truncate leading-tight">
                            {holiday.name}
                          </div>
                        )}
                        {/* 일정 라벨 (높이에 따라 자동 표시) */}
                        {isCurrentMonth && sortedDayEvents.length > 0 && (
                          <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                            {sortedDayEvents.slice(0, maxLabels).map((event) => {
                              const eventColor = getEventColor(event);
                              return (
                                <div
                                  key={event.id}
                                  className={`text-[8px] leading-tight truncate px-1 py-0.5 rounded ${eventColor.light} ${eventColor.text}`}
                                >
                                  {!event.all_day && (
                                    <span className="opacity-70">
                                      {format(new Date(event.start_at), "HH:mm")}{" "}
                                    </span>
                                  )}
                                  {event.title}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* 이벤트 바 (절대 위치) */}
                  <div className="absolute inset-0 pointer-events-none" style={{ top: '32px' }}>
                    {eventPositions.map((pos) => {
                      const leftPercent = (pos.startCol / 7) * 100;
                      const widthPercent = (pos.span / 7) * 100;
                      const topPx = pos.row * 18;
                      const eventColor = getEventColor(pos.event);

                      return (
                        <div
                          key={`${pos.event.id}-${weekIndex}`}
                          className={`
                            absolute h-[16px] text-[10px] leading-[16px] truncate px-1.5
                            ${eventColor.bg} text-white
                            ${pos.isStart ? "rounded-l" : ""}
                            ${pos.isEnd ? "rounded-r" : ""}
                          `}
                          style={{
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                            top: `${topPx}px`,
                          }}
                        >
                          {pos.isStart && pos.event.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Panel - Desktop */}
        <div className="hidden md:flex w-72 border-l flex-col bg-muted/20">
          <div className="p-4 border-b">
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, "yyyy년", { locale: ko })}
            </p>
            <p className="text-lg font-bold">
              {format(selectedDate, "M월 d일 EEEE", { locale: ko })}
            </p>
            {selectedDateHoliday && (
              <p className="text-sm text-red-400 mt-1">{selectedDateHoliday.name}</p>
            )}
          </div>

          <div className="flex-1 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">일정</span>
              {renderAddButton ? renderAddButton() : defaultAddButton()}
            </div>

            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg bg-card border hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <p className="font-medium text-sm">{event.title}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(event.start_at), "HH:mm")} -{" "}
                      {format(new Date(event.end_at), "HH:mm")}
                    </div>
                  </div>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Date Panel - Mobile */}
      <div className="md:hidden border-t p-3 bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium">
              {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
            </p>
            {selectedDateHoliday && (
              <p className="text-xs text-red-400">{selectedDateHoliday.name}</p>
            )}
          </div>
          {renderAddButton ? renderAddButton() : defaultAddButton()}
        </div>
        {selectedDateEvents.length > 0 ? (
          <div className="space-y-2">
            {selectedDateEvents.map((event) => (
              <div
                key={event.id}
                className="p-2.5 rounded-lg bg-card border text-sm"
              >
                <p className="font-medium">{event.title}</p>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(event.start_at), "HH:mm")} - {format(new Date(event.end_at), "HH:mm")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">일정이 없습니다</p>
        )}
      </div>
    </div>
  );
}
