"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarView, ColorMapping, RegularSchedule } from "@/components/calendar/calendar-view";
import { CalendarEvent, ClassRoom, RoomReservation } from "@/types";

interface GroupCalendarProps {
  events: CalendarEvent[];
  groupId: string;
  classes?: ClassRoom[];
  lessons?: any[];
  reservations?: RoomReservation[];
  regularSchedules?: RegularSchedule[];
  hideAddButton?: boolean;
  showLessonDetails?: boolean;
  isOwner?: boolean;
  hideReservationLabels?: boolean;
  hasMultiInstructor?: boolean;
  currentUserId?: string;
}

export function GroupCalendar({
  events,
  groupId,
  classes = [],
  lessons = [],
  reservations = [],
  regularSchedules = [],
  hideAddButton = false,
  showLessonDetails = false,
  isOwner = false,
  hideReservationLabels = false,
  hasMultiInstructor = false,
  currentUserId,
}: GroupCalendarProps) {
  const router = useRouter();
  const [showAllLessons, setShowAllLessons] = useState(true);

  // 클래스(장소)별 색상 매핑
  const colorMappings: ColorMapping[] = useMemo(() => {
    return classes.map((cls) => ({
      id: cls.id,
      color: { bg: "", light: "", text: "" }, // CalendarView에서 인덱스 기반으로 색상 할당
    }));
  }, [classes]);

  // 필터된 수업 (전체 또는 내 기준)
  const filteredLessons = useMemo(() => {
    if (showAllLessons || !currentUserId) {
      return lessons;
    }
    // 내 기준: 내가 담당하는 수업만
    return lessons.filter((lesson) => lesson.instructor_id === currentUserId);
  }, [lessons, showAllLessons, currentUserId]);

  // 필터된 예약 (전체 또는 내 기준)
  const filteredReservations = useMemo(() => {
    if (showAllLessons || !currentUserId) {
      return reservations;
    }
    // 내 기준: 내가 예약한 것만
    return reservations.filter((res) => res.reserved_by === currentUserId);
  }, [reservations, showAllLessons, currentUserId]);

  // 필터된 정규수업 (전체 또는 내 기준)
  const filteredRegularSchedules = useMemo(() => {
    if (showAllLessons || !currentUserId) {
      return regularSchedules;
    }
    // 내 기준: 내가 담당하는 정규수업만
    return regularSchedules.filter((schedule) => schedule.instructorId === currentUserId);
  }, [regularSchedules, showAllLessons, currentUserId]);

  const handleAddClick = () => {
    router.push(`/groups/${groupId}/calendar`);
  };

  const handleEventClick = () => {
    router.push(`/groups/${groupId}/calendar`);
  };

  // 오너이고 다중 강사 설정이 있을 때만 필터 토글 표시
  const showFilterToggle = isOwner && hasMultiInstructor;

  const headerExtra = showFilterToggle ? (
    <div className="flex items-center bg-muted/50 rounded p-0.5 ml-2">
      <button
        onClick={() => setShowAllLessons(true)}
        className={`px-2.5 py-1 text-xs rounded transition-colors ${
          showAllLessons
            ? "bg-background shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        전체
      </button>
      <button
        onClick={() => setShowAllLessons(false)}
        className={`px-2.5 py-1 text-xs rounded transition-colors ${
          !showAllLessons
            ? "bg-background shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        내 기준
      </button>
    </div>
  ) : undefined;

  return (
    <CalendarView
      events={events}
      lessons={filteredLessons}
      reservations={filteredReservations}
      regularSchedules={filteredRegularSchedules}
      colorMappings={colorMappings}
      onAddClick={hideAddButton ? undefined : handleAddClick}
      onEventClick={handleEventClick}
      showLessonDetails={showLessonDetails}
      isOwner={isOwner}
      hideReservationLabels={hideReservationLabels}
      headerExtra={headerExtra}
    />
  );
}
