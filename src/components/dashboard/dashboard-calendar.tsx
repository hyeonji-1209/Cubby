"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarView, ColorMapping } from "@/components/calendar/calendar-view";
import { CalendarEvent, Group, Lesson, RoomReservation } from "@/types";
import { PersonalEventModal } from "./personal-event-modal";

interface DashboardCalendarProps {
  events: CalendarEvent[];
  groups?: Group[];
  lessons?: Lesson[];
  reservations?: RoomReservation[];
}

export function DashboardCalendar({ events, groups = [], lessons = [], reservations = [] }: DashboardCalendarProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // 그룹별 색상 매핑
  const colorMappings: ColorMapping[] = useMemo(() => {
    return groups.map((group) => ({
      id: group.id,
      color: { bg: "bg-primary", light: "bg-primary/25", text: "text-primary" },
    }));
  }, [groups]);

  const handleAddClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, []);

  const handleDateDoubleClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <CalendarView
        events={events}
        lessons={lessons}
        reservations={reservations}
        colorMappings={colorMappings}
        groups={groups}
        onAddClick={handleAddClick}
        onEventClick={handleEventClick}
        onDateDoubleClick={handleDateDoubleClick}
        personalEventsOnly={true}
      />

      <PersonalEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        onSuccess={handleSuccess}
        initialDate={selectedDate}
        event={selectedEvent}
      />
    </>
  );
}
