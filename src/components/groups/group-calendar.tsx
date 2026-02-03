"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarView, ColorMapping } from "@/components/calendar/calendar-view";
import { CalendarEvent, ClassRoom } from "@/types";

interface GroupCalendarProps {
  events: CalendarEvent[];
  groupId: string;
  classes?: ClassRoom[];
}

export function GroupCalendar({ events, groupId, classes = [] }: GroupCalendarProps) {
  const router = useRouter();

  // 클래스(장소)별 색상 매핑
  const colorMappings: ColorMapping[] = useMemo(() => {
    return classes.map((cls) => ({
      id: cls.id,
      color: { bg: "", light: "", text: "" }, // CalendarView에서 인덱스 기반으로 색상 할당
    }));
  }, [classes]);

  const handleAddClick = () => {
    router.push(`/groups/${groupId}/calendar`);
  };

  const handleEventClick = () => {
    router.push(`/groups/${groupId}/calendar`);
  };

  return (
    <CalendarView
      events={events}
      colorMappings={colorMappings}
      onAddClick={handleAddClick}
      onEventClick={handleEventClick}
    />
  );
}
