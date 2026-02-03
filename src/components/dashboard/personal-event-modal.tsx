"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CalendarEvent } from "@/types";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface PersonalEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  event?: CalendarEvent | null;
}

export function PersonalEventModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  event,
}: PersonalEventModalProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditMode = !!event;

  useEffect(() => {
    if (isOpen) {
      if (event) {
        // 수정 모드
        setTitle(event.title);
        setDescription(event.description || "");
        setAllDay(event.all_day ?? false);

        const start = new Date(event.start_at);
        const end = new Date(event.end_at);

        setStartDate(format(start, "yyyy-MM-dd"));
        setEndDate(format(end, "yyyy-MM-dd"));

        if (!event.all_day) {
          setStartTime(format(start, "HH:mm"));
          setEndTime(format(end, "HH:mm"));
        }
      } else if (initialDate) {
        // 신규 모드
        const dateStr = format(initialDate, "yyyy-MM-dd");
        setStartDate(dateStr);
        setEndDate(dateStr);
        setStartTime("09:00");
        setEndTime("10:00");
        setTitle("");
        setDescription("");
        setAllDay(false);
      }
    }
  }, [isOpen, event, initialDate]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStartTime("09:00");
    setEndTime("10:00");
    setAllDay(false);
    setIsSubmitting(false);
    setIsDeleting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    if (!startDate) {
      toast.error("시작 날짜를 선택해주세요.");
      return;
    }

    const startAt = new Date(startDate);
    const endAt = new Date(endDate || startDate);

    if (!allDay) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      startAt.setHours(startH, startM, 0);
      endAt.setHours(endH, endM, 0);
    } else {
      startAt.setHours(0, 0, 0);
      endAt.setHours(23, 59, 59);
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("로그인이 필요합니다.");
      setIsSubmitting(false);
      return;
    }

    const eventData = {
      title: title.trim(),
      description: description.trim() || null,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: allDay,
      user_id: user.id,
      group_id: null, // 개인 일정이므로 group_id는 null
    };

    if (isEditMode && event) {
      const { error } = await supabase
        .from("calendar_events")
        .update(eventData)
        .eq("id", event.id);

      if (error) {
        toast.error("일정 수정에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }
      toast.success("일정이 수정되었습니다.");
    } else {
      const { error } = await supabase.from("calendar_events").insert(eventData);

      if (error) {
        toast.error("일정 추가에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }
      toast.success("일정이 추가되었습니다.");
    }

    resetForm();
    onSuccess();
    onClose();
  };

  const handleDelete = async () => {
    if (!event) return;

    const confirmed = await confirm({
      title: "일정 삭제",
      message: "이 일정을 삭제하시겠습니까?",
      confirmText: "삭제",
      variant: "destructive",
    });

    if (!confirmed) return;

    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);

    if (error) {
      toast.error("일정 삭제에 실패했습니다.");
      setIsDeleting(false);
      return;
    }

    toast.success("일정이 삭제되었습니다.");
    resetForm();
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold">
            {isEditMode ? "일정 수정" : "개인 일정 추가"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목"
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* 날짜/시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">시작</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">종료</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* 하루종일 */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            하루 종일
          </label>

          {/* 시간 (하루종일 아닐 때만) */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">시작 시간</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">종료 시간</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          )}

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정에 대한 설명"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                삭제
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : isEditMode ? (
                "수정"
              ) : (
                "추가"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
