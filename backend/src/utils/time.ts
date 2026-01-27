/**
 * 시간 문자열을 분으로 변환
 * @param time "HH:mm" 형식의 시간 문자열
 * @returns 분 단위 숫자
 */
export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * 두 시간 사이의 분 차이 계산
 * @param startTime 시작 시간 "HH:mm"
 * @param endTime 종료 시간 "HH:mm"
 * @returns 분 단위 차이
 */
export const getMinutesDiff = (startTime: string, endTime: string): number => {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
};

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};
