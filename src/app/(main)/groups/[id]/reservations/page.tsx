"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Plus,
  X,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import { RoomReservation, Group, ClassRoom, GroupMember } from "@/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ReservationsPageProps {
  params: { id: string };
}

export default function ReservationsPage({ params }: ReservationsPageProps) {
  const [reservations, setReservations] = useState<(RoomReservation & { room?: ClassRoom; user?: { name: string } })[]>([]);
  const [availableRooms, setAvailableRooms] = useState<ClassRoom[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>("member");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [params.id]);

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

    // 사용 가능한 클래스 필터링 (연습실 제외 클래스 제외)
    const allClasses = groupData?.settings?.classes || [];
    const excluded = groupData?.settings?.excluded_practice_classes || [];
    const available = allClasses.filter((c: ClassRoom) => !excluded.includes(c.name));

    if (groupData) {
      setGroup(groupData as Group);
      setAvailableRooms(available);
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

    // 예약 로드
    const { data: reservationData } = await supabase
      .from("room_reservations")
      .select(`
        *,
        user:users!reserved_by(name)
      `)
      .eq("group_id", params.id)
      .gte("start_at", new Date().toISOString())
      .order("start_at");

    // 클래스 정보 매핑
    const reservationsWithRoom = (reservationData || []).map((res) => {
      const room = allClasses.find((c: ClassRoom) => c.id === res.room_id);
      return { ...res, room };
    });

    setReservations(reservationsWithRoom as any);
    setIsLoading(false);
  };

  const canManage = userRole === "owner" || userRole === "admin";
  const hasPracticeRoom = group?.settings?.has_practice_room;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedRoom || !startTime || !endTime) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const startAt = new Date(`${selectedDate}T${startTime}`);
    const endAt = new Date(`${selectedDate}T${endTime}`);

    // 시간 충돌 확인
    const { data: conflicts } = await supabase
      .from("room_reservations")
      .select("id")
      .eq("group_id", params.id)
      .eq("room_id", selectedRoom)
      .neq("status", "rejected")
      .or(`and(start_at.lte.${endAt.toISOString()},end_at.gte.${startAt.toISOString()})`);

    if (conflicts && conflicts.length > 0) {
      alert("해당 시간에 이미 예약이 있습니다.");
      setIsSubmitting(false);
      return;
    }

    await supabase.from("room_reservations").insert({
      group_id: params.id,
      room_id: selectedRoom,
      reserved_by: user?.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: canManage ? "approved" : "pending",
    });

    resetForm();
    loadData();
  };

  const handleApprove = async (reservationId: string) => {
    const supabase = createClient();
    await supabase
      .from("room_reservations")
      .update({ status: "approved" })
      .eq("id", reservationId);
    loadData();
  };

  const handleReject = async (reservationId: string) => {
    const supabase = createClient();
    await supabase
      .from("room_reservations")
      .update({ status: "rejected" })
      .eq("id", reservationId);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("예약을 취소하시겠습니까?")) return;

    const supabase = createClient();
    await supabase.from("room_reservations").delete().eq("id", id);
    loadData();
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setSelectedRoom("");
    setStartTime("10:00");
    setEndTime("11:00");
    setIsSubmitting(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "대기중";
      case "approved": return "승인됨";
      case "rejected": return "거절됨";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "approved": return "bg-green-500/10 text-green-500";
      case "rejected": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 연습실이 비활성화된 경우 (학생 권한)
  if (!hasPracticeRoom && !canManage) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12 rounded-xl border">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">연습실 예약이 비활성화되어 있습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">클래스 예약</h2>
        {!showForm && availableRooms.length > 0 && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            예약하기
          </Button>
        )}
      </div>

      {/* Practice Room Info */}
      {group?.settings?.practice_room_hours && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-muted-foreground">
            이용 가능 시간: {group.settings.practice_room_hours.start} - {group.settings.practice_room_hours.end}
          </p>
        </div>
      )}

      {/* Add Reservation Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">새 예약</h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">클래스 선택</label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full p-2 rounded-lg border bg-background"
              required
            >
              <option value="">선택하세요</option>
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">날짜</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">시작 시간</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">종료 시간</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "예약"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Reservations List */}
      {reservations.length > 0 ? (
        <div className="space-y-3">
          {reservations.map((reservation) => {
            const startDate = new Date(reservation.start_at);
            const endDate = new Date(reservation.end_at);
            const isOwn = reservation.reserved_by === userId;

            return (
              <div
                key={reservation.id}
                className="rounded-xl border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        {reservation.room?.name || "알 수 없는 클래스"}
                      </span>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs", getStatusColor(reservation.status))}>
                        {getStatusLabel(reservation.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {startDate.toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {startDate.toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" - "}
                        {endDate.toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {reservation.user && (
                      <p className="text-sm text-muted-foreground mt-1">
                        예약자: {reservation.user.name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canManage && reservation.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleReject(reservation.id)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(reservation.id)}
                          className="p-2 hover:bg-green-500/10 text-green-500 rounded"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {(isOwn || canManage) && (
                      <button
                        onClick={() => handleDelete(reservation.id)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">예약 내역이 없습니다</p>
          {availableRooms.length > 0 && (
            <Button
              variant="link"
              onClick={() => setShowForm(true)}
              className="mt-2"
            >
              연습실을 예약해보세요
            </Button>
          )}
        </div>
      )}

      {/* Available Rooms Info */}
      {availableRooms.length === 0 && (
        <div className="text-center py-8 rounded-xl border bg-muted/30">
          <p className="text-muted-foreground">
            예약 가능한 클래스가 없습니다
          </p>
          {canManage && (
            <p className="text-sm text-muted-foreground mt-1">
              설정에서 클래스를 추가해주세요
            </p>
          )}
        </div>
      )}
    </div>
  );
}
