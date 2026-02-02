"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Plus,
  X,
  Loader2,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Lesson, GroupMember, User as UserType } from "@/types";
import { cn } from "@/lib/utils";

interface LessonsPageProps {
  params: { id: string };
}

export default function LessonsPage({ params }: LessonsPageProps) {
  const [lessons, setLessons] = useState<(Lesson & { instructor?: UserType; student?: UserType })[]>([]);
  const [members, setMembers] = useState<(GroupMember & { user: UserType })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>("member");
  const [userId, setUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"upcoming" | "past">("upcoming");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || "");

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

    // 수업 로드
    const { data: lessonData } = await supabase
      .from("lessons")
      .select(`
        *,
        instructor:users!instructor_id(*),
        student:users!student_id(*)
      `)
      .eq("group_id", params.id)
      .order("scheduled_at", { ascending: false });

    // 멤버 목록 로드 (학생)
    const { data: memberData } = await supabase
      .from("group_members")
      .select(`
        *,
        user:users(*)
      `)
      .eq("group_id", params.id)
      .eq("status", "approved")
      .in("role", ["member"]);

    setLessons((lessonData as any[]) || []);
    setMembers((memberData as (GroupMember & { user: UserType })[]) || []);
    setIsLoading(false);
  };

  const canManage = userRole === "owner" || userRole === "admin" || userRole === "instructor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}`);

    await supabase.from("lessons").insert({
      group_id: params.id,
      instructor_id: user?.id,
      student_id: selectedStudent || null,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: duration,
      status: "scheduled",
      is_makeup: false,
    });

    resetForm();
    loadData();
  };

  const handleStatusChange = async (lessonId: string, status: string) => {
    const supabase = createClient();
    await supabase
      .from("lessons")
      .update({ status })
      .eq("id", lessonId);
    loadData();
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("수업을 삭제하시겠습니까?")) return;

    const supabase = createClient();
    await supabase.from("lessons").delete().eq("id", id);
    loadData();
    setOpenMenuId(null);
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setSelectedTime("10:00");
    setDuration(60);
    setSelectedStudent("");
    setIsSubmitting(false);
  };

  const now = new Date();
  const filteredLessons = lessons.filter((lesson) => {
    const lessonDate = new Date(lesson.scheduled_at);
    if (viewMode === "upcoming") {
      return lessonDate >= now || lesson.status === "scheduled" || lesson.status === "in_progress";
    }
    return lessonDate < now || lesson.status === "completed" || lesson.status === "cancelled";
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled": return "예정";
      case "in_progress": return "진행중";
      case "completed": return "완료";
      case "cancelled": return "취소됨";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-500/10 text-blue-500";
      case "in_progress": return "bg-yellow-500/10 text-yellow-500";
      case "completed": return "bg-green-500/10 text-green-500";
      case "cancelled": return "bg-red-500/10 text-red-500";
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

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">수업 관리</h2>
        {canManage && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            수업 추가
          </Button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("upcoming")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            viewMode === "upcoming"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          예정된 수업
        </button>
        <button
          onClick={() => setViewMode("past")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            viewMode === "past"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          지난 수업
        </button>
      </div>

      {/* Add Lesson Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">새 수업 등록</h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">날짜</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">시간</label>
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">수업 시간 (분)</label>
            <div className="flex gap-2">
              {[30, 45, 60, 90, 120].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDuration(min)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm transition-colors",
                    duration === min
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {min}분
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">학생 (선택)</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full p-2 rounded-lg border bg-background"
            >
              <option value="">선택 안함 (그룹 수업)</option>
              {members.map((member) => (
                <option key={member.id} value={member.user_id}>
                  {member.nickname || member.user?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "등록"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Lessons List */}
      {filteredLessons.length > 0 ? (
        <div className="space-y-3">
          {filteredLessons.map((lesson) => {
            const lessonDate = new Date(lesson.scheduled_at);

            return (
              <div
                key={lesson.id}
                className="rounded-xl border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs", getStatusColor(lesson.status))}>
                        {getStatusLabel(lesson.status)}
                      </span>
                      {lesson.is_makeup && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-500">
                          보강
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {lessonDate.toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {lessonDate.toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        {lesson.duration_minutes}분
                      </span>
                    </div>

                    {lesson.student && (
                      <p className="text-sm mt-2 flex items-center gap-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {lesson.student.name}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === lesson.id ? null : lesson.id)
                        }
                        className="p-2 hover:bg-muted rounded"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenuId === lesson.id && (
                        <div className="absolute right-0 top-10 w-32 bg-background border rounded-lg shadow-lg py-1 z-10">
                          {lesson.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => handleStatusChange(lesson.id, "in_progress")}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                              >
                                시작
                              </button>
                              <button
                                onClick={() => handleStatusChange(lesson.id, "cancelled")}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                취소
                              </button>
                            </>
                          )}
                          {lesson.status === "in_progress" && (
                            <button
                              onClick={() => handleStatusChange(lesson.id, "completed")}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              완료
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(lesson.id)}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {viewMode === "upcoming" ? "예정된 수업이 없습니다" : "지난 수업이 없습니다"}
          </p>
          {canManage && viewMode === "upcoming" && (
            <Button
              variant="link"
              onClick={() => setShowForm(true)}
              className="mt-2"
            >
              첫 수업을 등록해보세요
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
