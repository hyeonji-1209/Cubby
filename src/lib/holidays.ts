// 한국 공휴일 유틸리티
// 공공데이터포털 API 또는 정적 데이터 사용

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  isHoliday: boolean;
}

// 양력 공휴일 (매년 고정)
const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "신정",
  "03-01": "삼일절",
  "05-05": "어린이날",
  "06-06": "현충일",
  "08-15": "광복절",
  "10-03": "개천절",
  "10-09": "한글날",
  "12-25": "크리스마스",
};

// 음력 공휴일은 매년 다르므로 연도별로 정의
// 실제 서비스에서는 공공데이터포털 API 사용 권장
const LUNAR_HOLIDAYS: Record<number, Record<string, string>> = {
  2024: {
    "02-09": "설날 연휴",
    "02-10": "설날",
    "02-11": "설날 연휴",
    "02-12": "대체공휴일(설날)",
    "04-10": "22대 국회의원선거",
    "05-15": "부처님오신날",
    "09-16": "추석 연휴",
    "09-17": "추석",
    "09-18": "추석 연휴",
  },
  2025: {
    "01-28": "설날 연휴",
    "01-29": "설날",
    "01-30": "설날 연휴",
    "05-05": "부처님오신날",
    "10-05": "추석 연휴",
    "10-06": "추석",
    "10-07": "추석 연휴",
    "10-08": "대체공휴일(추석)",
  },
  2026: {
    "02-16": "설날 연휴",
    "02-17": "설날",
    "02-18": "설날 연휴",
    "05-24": "부처님오신날",
    "09-24": "추석 연휴",
    "09-25": "추석",
    "09-26": "추석 연휴",
  },
  2027: {
    "02-06": "설날 연휴",
    "02-07": "설날",
    "02-08": "설날 연휴",
    "02-09": "대체공휴일(설날)",
    "05-13": "부처님오신날",
    "09-14": "추석 연휴",
    "09-15": "추석",
    "09-16": "추석 연휴",
  },
};

// 특정 월의 공휴일 가져오기
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const holidays: Holiday[] = [];
  const monthStr = String(month).padStart(2, "0");

  // 양력 공휴일
  Object.entries(FIXED_HOLIDAYS).forEach(([date, name]) => {
    if (date.startsWith(monthStr)) {
      holidays.push({
        date: `${year}-${date}`,
        name,
        isHoliday: true,
      });
    }
  });

  // 음력 공휴일
  const yearHolidays = LUNAR_HOLIDAYS[year];
  if (yearHolidays) {
    Object.entries(yearHolidays).forEach(([date, name]) => {
      if (date.startsWith(monthStr)) {
        holidays.push({
          date: `${year}-${date}`,
          name,
          isHoliday: true,
        });
      }
    });
  }

  return holidays;
}

// 특정 날짜가 공휴일인지 확인
export function isHoliday(date: Date): Holiday | null {
  const year = date.getFullYear();
  const monthStr = String(date.getMonth() + 1).padStart(2, "0");
  const dayStr = String(date.getDate()).padStart(2, "0");
  const dateKey = `${monthStr}-${dayStr}`;

  // 양력 공휴일 확인
  if (FIXED_HOLIDAYS[dateKey]) {
    return {
      date: `${year}-${dateKey}`,
      name: FIXED_HOLIDAYS[dateKey],
      isHoliday: true,
    };
  }

  // 음력 공휴일 확인
  const yearHolidays = LUNAR_HOLIDAYS[year];
  if (yearHolidays && yearHolidays[dateKey]) {
    return {
      date: `${year}-${dateKey}`,
      name: yearHolidays[dateKey],
      isHoliday: true,
    };
  }

  return null;
}

// 연간 공휴일 목록 가져오기
export function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [];

  // 양력 공휴일
  Object.entries(FIXED_HOLIDAYS).forEach(([date, name]) => {
    holidays.push({
      date: `${year}-${date}`,
      name,
      isHoliday: true,
    });
  });

  // 음력 공휴일
  const yearHolidays = LUNAR_HOLIDAYS[year];
  if (yearHolidays) {
    Object.entries(yearHolidays).forEach(([date, name]) => {
      holidays.push({
        date: `${year}-${date}`,
        name,
        isHoliday: true,
      });
    });
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

// 공공데이터포털 API를 사용한 공휴일 조회 (선택적)
// API 키가 필요하며, 환경변수로 관리 권장
export async function fetchHolidaysFromAPI(
  year: number,
  month: number
): Promise<Holiday[]> {
  const apiKey = process.env.NEXT_PUBLIC_DATA_GO_KR_API_KEY;

  if (!apiKey) {
    // API 키가 없으면 정적 데이터 사용
    return getHolidaysForMonth(year, month);
  }

  try {
    const url = new URL(
      "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"
    );
    url.searchParams.append("serviceKey", apiKey);
    url.searchParams.append("solYear", String(year));
    url.searchParams.append("solMonth", String(month).padStart(2, "0"));
    url.searchParams.append("_type", "json");

    const response = await fetch(url.toString());
    const data = await response.json();

    const items = data.response?.body?.items?.item;
    if (!items) return getHolidaysForMonth(year, month);

    const itemArray = Array.isArray(items) ? items : [items];

    return itemArray.map((item: { locdate: number; dateName: string; isHoliday: string }) => ({
      date: String(item.locdate).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
      name: item.dateName,
      isHoliday: item.isHoliday === "Y",
    }));
  } catch (error) {
    console.error("Failed to fetch holidays from API:", error);
    return getHolidaysForMonth(year, month);
  }
}
