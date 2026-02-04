import { Lesson, Attendance } from "@/types";

export interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  early_leave: number;
  absent: number;
  excused: number;
}

/**
 * 수업 목록에서 출석 통계 계산
 */
export function calculateAttendanceStats(
  lessons: (Lesson & { attendance?: Attendance | null })[]
): AttendanceStats {
  const completedLessons = lessons.filter((l) => l.status === "completed");

  return {
    total: completedLessons.length,
    present: completedLessons.filter((l) => l.attendance?.status === "present").length,
    late: completedLessons.filter((l) => l.attendance?.status === "late").length,
    early_leave: completedLessons.filter((l) => l.attendance?.status === "early_leave").length,
    absent: completedLessons.filter((l) => l.attendance?.status === "absent").length,
    excused: completedLessons.filter((l) => l.attendance?.status === "excused").length,
  };
}

/**
 * 출석률 계산 (%)
 */
export function calculateAttendanceRate(stats: AttendanceStats): number {
  if (stats.total === 0) return 0;
  return Math.round((stats.present / stats.total) * 100);
}

/**
 * 출석 상태에 따른 색상 클래스 반환
 */
export function getAttendanceColor(status?: string): string {
  switch (status) {
    case "present":
      return "bg-green-500";
    case "late":
      return "bg-yellow-500";
    case "early_leave":
      return "bg-orange-500";
    case "absent":
    case "excused":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

/**
 * 출석 상태 라벨
 */
export const ATTENDANCE_LABELS: Record<string, string> = {
  present: "출석",
  late: "지각",
  early_leave: "조퇴",
  absent: "결석",
  excused: "사유",
};
