import { useMemo } from "react";
import { format } from "date-fns";
import { getHolidaysForMonth, Holiday } from "@/lib/holidays";

export function useHolidayMap(currentMonth: Date) {
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

  // 특정 날짜의 공휴일 가져오기
  const getHolidayForDate = (date: Date): Holiday | null => {
    const dateStr = format(date, "yyyy-MM-dd");
    return holidayMap.get(dateStr) || null;
  };

  // 특정 날짜가 공휴일 또는 일요일인지 확인
  const isHolidayOrSunday = (date: Date): boolean => {
    return getHolidayForDate(date) !== null || date.getDay() === 0;
  };

  return {
    holidays,
    holidayMap,
    getHolidayForDate,
    isHolidayOrSunday,
  };
}
