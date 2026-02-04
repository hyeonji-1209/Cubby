"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LessonChangeRequest, Lesson, User } from "@/types";
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
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
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
  const [requests, setRequests] = useState<RescheduleRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handleApprove = async (request: RescheduleRequestWithDetails) => {
    setProcessingId(request.id);
    const supabase = createClient();

    // Update the request status
    const { error: requestError } = await supabase
      .from("lesson_change_requests")
      .update({
        status: "approved",
        reviewed_by: instructorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (requestError) {
      console.error("Error approving request:", requestError);
      toast.error("승인에 실패했습니다.");
      setProcessingId(null);
      return;
    }

    // Update the lesson's scheduled time
    const { error: lessonError } = await supabase
      .from("lessons")
      .update({
        scheduled_at: request.requested_date,
      })
      .eq("id", request.lesson_id);

    if (lessonError) {
      console.error("Error updating lesson:", lessonError);
      toast.error("수업 일정 변경에 실패했습니다.");
      setProcessingId(null);
      return;
    }

    toast.success("수업 변경 요청이 승인되었습니다.");
    loadRequests();
    onUpdate?.();
    setProcessingId(null);
  };

  const handleReject = async (request: RescheduleRequestWithDetails) => {
    setProcessingId(request.id);
    const supabase = createClient();

    const { error } = await supabase
      .from("lesson_change_requests")
      .update({
        status: "rejected",
        reviewed_by: instructorId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      console.error("Error rejecting request:", error);
      toast.error("거절에 실패했습니다.");
      setProcessingId(null);
      return;
    }

    toast.success("수업 변경 요청이 거절되었습니다.");
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
    return null;
  }

  return (
    <div className="p-3 border-b space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <CalendarClock className="h-4 w-4" />
        수업 변경 요청 ({requests.length})
      </h3>
      <div className="space-y-2">
        {requests.map((request) => {
          const isProcessing = processingId === request.id;
          const originalDate = new Date(request.lesson.scheduled_at);
          const requestedDate = new Date(request.requested_date);

          return (
            <div
              key={request.id}
              className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Student Name */}
                  <p className="font-medium mb-2">
                    {request.lesson.student?.name || request.requester?.name}
                  </p>

                  {/* Date Change */}
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {format(originalDate, "M/d (EEE) HH:mm", { locale: ko })}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      {format(requestedDate, "M/d (EEE) HH:mm", { locale: ko })}
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{request.reason}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    disabled={isProcessing}
                    onClick={() => handleReject(request)}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        거절
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isProcessing}
                    onClick={() => handleApprove(request)}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        승인
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
