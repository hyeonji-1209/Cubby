import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = new Date(date);

  if (format === 'time') {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  if (format === 'long') {
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  return d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric'
  });
}

export function getDDay(targetDate: string | Date): number {
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function calculateOvulationDate(periodStart: Date, cycleLength: number = 28): Date {
  const ovulation = new Date(periodStart);
  ovulation.setDate(ovulation.getDate() + cycleLength - 14);
  return ovulation;
}

export function calculateFertilePeriod(periodStart: Date, cycleLength: number = 28): { start: Date; end: Date } {
  const ovulation = calculateOvulationDate(periodStart, cycleLength);
  const start = new Date(ovulation);
  start.setDate(start.getDate() - 5);
  const end = new Date(ovulation);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function getWeekDayName(day: number): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[day];
}
