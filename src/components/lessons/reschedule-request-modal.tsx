"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lesson } from "@/types";
import { format, addWeeks, isBefore, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { X, Calendar, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface RescheduleRequestModalProps {
  lesson: Lesson;
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleRequestModal({
  lesson,
  onClose,
  onSuccess,
}: RescheduleRequestModalProps) {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState(
    format(new Date(lesson.scheduled_at), "HH:mm")
  );
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originalDate = new Date(lesson.scheduled_at);
  const today = startOfDay(new Date());
  const maxDate = addWeeks(today, 3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      toast.warning("변경할 날짜와 시간을 선택해주세요.");
      return;
    }

    if (!reason.trim()) {
      toast.warning("변경 사유를 입력해주세요.");
      return;
    }

    const requestedDate = new Date(`${selectedDate}T${selectedTime}`);

    if (isBefore(requestedDate, today)) {
      toast.warning("오늘 이후 날짜를 선택해주세요.");
      return;
    }

    if (isBefore(maxDate, startOfDay(requestedDate))) {
      toast.warning("3주 이내의 날짜만 선택 가능합니다.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("로그인이 필요합니다.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("lesson_change_requests").insert({
      lesson_id: lesson.id,
      requested_by: user.id,
      requested_date: requestedDate.toISOString(),
      reason: reason.trim(),
      status: "pending",
    });

    if (error) {
      console.error("Error creating reschedule request:", error);
      toast.error("변경 신청에 실패했습니다.");
      setIsSubmitting(false);
      return;
    }

    toast.success("수업 변경 신청이 완료되었습니다.");
    onSuccess();
  };

  // Generate time options (every 30 minutes from 07:00 to 22:00)
  const timeOptions = [];
  for (let h = 7; h < 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      timeOptions.push(time);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">수업 변경 신청</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Original Schedule */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">현재 수업 일정</p>
            <p className="font-medium">
              {format(originalDate, "M월 d일 (EEE) HH:mm", { locale: ko })}
            </p>
          </div>

          {/* New Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              변경할 날짜
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(today, "yyyy-MM-dd")}
              max={format(maxDate, "yyyy-MM-dd")}
              required
            />
            <p className="text-xs text-muted-foreground">
              오늘부터 3주 이내의 날짜만 선택 가능합니다.
            </p>
          </div>

          {/* New Time Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              변경할 시간
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              required
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              변경 사유 <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="수업 변경 사유를 입력해주세요"
              className="w-full px-3 py-2 rounded-lg border bg-background min-h-[100px] resize-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  신청 중...
                </>
              ) : (
                "변경 신청"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
