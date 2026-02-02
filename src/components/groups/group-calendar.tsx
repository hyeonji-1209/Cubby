"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BaseCalendar, CalendarEvent } from "@/components/calendar/base-calendar";

interface GroupCalendarProps {
  events: CalendarEvent[];
  groupId: string;
}

export function GroupCalendar({ events, groupId }: GroupCalendarProps) {
  const renderAddButton = () => (
    <Link href={`/groups/${groupId}/calendar`}>
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
        <Plus className="h-3 w-3" />
        추가
      </Button>
    </Link>
  );

  return <BaseCalendar events={events} renderAddButton={renderAddButton} />;
}
