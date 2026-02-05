"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LessonChangeRequest, Lesson, User, ClassRoom } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  X,
  Loader2,
  Clock,
  ArrowRight,
  MessageSquare,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useGroup } from "@/lib/contexts/group-context";
import { cn } from "@/lib/utils";

interface RescheduleRequestWithDetails extends LessonChangeRequest {
  lesson: Lesson & {
    student?: User;
  };
  requester?: User;
}

interface RescheduleRequestsListProps {
  groupId: string;
  instructorId: string;
  onUpdate?: () => void;
}

export function RescheduleRequestsList({
  groupId,
  instructorId,
  onUpdate,
}: RescheduleRequestsListProps) {
  const toast = useToast();
  const { group } = useGroup();
  const [requests, setRequests] = useState<RescheduleRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 클래스 선택 및 거절 사유 상태
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const classes = group?.settings?.classes || [];

  useEffect(() => {
    loadRequests();
  }, [groupId, instructorId]);

  const loadRequests = async () => {
    const supabase = createClient();

    // Get pending requests for lessons where this user is the instructor
    const { data, error } = await supabase
      .from("lesson_change_requests")
      .select(`
        *,
        lesson:lessons!lesson_id(
          *,
          student:profiles!lessons_student_id_fkey(*)
        ),
        requester:profiles!requested_by(*)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reschedule requests:", error);
      setIsLoading(false);
      return;
    }

    // Filter to only include requests for lessons where this user is the instructor
    const filteredRequests = (data || []).filter(
      (req: RescheduleRequestWithDetails) => req.lesson?.instructor_id === instructorId
    );

    setRequests(filteredRequests as RescheduleRequestWithDetails[]);
    setIsLoading(false);
  };

  const handleApprove = async (request: RescheduleRequestWithDetails, roomId?: string) => {
    if (classes.length > 0 && !roomId) {
      toast.warning("클래스를 선택해주세요.");
      return;
    }

    setProcessingId(request.id);
    const supabase = createClient();

    // 원래 일정 저장
    const originalDate = request.lesson.scheduled_at;

    // Update the request status with room_id and original_date
    const { error: requestError } = await supabase
      .from("lesson_change_requests")
      .update({
        status: "approved",
        reviewed_by: instructorId,
        reviewed_at: new Date().toISOString(),
        room_id: roomId || null,
        original_date: originalDate,
      })
      .eq("id", request.id);

    if (requestError) {
      console.error("Error approving request:", requestError);
      toast.error("승인에 실패했습니다.");
      setProcessingId(null);
      return;
    }

    // Update the lesson's scheduled time and room
    const lessonUpdate: { scheduled_at: string; room_id?: string } = {
      scheduled_at: request.requested_date,
    };
    if (roomId) {
      lessonUpdate.room_id = roomId;
    }

    const { error: lessonError } = await supabase
      .from("lessons")
      .update(lessonUpdate)
      .eq("id", request.lesson_id);

    if (lessonError) {
      console.error("Error updating lesson:", lessonError);
      toast.error("수업 일정 변경에 실패했습니다.");
      setProcessingId(null);
      return;
    }

    toast.success("수업 변경 요청이 승인되었습니다.");
    setSelectedRooms(prev => {
      const next = { ...prev };
      delete next[request.id];
      return next;
    });
    loadRequests();
    onUpdate?.();
    setProcessingId(null);
  };

  const openRejectModal = (requestId: string) => {
    setShowRejectModal(requestId);
    setRejectReason("");
  };

  const closeRejectModal = () => {
    setShowRejectModal(null);
    setRejectReason("");
  };

  const handleReject = async (request: RescheduleRequestWithDetails, reason: string) => {
    if (!reason.trim()) {
      toast.warning("거절 사유를 입력해주세요.");
      return;
    }

    setProcessingId(request.id);
    const supabase = createClient();

    const { error } = await supabase
      .from("lesson_change_requests")
      .update({
        status: "rejected",
        reviewed_by: instructorId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason.trim(),
      })
      .eq("id", request.id);

    if (error) {
      console.error("Error rejecting request:", error);
      toast.error("거절에 실패했습니다.");
      setProcessingId(null);
      return;
    }

    toast.success("수업 변경 요청이 거절되었습니다.");
    closeRejectModal();
    loadRequests();
    onUpdate?.();
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CalendarClock className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">처리할 변경 요청이 없습니다</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => {
          const isProcessing = processingId === request.id;
          const originalDate = new Date(request.lesson.scheduled_at);
          const requestedDate = new Date(request.requested_date);
          const lesson = request.lesson;
          const selectedRoom = selectedRooms[request.id] || "";

          return (
            <div
              key={request.id}
              className="p-4 rounded-xl border bg-card"
            >
              {/* Header: 학생 이름 */}
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">
                  {lesson.student?.name || request.requester?.name}
                </p>
              </div>

              {/* 간단 정보: 날짜 변경, 수업 시간 */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 pb-3 border-b">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{format(originalDate, "M/d (EEE) HH:mm", { locale: ko })}</span>
                  <ArrowRight className="h-3 w-3 text-amber-500" />
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {format(requestedDate, "M/d (EEE) HH:mm", { locale: ko })}
                  </span>
                </div>
                <span className="text-muted-foreground/50">|</span>
                <span>{lesson.duration_minutes || 60}분</span>
              </div>

              {/* 변경 사유 */}
              <div className="mb-3 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-0.5 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  변경 사유
                </p>
                <p className="text-sm">{request.reason}</p>
              </div>

              {/* 클래스 선택 (클래스가 있는 경우) */}
              {classes.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    클래스 지정
                  </p>
                  <div className="relative">
                    <select
                      value={selectedRoom}
                      onChange={(e) => setSelectedRooms(prev => ({ ...prev, [request.id]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm appearance-none pr-8"
                    >
                      <option value="">클래스 선택</option>
                      {classes.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  disabled={isProcessing}
                  onClick={() => openRejectModal(request.id)}
                >
                  {isProcessing && showRejectModal === request.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5 mr-1" />
                      거절
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "flex-1 h-9 text-xs text-white",
                    classes.length > 0 && !selectedRoom
                      ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  )}
                  disabled={isProcessing || (classes.length > 0 && !selectedRoom)}
                  onClick={() => handleApprove(request, selectedRoom || undefined)}
                >
                  {isProcessing && showRejectModal !== request.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      승인
                    </>
                  )}
                </Button>
              </div>

            {/* 수업 내용 & 과제 (주로 보이게) */}
            <div className="space-y-2">
              {lesson.content && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">수업 내용</p>
                  <p className="text-sm whitespace-pre-wrap">{lesson.content}</p>
                </div>
              )}
              {lesson.homework && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">과제</p>
                  <p className="text-sm whitespace-pre-wrap text-primary">{lesson.homework}</p>
                </div>
              )}
              {lesson.notes && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">비고</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{lesson.notes}</p>
                </div>
              )}
              {!lesson.content && !lesson.homework && !lesson.notes && (
                <p className="text-sm text-muted-foreground">수업 기록이 없습니다</p>
              )}
            </div>
          </div>
        );
      })}
    </div>

      {/* 거절 사유 입력 모달 */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRejectModal();
          }}
        >
          <div className="bg-background rounded-xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">변경 요청 거절</h3>
              <Button variant="ghost" size="icon" onClick={closeRejectModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  거절 사유 <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="거절 사유를 입력해주세요"
                  className="w-full px-3 py-2 rounded-lg border bg-background min-h-[100px] resize-none text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeRejectModal}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={processingId === showRejectModal || !rejectReason.trim()}
                  onClick={() => {
                    const request = requests.find(r => r.id === showRejectModal);
                    if (request) handleReject(request, rejectReason);
                  }}
                >
                  {processingId === showRejectModal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "거절하기"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
