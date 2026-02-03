"use client";

import { BaseCalendar, CalendarEvent } from "@/components/calendar/base-calendar";
import { Group } from "@/types";

interface DashboardCalendarProps {
  events: CalendarEvent[];
  groups?: Group[];
}

export function DashboardCalendar({ events, groups = [] }: DashboardCalendarProps) {
  return <BaseCalendar events={events} groups={groups} />;
}
