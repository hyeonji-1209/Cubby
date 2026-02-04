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
import { RoomReservation, ClassRoom, CalendarEvent, Lesson } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useUser } from "@/lib/contexts/user-context";
import { useGroup } from "@/lib/contexts/group-context";

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
  const { user } = useUser();
  const { group, membership, isOwner, isInstructor } = useGroup();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRoom, setSelectedRoom] = useState<string>("");

  const [availableRooms, setAvailableRooms] = useState<ClassRoom[]>([]);
  const [reservations, setReservations] = useState<(RoomReservation & { user?: { name: string } })[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 관리자용 뷰 모드 (timeline: 타임라인, list: 리스트, reserve: 예약)
  const [viewMode, setViewMode] = useState<"timeline" | "list" | "reserve">("timeline");

  // 사용 가능한 클래스 필터링 (그룹 설정에서)
  useEffect(() => {
    const allClasses = group.settings?.classes || [];
    const excluded = group.settings?.excluded_practice_classes || [];
    const available = allClasses.filter((c: ClassRoom) => !excluded.includes(c.name));
    setAvailableRooms(available);
  }, [group]);

  useEffect(() => {
    loadData();
  }, [params.id, currentMonth]);

  const loadData = async () => {
    const supabase = createClient();

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

  const canManage = isOwner || isInstructor;
  const hasPracticeRoom = group?.settings?.has_practice_room;
  const slotUnit = group?.settings?.practice_room_slot_unit || 60;
  const practiceHours = group?.settings?.practice_room_hours || { start: "09:00", end: "22:00" };

  // 선택된 날짜가 과거인지 확인
  const isPastDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  }, [selectedDate]);

  // 선택된 날짜의 타임 슬롯 생성
  const timeSlots = useMemo((): TimeSlot[] => {
    if (!selectedDate || !selectedRoom || !group) return [];

    const slots: TimeSlot[] = [];
    const selectedRoomData = availableRooms.find(r => r.id === selectedRoom);
    const capacity = selectedRoomData?.capacity || 1;
    const now = new Date();

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

      // 과거 시간은 목록에서 제외
      if (slotStart < now) continue;

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
      const hasMyReservation = slotReservations.some(r => r.reserved_by === user?.id);

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
  }, [selectedDate, selectedRoom, group, reservations, lessons, events, availableRooms, user?.id, slotUnit, practiceHours]);

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
      .filter(r => r.reserved_by === user?.id && new Date(r.start_at) >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [reservations, user?.id]);

  // 선택된 날짜의 모든 예약 (관리자용)
  const selectedDateReservations = useMemo(() => {
    return reservations
      .filter(r => isSameDay(new Date(r.start_at), selectedDate))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [reservations, selectedDate]);

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
      reserved_by: user?.id,
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
                const dayReservations = reservations
                  .filter(r => isSameDay(new Date(r.start_at), date))
                  .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
                const reservationCount = dayReservations.length;

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
                    <div className="flex items-center justify-between px-0.5">
                      <span
                        className={cn(
                          "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
                          dayIndex === 0 && "text-red-500",
                          dayIndex === 6 && "text-blue-500",
                          isTodayDate && "bg-primary text-primary-foreground"
                        )}
                      >
                        {format(date, "d")}
                      </span>
                      {isCurrentMonth && reservationCount > 0 && !canManage && (
                        <span className="text-[9px] text-muted-foreground">
                          {reservationCount}건
                        </span>
                      )}
                    </div>

                    {/* 관리자용: 모든 예약 라벨 표시 */}
                    {isCurrentMonth && canManage && dayReservations.length > 0 && (
                      <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                        {dayReservations.slice(0, 3).map((res) => {
                          const room = availableRooms.find(r => r.id === res.room_id);
                          const startTime = format(new Date(res.start_at), "HH:mm");
                          return (
                            <div
                              key={res.id}
                              className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary rounded truncate"
                            >
                              {startTime} {res.user?.name || "?"} {room ? `[${room.name}]` : ""}
                            </div>
                          );
                        })}
                        {dayReservations.length > 3 && (
                          <span className="text-[9px] text-muted-foreground px-1">
                            +{dayReservations.length - 3}건
                          </span>
                        )}
                      </div>
                    )}

                    {/* 학생용: 본인 예약만 라벨로 표시 */}
                    {isCurrentMonth && !canManage && dayReservations.length > 0 && (() => {
                      const myDayReservations = dayReservations.filter(r => r.reserved_by === user?.id);
                      const otherCount = dayReservations.length - myDayReservations.length;
                      return (
                        <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                          {myDayReservations.slice(0, 2).map((res) => {
                            const room = availableRooms.find(r => r.id === res.room_id);
                            const startTime = format(new Date(res.start_at), "HH:mm");
                            return (
                              <div
                                key={res.id}
                                className="text-[9px] px-1 py-0.5 bg-primary/20 text-primary rounded truncate font-medium"
                              >
                                {startTime} {room ? `[${room.name}]` : ""}
                              </div>
                            );
                          })}
                          {myDayReservations.length > 2 && (
                            <span className="text-[9px] text-primary px-1">
                              +{myDayReservations.length - 2}건
                            </span>
                          )}
                          {otherCount > 0 && (
                            <span className="text-[9px] text-muted-foreground px-1">
                              외 {otherCount}건
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel - Class & Time Selection */}
      <div className="w-full md:w-96 border-t md:border-t-0 md:border-l flex flex-col bg-background">
        {/* My Upcoming Reservations - Always visible when there are reservations */}
        {myReservations.length > 0 && (
          <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                다가오는 내 예약
              </p>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {myReservations.length}건
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {myReservations.map((res) => {
                const room = availableRooms.find(r => r.id === res.room_id);
                const startDate = new Date(res.start_at);
                const endDate = new Date(res.end_at);
                const isSelectedDate = isSameDay(startDate, selectedDate);
                return (
                  <div
                    key={res.id}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg border transition-all",
                      isSelectedDate
                        ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {format(startDate, "M/d", { locale: ko })}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(startDate, "(EEE)", { locale: ko })}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {room?.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelReservation(res.id)}
                    >
                      취소
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

        {/* View Toggle (관리자용) */}
        {canManage && (
          <div className="px-4 py-2 border-b flex items-center gap-3">
            <span className="text-xs text-muted-foreground">보기</span>
            <div className="flex items-center bg-muted/50 rounded p-0.5">
              <button
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded transition-colors",
                  viewMode === "timeline"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                타임라인
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded transition-colors",
                  viewMode === "list"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                리스트
              </button>
              <button
                onClick={() => setViewMode("reserve")}
                className={cn(
                  "px-2.5 py-1 text-xs rounded transition-colors",
                  viewMode === "reserve"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                예약
              </button>
            </div>
          </div>
        )}

        {/* Timeline View (관리자용) */}
        {canManage && viewMode === "timeline" && (
          <div className="flex-1 overflow-auto p-3">
            <div className="relative flex">
              {/* 시간 라벨 */}
              <div className="w-12 shrink-0">
                {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                  <div
                    key={hour}
                    className="h-10 text-[10px] text-muted-foreground pr-2 text-right"
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* 그리드 라인 + 예약 */}
              <div className="flex-1 relative">
                {/* 그리드 라인 */}
                {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                  <div
                    key={hour}
                    className="h-10 border-b border-dashed border-muted"
                  />
                ))}

                {/* 현재 시간 표시선 (오늘만) */}
                {isToday(selectedDate) && (() => {
                  const now = new Date();
                  const currentHour = now.getHours() + now.getMinutes() / 60;
                  if (currentHour >= 7 && currentHour < 22) {
                    const topOffset = (currentHour - 7) * 40;
                    return (
                      <div
                        className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                        style={{ top: `${topOffset}px` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="flex-1 h-0.5 bg-red-500" />
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 예약 바 */}
                {selectedDateReservations.map((res) => {
                  const room = availableRooms.find(r => r.id === res.room_id);
                  const startDate = new Date(res.start_at);
                  const endDate = new Date(res.end_at);
                  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
                  const endHour = endDate.getHours() + endDate.getMinutes() / 60;
                  const duration = endHour - startHour;

                  const topOffset = (startHour - 7) * 40;
                  const height = Math.max(duration * 40, 24);

                  if (startHour < 7 || startHour >= 22) return null;

                  return (
                    <div
                      key={res.id}
                      className="absolute left-1 right-1 px-2 py-1 rounded bg-primary/20 border border-primary/30 overflow-hidden cursor-pointer hover:bg-primary/30 transition-colors"
                      style={{ top: `${topOffset}px`, height: `${height}px` }}
                      onClick={() => handleCancelReservation(res.id)}
                    >
                      <p className="text-[10px] font-medium truncate">{res.user?.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">
                        {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")} · {room?.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* List View (관리자용) */}
        {canManage && viewMode === "list" && (
          <div className="flex-1 overflow-auto p-3">
            {selectedDateReservations.length > 0 ? (
              <div className="space-y-1.5">
                {selectedDateReservations.map((res) => {
                  const room = availableRooms.find(r => r.id === res.room_id);
                  const startDate = new Date(res.start_at);
                  const endDate = new Date(res.end_at);
                  return (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {res.user?.name || "알 수 없음"}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {room?.name || ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelReservation(res.id)}
                      >
                        취소
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  이 날짜에 예약이 없습니다
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reserve View - Class Selection (관리자 예약모드 or 학생) */}
        {(!canManage || viewMode === "reserve") && !isPastDate && (
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-foreground mb-2.5">클래스 선택</p>
            <div className="flex flex-wrap gap-2">
              {availableRooms.map((room) => {
                const isSelected = selectedRoom === room.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98]",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 hover:bg-muted/60 text-foreground"
                    )}
                  >
                    <span>{room.name}</span>
                    {room.capacity && (
                      <span className={cn(
                        "text-[10px]",
                        isSelected
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}>
                        ({room.capacity}명)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Time Slots (관리자 예약모드 or 학생) */}
        {(!canManage || viewMode === "reserve") && (
          <div className="flex-1 overflow-auto p-4">
            {isPastDate ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                <Clock className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                지난 날짜는 예약할 수 없습니다
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                오늘 이후 날짜를 선택해주세요
              </p>
            </div>
          ) : selectedRoom ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-foreground">
                  시간 선택
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {availableRooms.find(r => r.id === selectedRoom)?.name}
                </span>
              </div>
              <div className="space-y-1.5">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.time}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all",
                      slot.isDisabled && "bg-muted/20 opacity-50",
                      slot.isFull && !slot.isDisabled && "bg-orange-50 dark:bg-orange-950/20",
                      slot.hasMyReservation && "bg-primary/10",
                      !slot.isDisabled && !slot.isFull && !slot.hasMyReservation && "bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <span className={cn(
                          "font-semibold",
                          slot.isDisabled && "text-muted-foreground"
                        )}>
                          {slot.time}
                        </span>
                        <span className="text-muted-foreground"> - {slot.endTime}</span>
                      </div>

                      {/* 예약 현황 */}
                      {!slot.isDisabled && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          slot.isFull
                            ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {slot.reservations.length}/{slot.capacity}
                        </span>
                      )}

                      {/* 예약자 표시 (owner/instructor만) */}
                      {canManage && slot.reservations.length > 0 && !slot.isDisabled && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>{slot.reservations.map(r => r.user?.name).join(", ")}</span>
                        </div>
                      )}
                    </div>

                    {slot.isDisabled ? (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" />
                        {slot.disableReason}
                      </span>
                    ) : slot.hasMyReservation ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const myRes = slot.reservations.find(r => r.reserved_by === user?.id);
                          if (myRes) handleCancelReservation(myRes.id);
                        }}
                      >
                        취소
                      </Button>
                    ) : slot.isFull ? (
                      <span className="text-[10px] text-orange-500 font-medium">
                        마감
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => handleReserve(slot)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "예약"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {timeSlots.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    이용 가능한 시간이 없습니다
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                클래스를 선택해주세요
              </p>
            </div>
            )}
          </div>
        )}

        {/* Info - Only show when in reserve mode and not past date */}
        {(!canManage || viewMode === "reserve") && !isPastDate && (
          <div className="px-4 py-3 border-t bg-muted/20 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-muted border" />
                <span>사용불가</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-orange-100 border-orange-200 dark:bg-orange-900/30" />
                <span>마감</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary/20 border-primary/50" />
                <span>내 예약</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
