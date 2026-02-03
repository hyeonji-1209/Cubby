import { CalendarEvent } from "@/types";

/**
 * 특정 날짜에 해당하는 이벤트들을 필터링
 */
export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((event) => {
    const startDate = new Date(event.start_at);
    const endDate = new Date(event.end_at);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const checkDate = new Date(date);
    checkDate.setHours(12, 0, 0, 0);
    return checkDate >= startDate && checkDate <= endDate;
  });
}

/**
 * 이벤트를 정렬 (하루종일 이벤트 우선, 그 다음 시작 시간순)
 */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1;
    if (!a.all_day && b.all_day) return 1;
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });
}

/**
 * 이벤트가 여러 날에 걸쳐 있는지 확인
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff >= 1;
}

/**
 * 단일 날짜 이벤트만 필터링
 */
export function getSingleDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((event) => !isMultiDayEvent(event));
}

/**
 * 여러 날에 걸친 이벤트만 필터링
 */
export function getMultiDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((event) => isMultiDayEvent(event));
}

/**
 * 시간 포맷팅 (HH:mm)
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 날짜 포맷팅 (MM.DD (요일))
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}
