"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { ko } from "date-fns/locale";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  Lock,
  Check,
  X,
  CalendarDays,
} from "lucide-react";
import { RoomReservation, Group, ClassRoom, CalendarEvent, Lesson } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface ReservationsPageProps {
  params: { id: string };
}

interface TimeSlot {
  time: string;
  endTime: string;
  isDisabled: boolean;
  disableReason?: string;
  reservations: (RoomReservation & { user?: { name: string } })[];
  capacity: number;
  isFull: boolean;
  hasMyReservation: boolean;
}

export default function ReservationsPage({ params }: ReservationsPageProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRoom, setSelectedRoom] = useState<string>("");

  const [group, setGroup] = useState<Group | null>(null);
  const [availableRooms, setAvailableRooms] = useState<ClassRoom[]>([]);
  const [reservations, setReservations] = useState<(RoomReservation & { user?: { name: string } })[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>("member");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [params.id, currentMonth]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || "");

    // 그룹 정보 로드
    const { data: groupData } = await supabase
      .from("groups")
      .select("*")
      .eq("id", params.id)
      .single();

    if (groupData) {
      setGroup(groupData as Group);

      // 사용 가능한 클래스 필터링
      const allClasses = groupData.settings?.classes || [];
      const excluded = groupData.settings?.excluded_practice_classes || [];
      const available = allClasses.filter((c: ClassRoom) => !excluded.includes(c.name));
      setAvailableRooms(available);
      // 클래스 선택은 사용자가 직접 선택하도록 함
    }

    // 사용자 역할 확인
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", params.id)
      .eq("user_id", user?.id)
      .single();

    if (membership) {
      setUserRole(membership.role);
    }

    // 이번 달의 예약, 수업, 일정 로드
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data: reservationData } = await supabase
      .from("room_reservations")
      .select(`
        *,
        user:profiles!reserved_by(name)
      `)
      .eq("group_id", params.id)
      .gte("start_at", monthStart.toISOString())
      .lte("start_at", monthEnd.toISOString())
      .neq("status", "rejected");

    setReservations((reservationData || []) as any);

    // 수업 로드
    const { data: lessonData } = await supabase
      .from("lessons")
      .select("*")
      .eq("group_id", params.id)
      .gte("scheduled_at", monthStart.toISOString())
      .lte("scheduled_at", monthEnd.toISOString())
      .neq("status", "cancelled");

    setLessons((lessonData || []) as Lesson[]);

    // 일정 로드 (장소가 지정된 일정만)
    const { data: eventData } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("group_id", params.id)
      .not("location_id", "is", null)
      .gte("start_at", monthStart.toISOString())
      .lte("start_at", monthEnd.toISOString());

    setEvents((eventData || []) as CalendarEvent[]);

    setIsLoading(false);
  };

  const canManage = userRole === "owner" || userRole === "admin" || userRole === "instructor";
  const hasPracticeRoom = group?.settings?.has_practice_room;
  const slotUnit = group?.settings?.practice_room_slot_unit || 60;
  const practiceHours = group?.settings?.practice_room_hours || { start: "09:00", end: "22:00" };

  // 선택된 날짜의 타임 슬롯 생성
  const timeSlots = useMemo((): TimeSlot[] => {
    if (!selectedDate || !selectedRoom || !group) return [];

    const slots: TimeSlot[] = [];
    const selectedRoomData = availableRooms.find(r => r.id === selectedRoom);
    const capacity = selectedRoomData?.capacity || 1;

    const [startHour, startMin] = practiceHours.start.split(":").map(Number);
    const [endHour, endMin] = practiceHours.end.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let mins = startMinutes; mins < endMinutes; mins += slotUnit) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

      const endMins = mins + slotUnit;
      const endHr = Math.floor(endMins / 60);
      const endMn = endMins % 60;
      const endTime = `${endHr.toString().padStart(2, "0")}:${endMn.toString().padStart(2, "0")}`;

      const slotStart = new Date(selectedDate);
      slotStart.setHours(hour, minute, 0, 0);
      const slotEnd = new Date(selectedDate);
      slotEnd.setHours(endHr, endMn, 0, 0);

      // 이 슬롯의 예약들
      const slotReservations = reservations.filter(r => {
        if (r.room_id !== selectedRoom) return false;
        const rStart = new Date(r.start_at);
        const rEnd = new Date(r.end_at);
        return isSameDay(rStart, selectedDate) &&
          rStart.getHours() === hour &&
          rStart.getMinutes() === minute;
      });

      // 수업으로 인한 비활성화 체크
      const hasLesson = lessons.some(l => {
        if (l.room_id !== selectedRoom) return false;
        const lStart = new Date(l.scheduled_at);
        const lEnd = new Date(lStart.getTime() + (l.duration_minutes || 60) * 60000);
        return lStart < slotEnd && lEnd > slotStart;
      });

      // 일정(장소등록)으로 인한 비활성화 체크
      const hasEvent = events.some(e => {
        if (e.location_id !== selectedRoom) return false;
        const eStart = new Date(e.start_at);
        const eEnd = new Date(e.end_at);
        return eStart < slotEnd && eEnd > slotStart;
      });

      const isDisabled = hasLesson || hasEvent;
      const disableReason = hasLesson ? "수업" : hasEvent ? "일정" : undefined;
      const isFull = slotReservations.length >= capacity;
      const hasMyReservation = slotReservations.some(r => r.reserved_by === userId);

      slots.push({
        time,
        endTime,
        isDisabled,
        disableReason,
        reservations: slotReservations,
        capacity,
        isFull: isDisabled ? false : isFull,
        hasMyReservation,
      });
    }

    return slots;
  }, [selectedDate, selectedRoom, group, reservations, lessons, events, availableRooms, userId, slotUnit, practiceHours]);

  // 날짜별 예약 수 계산 (모든 클래스 포함)
  const getReservationCountForDate = (date: Date) => {
    return reservations.filter(r => {
      const rDate = new Date(r.start_at);
      return isSameDay(rDate, date);
    }).length;
  };

  // 내 예약 목록 (오늘 이후)
  const myReservations = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return reservations
      .filter(r => r.reserved_by === userId && new Date(r.start_at) >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [reservations, userId]);

  const handleReserve = async (slot: TimeSlot) => {
    if (slot.isDisabled || slot.isFull || isSubmitting) return;

    setIsSubmitting(true);
    const supabase = createClient();

    const startAt = new Date(selectedDate);
    const [h, m] = slot.time.split(":").map(Number);
    startAt.setHours(h, m, 0, 0);

    const endAt = new Date(selectedDate);
    const [eh, em] = slot.endTime.split(":").map(Number);
    endAt.setHours(eh, em, 0, 0);

    const { error } = await supabase.from("room_reservations").insert({
      group_id: params.id,
      room_id: selectedRoom,
      reserved_by: userId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "approved",
    });

    if (error) {
      toast.error("예약에 실패했습니다.");
    } else {
      toast.success("예약되었습니다.");
      loadData();
    }

    setIsSubmitting(false);
  };

  const handleCancelReservation = async (reservationId: string) => {
    const confirmed = await confirm({
      title: "예약 취소",
      message: "예약을 취소하시겠습니까?",
      confirmText: "취소하기",
      variant: "destructive",
    });
    if (!confirmed) return;

    const supabase = createClient();
    await supabase.from("room_reservations").delete().eq("id", reservationId);
    toast.success("예약이 취소되었습니다.");
    loadData();
  };

  // 캘린더 계산
  const calendarMonthStart = startOfMonth(currentMonth);
  const calendarMonthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(calendarMonthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(calendarMonthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPracticeRoom && !canManage) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12 rounded-lg border">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">연습실 예약이 비활성화되어 있습니다</p>
        </div>
      </div>
    );
  }

  if (availableRooms.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12 rounded-lg border">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">예약 가능한 클래스가 없습니다</p>
          {canManage && (
            <p className="text-sm text-muted-foreground mt-1">
              설정에서 클래스를 추가해주세요
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Calendar */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </h2>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDate(new Date());
              }}
            >
              오늘
            </Button>
          </div>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day, idx) => (
            <div
              key={day}
              className={cn(
                "py-2 text-center text-xs font-medium",
                idx === 0 && "text-red-500",
                idx === 6 && "text-blue-500"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          className="flex-1 grid overflow-hidden"
          style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}
        >
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
              {week.map((date, dayIndex) => {
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isSelected = isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);
                const reservationCount = getReservationCountForDate(date);

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "h-full min-h-[60px] p-1 text-left transition-colors relative flex flex-col border-r last:border-r-0",
                      !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                      isCurrentMonth && "hover:bg-muted/30",
                      isSelected && "bg-primary/10 ring-2 ring-primary ring-inset"
                    )}
                  >
                    <div className="flex items-center justify-center">
                      <span
                        className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                          dayIndex === 0 && "text-red-500",
                          dayIndex === 6 && "text-blue-500",
                          isTodayDate && "bg-primary text-primary-foreground"
                        )}
                      >
                        {format(date, "d")}
                      </span>
                    </div>

                    {isCurrentMonth && reservationCount > 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          {reservationCount}건
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel - Class & Time Selection */}
      <div className="w-full md:w-96 border-t md:border-t-0 md:border-l flex flex-col bg-background">
        {/* My Reservations */}
        {myReservations.length > 0 && (
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              내 예약 ({myReservations.length})
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {myReservations.map((res) => {
                const room = availableRooms.find(r => r.id === res.room_id);
                const startDate = new Date(res.start_at);
                const endDate = new Date(res.end_at);
                return (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {room?.name || "알 수 없음"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(startDate, "M/d(EEE)", { locale: ko })} {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleCancelReservation(res.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Date Header */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
            {format(selectedDate, "yyyy년", { locale: ko })}
          </p>
          <p className="text-base font-semibold mt-0.5">
            {format(selectedDate, "M월 d일 (EEE)", { locale: ko })}
          </p>
        </div>

        {/* Class Selection */}
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-medium text-muted-foreground mb-2">클래스 선택</p>
          <div className="flex flex-wrap gap-2">
            {availableRooms.map((room) => {
              const isSelected = selectedRoom === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium border active:scale-[0.97]",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted/70 border-border"
                  )}
                >
                  <span>{room.name}</span>
                  {room.capacity && (
                    <span className={cn(
                      "ml-1.5 text-xs",
                      isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      ({room.capacity}명)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        <div className="flex-1 overflow-auto p-4">
          {selectedRoom ? (
            <>
              <p className="text-xs font-medium text-muted-foreground mb-3">
                시간 선택 · {availableRooms.find(r => r.id === selectedRoom)?.name}
              </p>
              <div className="space-y-2">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.time}
                    className={cn(
                      "p-3 rounded-md border",
                      slot.isDisabled && "bg-muted/50 border-muted",
                      slot.isFull && !slot.isDisabled && "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
                      slot.hasMyReservation && "bg-primary/10 border-primary",
                      !slot.isDisabled && !slot.isFull && !slot.hasMyReservation && "hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {slot.time} - {slot.endTime}
                        </span>
                      </div>

                      {slot.isDisabled ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {slot.disableReason}
                        </span>
                      ) : slot.hasMyReservation ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            const myRes = slot.reservations.find(r => r.reserved_by === userId);
                            if (myRes) handleCancelReservation(myRes.id);
                          }}
                        >
                          취소
                        </Button>
                      ) : slot.isFull ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                          마감
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleReserve(slot)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "예약"}
                        </Button>
                      )}
                    </div>

                    {/* Capacity & Reservations */}
                    {!slot.isDisabled && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{slot.reservations.length} / {slot.capacity}</span>

                        {/* 예약자 표시 (owner/instructor만) */}
                        {canManage && slot.reservations.length > 0 && (
                          <div className="flex-1 flex flex-wrap gap-1">
                            {slot.reservations.map((res) => (
                              <span
                                key={res.id}
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px]",
                                  res.reserved_by === userId
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted"
                                )}
                              >
                                {res.user?.name || "알 수 없음"}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 내 예약 표시 (학생/보호자) */}
                        {!canManage && slot.hasMyReservation && (
                          <span className="flex items-center gap-1 text-primary">
                            <Check className="h-3 w-3" />
                            예약됨
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {timeSlots.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    이용 가능한 시간이 없습니다
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                클래스를 선택해주세요
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted border" />
            <span>수업/일정으로 사용 불가</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-100 border-orange-200 dark:bg-orange-900/30" />
            <span>마감</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/20 border-primary" />
            <span>내 예약</span>
          </div>
        </div>
      </div>
    </div>
  );
}
