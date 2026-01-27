// 한국 공휴일 유틸리티
// 음력 공휴일은 매년 날짜가 바뀌므로 연도별로 관리

interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  isHoliday: boolean; // 실제 휴일 여부
}

// 고정 공휴일 (양력)
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '크리스마스',
};

// 음력 기반 공휴일 (연도별 양력 날짜)
// 설날, 추석은 당일 + 전날 + 다음날 총 3일
// 부처님오신날, 대통령선거일 등은 별도 추가
const LUNAR_HOLIDAYS: Record<number, Record<string, string>> = {
  2024: {
    '02-09': '설날 연휴',
    '02-10': '설날',
    '02-11': '설날 연휴',
    '02-12': '대체공휴일(설날)',
    '04-10': '22대 국회의원선거',
    '05-15': '부처님오신날',
    '09-16': '추석 연휴',
    '09-17': '추석',
    '09-18': '추석 연휴',
  },
  2025: {
    '01-28': '설날 연휴',
    '01-29': '설날',
    '01-30': '설날 연휴',
    '05-05': '부처님오신날', // 어린이날과 겹침
    '05-06': '대체공휴일(어린이날)',
    '10-05': '추석 연휴',
    '10-06': '추석',
    '10-07': '추석 연휴',
    '10-08': '대체공휴일(추석)',
  },
  2026: {
    '02-16': '설날 연휴',
    '02-17': '설날',
    '02-18': '설날 연휴',
    '05-24': '부처님오신날',
    '09-24': '추석 연휴',
    '09-25': '추석',
    '09-26': '추석 연휴',
  },
  2027: {
    '02-05': '설날 연휴',
    '02-06': '설날',
    '02-07': '설날 연휴',
    '02-08': '대체공휴일(설날)',
    '05-13': '부처님오신날',
    '09-14': '추석 연휴',
    '09-15': '추석',
    '09-16': '추석 연휴',
  },
};

// 캐시
let holidayCache: Map<number, Map<string, Holiday>> = new Map();

/**
 * 로컬 날짜를 YYYY-MM-DD 형식으로 변환 (타임존 이슈 방지)
 */
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 특정 연도의 공휴일 목록 가져오기
 */
export const getHolidaysForYear = (year: number): Map<string, Holiday> => {
  // 캐시 확인
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }

  const holidays = new Map<string, Holiday>();

  // 고정 공휴일 추가
  Object.entries(FIXED_HOLIDAYS).forEach(([monthDay, name]) => {
    const date = `${year}-${monthDay}`;
    holidays.set(date, { date, name, isHoliday: true });
  });

  // 음력 공휴일 추가
  const lunarHolidays = LUNAR_HOLIDAYS[year];
  if (lunarHolidays) {
    Object.entries(lunarHolidays).forEach(([monthDay, name]) => {
      const date = `${year}-${monthDay}`;
      holidays.set(date, { date, name, isHoliday: true });
    });
  }

  // 대체공휴일 처리 (일요일과 겹치는 경우)
  holidays.forEach((holiday, date) => {
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0) {
      // 일요일
      // 다음날이 이미 공휴일이 아니면 대체공휴일 추가
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = formatLocalDate(nextDay);
      if (!holidays.has(nextDayStr)) {
        holidays.set(nextDayStr, {
          date: nextDayStr,
          name: `대체공휴일(${holiday.name})`,
          isHoliday: true,
        });
      }
    }
  });

  // 캐시에 저장
  holidayCache.set(year, holidays);

  return holidays;
};

/**
 * 특정 날짜가 공휴일인지 확인
 */
export const isHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const dateStr = formatLocalDate(date);
  const holidays = getHolidaysForYear(year);
  return holidays.has(dateStr);
};

/**
 * 특정 날짜의 공휴일 이름 가져오기
 */
export const getHolidayName = (date: Date): string | null => {
  const year = date.getFullYear();
  const dateStr = formatLocalDate(date);
  const holidays = getHolidaysForYear(year);
  return holidays.get(dateStr)?.name || null;
};

/**
 * 특정 월의 공휴일 목록 가져오기
 */
export const getHolidaysForMonth = (year: number, month: number): Holiday[] => {
  const holidays = getHolidaysForYear(year);
  const monthStr = (month + 1).toString().padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  return Array.from(holidays.values()).filter((h) => h.date.startsWith(prefix));
};

/**
 * 날짜 문자열로 공휴일 정보 가져오기
 */
export const getHolidayByDateString = (dateStr: string): Holiday | null => {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const holidays = getHolidaysForYear(year);
  return holidays.get(dateStr) || null;
};
