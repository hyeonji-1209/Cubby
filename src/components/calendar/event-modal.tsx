"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { X, Loader2, Calendar, Trash2, MapPin } from "lucide-react";
import { CalendarEvent, ClassRoom } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId: string;
  isEducationType: boolean;
  initialDate?: Date;
  event?: CalendarEvent | null; // 수정 모드일 때 기존 이벤트
  locations?: ClassRoom[]; // 등록된 장소 목록 (클래스 활용)
  existingEvents?: CalendarEvent[]; // 충돌 감지용 기존 이벤트
}

export function EventModal({
  isOpen,
  onClose,
  onSuccess,
  groupId,
  isEducationType,
  initialDate,
  event,
  locations = [],
  existingEvents = [],
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [isAcademyHoliday, setIsAcademyHoliday] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditMode = !!event;

  // 충돌 감지 함수
  const checkConflict = (
    newStartAt: Date,
    newEndAt: Date,
    newLocationId: string
  ): { type: "block" | "warning" | null; message: string | null } => {
    if (!newLocationId) return { type: null, message: null };

    const locationName = locations.find((l) => l.id === newLocationId)?.name || "";

    for (const existingEvent of existingEvents) {
      // 자기 자신은 제외
      if (event && existingEvent.id === event.id) continue;

      // 같은 장소인지 확인
      if (existingEvent.location_id !== newLocationId) continue;

      const existingStart = new Date(existingEvent.start_at);
      const existingEnd = new Date(existingEvent.end_at);

      // 시간 겹침 확인
      const hasTimeOverlap =
        (newStartAt < existingEnd && newEndAt > existingStart);

      if (!hasTimeOverlap) continue;

      // 정확히 같은 시간인지 확인
      const isSameTime =
        newStartAt.getTime() === existingStart.getTime() &&
        newEndAt.getTime() === existingEnd.getTime();

      if (isSameTime) {
        return {
          type: "block",
          message: `"${existingEvent.title}" 일정과 같은 시간, 같은 장소(${locationName})입니다.`,
        };
      } else {
        return {
          type: "warning",
          message: `"${existingEvent.title}" 일정과 시간이 겹칩니다. (${locationName})`,
        };
      }
    }

    return { type: null, message: null };
  };

  // 장소나 시간이 변경될 때 충돌 체크
  const updateConflictWarning = () => {
    if (!startDate || !endDate || !locationId) {
      setConflictWarning(null);
      return;
    }

    const startAt = new Date(startDate);
    const endAt = new Date(endDate);

    if (!allDay) {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      startAt.setHours(startHour, startMin, 0);
      endAt.setHours(endHour, endMin, 0);
    } else {
      startAt.setHours(0, 0, 0);
      endAt.setHours(23, 59, 59);
    }

    const conflict = checkConflict(startAt, endAt, locationId);
    setConflictWarning(conflict.message);
  };

  // 모달이 열릴 때 초기값 설정
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // 수정 모드: 기존 이벤트 값으로 설정
        setTitle(event.title);
        setDescription(event.description || "");
        setStartDate(format(new Date(event.start_at), "yyyy-MM-dd"));
        setEndDate(format(new Date(event.end_at), "yyyy-MM-dd"));
        setStartTime(format(new Date(event.start_at), "HH:mm"));
        setEndTime(format(new Date(event.end_at), "HH:mm"));
        setAllDay(event.all_day ?? false);
        setIsAcademyHoliday(event.is_academy_holiday || false);
        setLocationId(event.location_id || "");
        setConflictWarning(null);
      } else if (initialDate) {
        // 생성 모드: 초기 날짜로 설정
        const dateStr = format(initialDate, "yyyy-MM-dd");
        setStartDate(dateStr);
        setEndDate(dateStr);
        setStartTime("09:00");
        setEndTime("10:00");
        setAllDay(false);
        setIsAcademyHoliday(false);
        setLocationId("");
        setConflictWarning(null);
        setTitle("");
        setDescription("");
      }
    }
  }, [isOpen, initialDate, event]);

  // 충돌 감지 업데이트
  useEffect(() => {
    if (isOpen) {
      updateConflictWarning();
    }
  }, [isOpen, startDate, endDate, startTime, endTime, allDay, locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    const startAt = new Date(startDate);
    const endAt = new Date(endDate);

    if (!allDay) {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      startAt.setHours(startHour, startMin, 0);
      endAt.setHours(endHour, endMin, 0);
    } else {
      startAt.setHours(0, 0, 0);
      endAt.setHours(23, 59, 59);
    }

    // 충돌 체크 (block 유형이면 저장 불가)
    const conflict = checkConflict(startAt, endAt, locationId);
    if (conflict.type === "block") {
      alert(conflict.message);
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const selectedLocation = locations.find((l) => l.id === locationId);

    const eventData = {
      title: title.trim(),
      description: description.trim() || null,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: allDay,
      event_type: "shared" as const,
      visibility: "all" as const,
      location_id: locationId || null,
      location: selectedLocation?.name || null,
      // is_academy_holiday 컬럼이 DB에 있으면 주석 해제
      // is_academy_holiday: isAcademyHoliday,
    };

    if (isEditMode && event) {
      // PATCH 요청으로 수정
      await supabase
        .from("calendar_events")
        .update(eventData)
        .eq("id", event.id);
    } else {
      // INSERT 요청으로 생성
      await supabase.from("calendar_events").insert({
        ...eventData,
        group_id: groupId,
        user_id: user?.id,
      });
    }

    resetForm();
    onSuccess();
    onClose();
  };

  const handleDelete = async () => {
    if (!event || !confirm("일정을 삭제하시겠습니까?")) return;

    setIsDeleting(true);
    const supabase = createClient();
    await supabase.from("calendar_events").delete().eq("id", event.id);

    resetForm();
    onSuccess();
    onClose();
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStartTime("09:00");
    setEndTime("10:00");
    setAllDay(false);
    setIsAcademyHoliday(false);
    setLocationId("");
    setConflictWarning(null);
    setIsSubmitting(false);
    setIsDeleting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 시작일이 변경되면 종료일도 같이 변경 (종료일이 시작일보다 이전이면)
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (!endDate || new Date(value) > new Date(endDate)) {
      setEndDate(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditMode ? "일정 수정" : "일정 추가"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 제목 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">제목</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목을 입력하세요"
              required
              autoFocus
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">설명 (선택)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정에 대한 설명"
              rows={2}
            />
          </div>

          {/* 하루 종일 */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded"
            />
            하루 종일
          </label>

          {/* 날짜/시간 */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-3">
              {/* 시작 */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">시작일</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* 종료 */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">종료일</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 시간 (하루 종일이 아닐 때만) */}
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">시작 시간</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">종료 시간</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 장소 선택 */}
          {locations.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                장소 (선택)
              </label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="장소 선택 안함">
                    {locationId ? locations.find(l => l.id === locationId)?.name : "장소 선택 안함"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">장소 선택 안함</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conflictWarning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
                  ⚠️ {conflictWarning}
                </p>
              )}
            </div>
          )}

          {/* 학원 휴일 처리 (교육 타입만) */}
          {isEducationType && (
            <label className="flex items-center gap-2 text-sm cursor-pointer p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <input
                type="checkbox"
                checked={isAcademyHoliday}
                onChange={(e) => setIsAcademyHoliday(e.target.checked)}
                className="rounded accent-red-500"
              />
              <div>
                <span className="text-red-600 dark:text-red-400 font-medium">학원 휴일 처리</span>
                <p className="text-xs text-red-500/70 dark:text-red-400/70 mt-0.5">
                  학생에게 보강 안내가 발송됩니다
                </p>
              </div>
            </label>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            {isEditMode && (
              <Button
                type="button"
                variant="destructive"
                className="gap-1.5"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </>
                )}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isDeleting || !title.trim() || !startDate || !endDate}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
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
