"use client";

import { useState, useMemo, ReactNode } from "react";
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
import { CalendarEvent } from "@/types";
import { WEEK_DAYS } from "@/lib/constants";

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
  renderAddButton?: () => ReactNode;
}

export function BaseCalendar({ events, renderAddButton }: BaseCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

                    return (
                      <button
                        key={dayIndex}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          relative flex flex-col px-1 pt-1 border-r last:border-r-0 text-left transition-colors
                          hover:bg-muted/50
                          ${!isCurrentMonth ? "bg-muted/30" : ""}
                          ${isSelected ? "bg-primary/5 ring-2 ring-primary ring-inset" : ""}
                        `}
                      >
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
                        {holiday && isCurrentMonth && (
                          <div className="text-[8px] text-red-400 truncate leading-tight">
                            {holiday.name}
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

                      return (
                        <div
                          key={`${pos.event.id}-${weekIndex}`}
                          className={`
                            absolute h-[16px] text-[10px] leading-[16px] truncate px-1.5
                            ${pos.event.is_academy_holiday
                              ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                              : "bg-primary/80 text-primary-foreground"
                            }
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
