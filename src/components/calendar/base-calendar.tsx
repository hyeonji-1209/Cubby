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
import { cn } from "@/lib/utils";
import {
  CALENDAR_COLORS,
  DEFAULT_EVENT_COLOR,
  HOLIDAY_COLOR,
  CalendarColor,
} from "@/lib/calendar-colors";

export type { CalendarEvent };

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
  onEventClick?: (event: CalendarEvent) => void;
  onAddClick?: (date: Date) => void;
}

export function BaseCalendar({ events, groups = [], renderAddButton, onEventClick, onAddClick }: BaseCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [maxLabels, setMaxLabels] = useState(3);
  const [sidePanelView, setSidePanelView] = useState<"list" | "timeline">("timeline");
  const cellRef = useRef<HTMLButtonElement>(null);

  // 모임별 색상 매핑
  const groupColorMap = useMemo(() => {
    const map = new Map<string, CalendarColor>();
    groups.forEach((group, idx) => {
      map.set(group.id, CALENDAR_COLORS[idx % CALENDAR_COLORS.length]);
    });
    return map;
  }, [groups]);

  // 이벤트 색상 가져오기 (모임 기반)
  const getEventColor = (event: CalendarEvent) => {
    if (event.is_academy_holiday) {
      return HOLIDAY_COLOR;
    }
    if (event.group_id) {
      return groupColorMap.get(event.group_id) || DEFAULT_EVENT_COLOR;
    }
    return DEFAULT_EVENT_COLOR;
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
    <Button
      variant="outline"
      size="sm"
      className="h-8 text-xs gap-1.5"
      onClick={() => onAddClick?.(selectedDate)}
    >
      <Plus className="h-3.5 w-3.5" />
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

        {/* Side Panel - Desktop */}
        <div className="hidden md:flex w-80 border-l flex-col bg-background">
          {/* Selected Date Header */}
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  {format(selectedDate, "yyyy년", { locale: ko })}
                </p>
                <p className="text-base font-semibold mt-0.5">
                  {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
                </p>
              </div>
              {renderAddButton ? renderAddButton() : defaultAddButton()}
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
              selectedDateEvents.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedDateEvents.map((event) => {
                    const eventColor = getEventColor(event);
                    const isPersonalEvent = !event.group_id;
                    const isClickable = onEventClick && isPersonalEvent;
                    const groupName = event.group_id ? groups.find(g => g.id === event.group_id)?.name : null;

                    return (
                      <button
                        key={event.id}
                        onClick={() => isClickable && onEventClick(event)}
                        disabled={!isClickable}
                        className={cn(
                          "w-full p-2.5 rounded border border-border/40 transition-colors text-left",
                          isClickable
                            ? "hover:border-border hover:bg-muted/30 cursor-pointer"
                            : "cursor-default"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              "w-1 h-full min-h-[36px] rounded-full shrink-0 mt-0.5",
                              eventColor.bg
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate flex-1">
                                {event.title}
                              </p>
                              {event.is_academy_holiday && (
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
                              {event.all_day ? (
                                <span>하루 종일</span>
                              ) : (
                                <span>
                                  {format(new Date(event.start_at), "HH:mm")} - {format(new Date(event.end_at), "HH:mm")}
                                </span>
                              )}
                              {event.location && (
                                <>
                                  <span className="text-muted-foreground/50">·</span>
                                  <span className="truncate">{event.location}</span>
                                </>
                              )}
                            </div>
                            {event.description && (
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
                  <p className="text-sm text-muted-foreground">
                    일정이 없습니다
                  </p>
                </div>
              )
            ) : (
              /* 타임라인 뷰 */
              <div className="relative">
                {/* 하루종일 이벤트 */}
                {selectedDateEvents.filter(e => e.all_day).length > 0 && (
                  <div className="mb-3 pb-3 border-b space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">하루 종일</p>
                    {selectedDateEvents.filter(e => e.all_day).map((event) => {
                      const eventColor = getEventColor(event);
                      const isPersonalEvent = !event.group_id;
                      const isClickable = onEventClick && isPersonalEvent;
                      const groupName = event.group_id ? groups.find(g => g.id === event.group_id)?.name : null;

                      return (
                        <button
                          key={event.id}
                          onClick={() => isClickable && onEventClick(event)}
                          disabled={!isClickable}
                          className={cn(
                            "w-full text-left text-xs px-2 py-1.5 rounded-sm flex items-center gap-2 border border-border/30",
                            eventColor.light,
                            isClickable ? "hover:opacity-80 cursor-pointer" : "cursor-default"
                          )}
                        >
                          <span className="font-medium truncate flex-1">{event.title}</span>
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
                    {isToday(selectedDate) && (() => {
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

                    {/* 이벤트 바 (절대 위치) */}
                    {(() => {
                      const timeEvents = selectedDateEvents.filter(e => !e.all_day);
                      const eventColumns: { event: CalendarEvent; col: number; totalCols: number }[] = [];

                      timeEvents.forEach((event) => {
                        const startDate = new Date(event.start_at);
                        const endDate = new Date(event.end_at);
                        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                        const endHour = endDate.getHours() + endDate.getMinutes() / 60;

                        let col = 0;
                        const overlapping = eventColumns.filter(ec => {
                          const ecStart = new Date(ec.event.start_at);
                          const ecEnd = new Date(ec.event.end_at);
                          const ecStartHour = ecStart.getHours() + ecStart.getMinutes() / 60;
                          const ecEndHour = ecEnd.getHours() + ecEnd.getMinutes() / 60;
                          return startHour < ecEndHour && endHour > ecStartHour;
                        });

                        const usedCols = overlapping.map(o => o.col);
                        while (usedCols.includes(col)) col++;

                        eventColumns.push({ event, col, totalCols: 1 });
                      });

                      eventColumns.forEach(ec => {
                        const startDate = new Date(ec.event.start_at);
                        const endDate = new Date(ec.event.end_at);
                        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                        const endHour = endDate.getHours() + endDate.getMinutes() / 60;

                        const overlapping = eventColumns.filter(other => {
                          const otherStart = new Date(other.event.start_at);
                          const otherEnd = new Date(other.event.end_at);
                          const otherStartHour = otherStart.getHours() + otherStart.getMinutes() / 60;
                          const otherEndHour = otherEnd.getHours() + otherEnd.getMinutes() / 60;
                          return startHour < otherEndHour && endHour > otherStartHour;
                        });

                        ec.totalCols = Math.max(...overlapping.map(o => o.col)) + 1;
                      });

                      return eventColumns.map(({ event, col, totalCols }) => {
                        const eventColor = getEventColor(event);
                        const startDate = new Date(event.start_at);
                        const endDate = new Date(event.end_at);
                        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
                        const duration = endHour - startHour;

                        const topOffset = (startHour - 7) * 40;
                        const height = Math.max(duration * 40, 24);

                        if (startHour < 7 || startHour >= 22) return null;

                        const width = `calc((100% - 8px) / ${totalCols})`;
                        const left = `calc(4px + (100% - 8px) / ${totalCols} * ${col})`;

                        const isPersonalEvent = !event.group_id;
                        const isClickable = onEventClick && isPersonalEvent;

                        return (
                          <button
                            key={event.id}
                            onClick={() => isClickable && onEventClick(event)}
                            disabled={!isClickable}
                            className={cn(
                              "absolute text-left text-xs px-1.5 py-1 rounded overflow-hidden border border-border/30",
                              eventColor.light,
                              isClickable ? "hover:opacity-80 cursor-pointer" : "cursor-default"
                            )}
                            style={{
                              top: `${topOffset}px`,
                              height: `${height}px`,
                              width,
                              left,
                            }}
                          >
                            <div className="font-medium truncate text-[11px]">{event.title}</div>
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
                {selectedDateEvents.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center mb-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      일정이 없습니다
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panel - Mobile */}
      <div className="md:hidden border-t bg-background">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {format(selectedDate, "yyyy년", { locale: ko })}
              </p>
              <p className="text-base font-semibold mt-0.5">
                {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
              </p>
            </div>
            {renderAddButton ? renderAddButton() : defaultAddButton()}
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

        {/* Events */}
        <div className="p-3 max-h-60 overflow-auto">
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-1.5">
              {selectedDateEvents.map((event) => {
                const eventColor = getEventColor(event);
                const isPersonalEvent = !event.group_id;
                const isClickable = onEventClick && isPersonalEvent;
                const groupName = event.group_id ? groups.find(g => g.id === event.group_id)?.name : null;

                return (
                  <button
                    key={event.id}
                    onClick={() => isClickable && onEventClick(event)}
                    disabled={!isClickable}
                    className={cn(
                      "w-full p-2.5 rounded border border-border/40 text-left",
                      isClickable ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "w-1 h-full min-h-[28px] rounded-full shrink-0 mt-0.5",
                          eventColor.bg
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate flex-1">{event.title}</p>
                          {groupName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground shrink-0">
                              {groupName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          {event.all_day ? (
                            <span>하루 종일</span>
                          ) : (
                            <span>
                              {format(new Date(event.start_at), "HH:mm")} - {format(new Date(event.end_at), "HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">일정이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
