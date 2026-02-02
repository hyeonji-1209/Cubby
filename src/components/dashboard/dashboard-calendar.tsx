"use client";

import { BaseCalendar, CalendarEvent } from "@/components/calendar/base-calendar";

interface DashboardCalendarProps {
  events: CalendarEvent[];
}

export function DashboardCalendar({ events }: DashboardCalendarProps) {
  return <BaseCalendar events={events} />;
}
