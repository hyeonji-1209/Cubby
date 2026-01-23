/**
 * 날짜/시간 포맷 유틸리티
 */

/**
 * 상대적 시간 표시 (방금 전, 5분 전, 1시간 전 등)
 */
export const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return formatDate(dateStr);
};

/**
 * 날짜만 표시 (2024.01.15)
 */
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '.').replace('.', '');
};

/**
 * 날짜를 읽기 쉬운 형태로 (1월 15일)
 */
export const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
};

/**
 * 시간만 표시 (오후 3:30)
 */
export const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * 날짜 + 시간 표시 (1월 15일 오후 3:30)
 */
export const formatDateTime = (dateStr: string): string => {
  return `${formatDateShort(dateStr)} ${formatTime(dateStr)}`;
};

/**
 * 일정용 날짜/시간 포맷 (종일 여부에 따라 다르게)
 */
export const formatScheduleDateTime = (
  startAt: string,
  endAt: string,
  isAllDay: boolean
): string => {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (isAllDay) {
    const start = formatDateShort(startAt);
    const end = formatDateShort(endAt);
    return startDate.toDateString() === endDate.toDateString()
      ? start
      : `${start} - ${end}`;
  }

  const isSameDay = startDate.toDateString() === endDate.toDateString();

  if (isSameDay) {
    return `${formatDateShort(startAt)} ${formatTime(startAt)} - ${formatTime(endAt)}`;
  }

  return `${formatDateTime(startAt)} - ${formatDateTime(endAt)}`;
};

/**
 * 날짜를 YYYY-MM-DD 형식으로 (input date용)
 */
export const formatDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 날짜/시간을 datetime-local input용으로
 */
export const formatDateTimeInput = (date: Date): string => {
  const dateStr = formatDateInput(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr}T${hours}:${minutes}`;
};

/**
 * 요일 반환
 */
export const getDayOfWeek = (dateStr: string): string => {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
};

/**
 * 두 날짜가 같은 날인지 확인
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return d1.toDateString() === d2.toDateString();
};

/**
 * 날짜가 오늘인지 확인
 */
export const isToday = (dateStr: string): boolean => {
  return isSameDay(new Date(dateStr), new Date());
};

/**
 * 날짜가 과거인지 확인
 */
export const isPast = (dateStr: string): boolean => {
  return new Date(dateStr) < new Date();
};
