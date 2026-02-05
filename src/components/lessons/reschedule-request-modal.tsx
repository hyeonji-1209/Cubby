"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lesson, User as UserType } from "@/types";
import { format, addWeeks, isBefore, isAfter, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { X, Calendar, Clock, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface LessonWithInstructor extends Lesson {
  instructor?: UserType;
}

interface RescheduleRequestModalProps {
  lessons: LessonWithInstructor[];
  initialLesson?: LessonWithInstructor;
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleRequestModal({
  lessons,
  initialLesson,
  onClose,
  onSuccess,
}: RescheduleRequestModalProps) {
  const toast = useToast();
  const today = startOfDay(new Date());
  const maxDate = addWeeks(today, 3);

  // 앞으로 3주 이내의 수업만 필터링 (지난 수업 제외)
  const availableLessons = lessons.filter(lesson => {
    const lessonDate = new Date(lesson.scheduled_at);
    return isAfter(lessonDate, today) && isBefore(lessonDate, maxDate);
  });

  const [selectedLessonId, setSelectedLessonId] = useState(initialLesson?.id || availableLessons[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedLesson = availableLessons.find(l => l.id === selectedLessonId);

  // Set initial time when lesson is selected
  const handleLessonChange = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    const lesson = availableLessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedTime(format(new Date(lesson.scheduled_at), "HH:mm"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLessonId) {
      toast.warning("변경할 수업을 선택해주세요.");
      return;
    }

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
      lesson_id: selectedLessonId,
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

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">수업 일정 변경 신청</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Lesson Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">변경할 수업 선택</label>
            {availableLessons.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/50 border text-center">
                <p className="text-sm text-muted-foreground">
                  변경 가능한 수업이 없습니다
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  앞으로 3주 이내의 수업만 변경 신청할 수 있습니다
                </p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedLessonId}
                  onChange={(e) => handleLessonChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border bg-background appearance-none pr-10"
                >
                  {availableLessons.map((lesson) => {
                    const lessonDate = new Date(lesson.scheduled_at);
                    return (
                      <option key={lesson.id} value={lesson.id}>
                        {format(lessonDate, "M월 d일 (EEE) HH:mm", { locale: ko })}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            )}
          </div>

          {/* Current Schedule Info */}
          {selectedLesson && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">현재 수업 일정</p>
              <p className="font-medium">
                {format(new Date(selectedLesson.scheduled_at), "yyyy년 M월 d일 (EEE) HH:mm", { locale: ko })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLesson.instructor?.name} 선생님 · {selectedLesson.duration_minutes || 60}분 수업
              </p>
            </div>
          )}

          {/* New Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              변경 희망 날짜
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
              변경 희망 시간
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background"
              required
            >
              <option value="">시간 선택</option>
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
              className="w-full px-3 py-2 rounded-lg border bg-background min-h-[80px] resize-none"
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
