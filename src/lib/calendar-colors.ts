// 색상 타입 정의
export interface CalendarColor {
  bg: string;
  light: string;
  text: string;
}

// 캘린더 이벤트 색상 팔레트 (자연스러운 톤)
export const CALENDAR_COLORS: CalendarColor[] = [
  { bg: "bg-blue-600", light: "bg-blue-500/20 dark:bg-blue-400/20", text: "text-blue-800 dark:text-blue-200" },
  { bg: "bg-emerald-600", light: "bg-emerald-500/20 dark:bg-emerald-400/20", text: "text-emerald-800 dark:text-emerald-200" },
  { bg: "bg-amber-600", light: "bg-amber-500/20 dark:bg-amber-400/20", text: "text-amber-800 dark:text-amber-200" },
  { bg: "bg-purple-600", light: "bg-purple-500/20 dark:bg-purple-400/20", text: "text-purple-800 dark:text-purple-200" },
  { bg: "bg-rose-600", light: "bg-rose-500/20 dark:bg-rose-400/20", text: "text-rose-800 dark:text-rose-200" },
  { bg: "bg-cyan-600", light: "bg-cyan-500/20 dark:bg-cyan-400/20", text: "text-cyan-800 dark:text-cyan-200" },
  { bg: "bg-orange-600", light: "bg-orange-500/20 dark:bg-orange-400/20", text: "text-orange-800 dark:text-orange-200" },
  { bg: "bg-slate-600", light: "bg-slate-500/20 dark:bg-slate-400/20", text: "text-slate-800 dark:text-slate-200" },
];

export const DEFAULT_EVENT_COLOR: CalendarColor = {
  bg: "bg-blue-600",
  light: "bg-blue-500/20 dark:bg-blue-400/20",
  text: "text-blue-800 dark:text-blue-200"
};

export const HOLIDAY_COLOR: CalendarColor = {
  bg: "bg-red-500",
  light: "bg-red-200 dark:bg-red-900/60",
  text: "text-red-600 dark:text-red-400"
};

// 색상 인덱스 기반으로 색상 가져오기
export function getColorByIndex(index: number): CalendarColor {
  return CALENDAR_COLORS[index % CALENDAR_COLORS.length];
}

// ID 기반 색상 맵 생성
export function createColorMap(ids: string[]): Map<string, CalendarColor> {
  const map = new Map<string, CalendarColor>();
  ids.forEach((id, idx) => {
    map.set(id, CALENDAR_COLORS[idx % CALENDAR_COLORS.length]);
  });
  return map;
}
