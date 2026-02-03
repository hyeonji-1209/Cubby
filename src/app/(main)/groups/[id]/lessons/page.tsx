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
  Trash2,
  Play,
  Check,
} from "lucide-react";
import { Lesson, GroupMember, User as UserType, Attendance } from "@/types";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDateWithWeekday } from "@/lib/date-utils";

interface LessonsPageProps {
  params: { id: string };
}

interface LessonWithDetails extends Lesson {
  instructor?: UserType;
  student?: UserType;
  attendance?: Attendance;
}

export default function LessonsPage({ params }: LessonsPageProps) {
  const { confirm } = useConfirm();

  const [lessons, setLessons] = useState<LessonWithDetails[]>([]);
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
  const [selectedLesson, setSelectedLesson] = useState<LessonWithDetails | null>(null);
  const [membershipId, setMembershipId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || "");

    const { data: membership } = await supabase
      .from("group_members")
      .select("id, role")
      .eq("group_id", params.id)
      .eq("user_id", user?.id)
      .single();

    if (membership) {
      setUserRole(membership.role);
      setMembershipId(membership.id);
    }

    // 수업 데이터 조회
    const { data: lessonData } = await supabase
      .from("lessons")
      .select(`
        *,
        instructor:profiles!lessons_instructor_id_fkey(*),
        student:profiles!lessons_student_id_fkey(*)
      `)
      .eq("group_id", params.id)
      .order("scheduled_at", { ascending: false });

    // 출석 데이터 조회
    const lessonIds = lessonData?.map(l => l.id) || [];
    let attendanceMap: Record<string, Attendance> = {};

    if (lessonIds.length > 0) {
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .in("lesson_id", lessonIds);

      if (attendanceData) {
        attendanceData.forEach(att => {
          attendanceMap[att.lesson_id] = att;
        });
      }
    }

    // 수업에 출석 데이터 연결
    const lessonsWithAttendance = (lessonData || []).map(lesson => ({
      ...lesson,
      attendance: attendanceMap[lesson.id] || null,
    }));

    const { data: memberData } = await supabase
      .from("group_members")
      .select(`
        *,
        user:profiles(*)
      `)
      .eq("group_id", params.id)
      .eq("status", "approved")
      .in("role", ["member"]);

    setLessons(lessonsWithAttendance as LessonWithDetails[]);
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

    // 수업 완료 시 출석 기록 없는 학생은 결석 처리
    if (status === "completed") {
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson?.student_id && !lesson.attendance) {
        await supabase
          .from("attendance")
          .insert({
            lesson_id: lessonId,
            member_id: lesson.student_id,
            status: "absent",
          });
      }
    }

    await supabase
      .from("lessons")
      .update({ status })
      .eq("id", lessonId);
    loadData();
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "수업 삭제",
      message: "수업을 삭제하시겠습니까?",
      confirmText: "삭제",
      variant: "destructive",
    });
    if (!confirmed) return;

    const supabase = createClient();
    await supabase.from("lessons").delete().eq("id", id);
    loadData();
    setOpenMenuId(null);
    if (selectedLesson?.id === id) {
      setSelectedLesson(null);
    }
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
      case "scheduled": return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "in_progress": return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed": return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled": return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // 출결 상태 라벨
  const getAttendanceLabel = (status?: string) => {
    switch (status) {
      case "present": return "출석";
      case "late": return "지각";
      case "early_leave": return "조퇴";
      case "absent": return "결석";
      case "excused": return "사유결석";
      default: return "미확인";
    }
  };

  // 출결 상태 색상
  const getAttendanceColor = (status?: string) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "late": return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "early_leave": return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
      case "absent": return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      case "excused": return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      default: return "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400";
    }
  };

  // 출결 상태 변경 (선생님용)
  const handleAttendanceChange = async (lessonId: string, memberId: string, status: string, reason?: string) => {
    const supabase = createClient();

    // 기존 출석 기록 확인
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("member_id", memberId)
      .single();

    if (existing) {
      // 업데이트
      await supabase
        .from("attendance")
        .update({ status, reason })
        .eq("id", existing.id);
    } else {
      // 새로 생성
      await supabase
        .from("attendance")
        .insert({
          lesson_id: lessonId,
          member_id: memberId,
          status,
          reason,
        });
    }

    loadData();
  };


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">수업 관리</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode("upcoming")}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium",
                viewMode === "upcoming"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              예정
            </button>
            <button
              onClick={() => setViewMode("past")}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium",
                viewMode === "past"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              지난
            </button>
          </div>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            수업 추가
          </Button>
        )}
      </div>

      {/* Add Lesson Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={resetForm} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-background rounded-lg p-6 w-full max-w-md mx-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">새 수업 등록</h3>
              <button type="button" onClick={resetForm} className="p-1 hover:bg-muted rounded">
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
                      "px-3 py-2 rounded-md text-sm",
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
                className="w-full p-2 rounded-md border bg-background"
              >
                <option value="">선택 안함 (그룹 수업)</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.nickname || member.user?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "등록"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Table / List */}
        <div className={`overflow-auto ${selectedLesson ? "hidden md:block md:w-80 lg:w-96 border-r" : "flex-1"}`}>
          {filteredLessons.length > 0 ? (
            selectedLesson ? (
              // 심플 리스트 (선택 시)
              <div className="divide-y">
                {filteredLessons.map((lesson) => {
                  const isSelected = selectedLesson?.id === lesson.id;
                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "p-3 cursor-pointer",
                        isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedLesson(lesson)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px]", getStatusColor(lesson.status))}>
                          {getStatusLabel(lesson.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateWithWeekday(lesson.scheduled_at)}
                        </span>
                      </div>
                      <p className="text-sm">
                        {formatTime(lesson.scheduled_at)} · {lesson.duration_minutes}분
                        {lesson.student && ` · ${lesson.student.name}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              // 풀 테이블 (선택 없을 시)
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-3 px-4 font-medium w-20 text-center">상태</th>
                    <th className="py-3 px-4 font-medium">날짜</th>
                    <th className="py-3 px-4 font-medium">시간</th>
                    <th className="py-3 px-4 font-medium w-20 text-center hidden sm:table-cell">시간</th>
                    <th className="py-3 px-4 font-medium hidden md:table-cell">학생</th>
                    <th className="py-3 px-4 font-medium w-20 text-center hidden lg:table-cell">출결</th>
                    {canManage && <th className="py-3 px-4 font-medium w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLessons.map((lesson) => (
                    <tr
                      key={lesson.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLesson(lesson)}
                    >
                      <td className="py-3 px-4 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-xs", getStatusColor(lesson.status))}>
                          {getStatusLabel(lesson.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatDateWithWeekday(lesson.scheduled_at)}</td>
                      <td className="py-3 px-4">{formatTime(lesson.scheduled_at)}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground hidden sm:table-cell">
                        {lesson.duration_minutes}분
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {lesson.student?.name || <span className="text-muted-foreground">그룹 수업</span>}
                      </td>
                      <td className="py-3 px-4 text-center hidden lg:table-cell">
                        {lesson.student_id && (
                          <span className={cn("px-2 py-0.5 rounded text-xs", getAttendanceColor(lesson.attendance?.status))}>
                            {getAttendanceLabel(lesson.attendance?.status)}
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === lesson.id ? null : lesson.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openMenuId === lesson.id && (
                              <div className="absolute right-0 top-8 w-28 bg-background border rounded-lg shadow-lg py-1 z-20">
                                {lesson.status === "scheduled" && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(lesson.id, "in_progress")}
                                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                    >
                                      <Play className="h-3.5 w-3.5" />
                                      시작
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(lesson.id, "cancelled")}
                                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      취소
                                    </button>
                                  </>
                                )}
                                {lesson.status === "in_progress" && (
                                  <button
                                    onClick={() => handleStatusChange(lesson.id, "completed")}
                                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    완료
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(lesson.id)}
                                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-3 opacity-50" />
              <p>{viewMode === "upcoming" ? "예정된 수업이 없습니다" : "지난 수업이 없습니다"}</p>
              {canManage && viewMode === "upcoming" && (
                <Button variant="link" onClick={() => setShowForm(true)} className="mt-2">
                  첫 수업을 등록해보세요
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedLesson && (
          <div className="flex-1 flex flex-col bg-background overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <span className={cn("px-2 py-0.5 rounded text-xs", getStatusColor(selectedLesson.status))}>
                  {getStatusLabel(selectedLesson.status)}
                </span>
                {selectedLesson.is_makeup && (
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    보강
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {canManage && (
                  <>
                    {selectedLesson.status === "scheduled" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(selectedLesson.id, "in_progress")}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          시작
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStatusChange(selectedLesson.id, "cancelled")}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {selectedLesson.status === "in_progress" && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(selectedLesson.id, "completed")}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        완료
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(selectedLesson.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                  </>
                )}
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="p-1.5 hover:bg-muted rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(selectedLesson.scheduled_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {formatTime(selectedLesson.scheduled_at)} - {selectedLesson.duration_minutes}분
                  </span>
                </div>

                {selectedLesson.student && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {selectedLesson.student.name}
                    </span>
                  </div>
                )}

                {selectedLesson.instructor && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    강사: {selectedLesson.instructor.name}
                  </div>
                )}

                {/* 출결 관리 (학생이 있는 수업만) */}
                {selectedLesson.student_id && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3">출결 현황</h4>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium",
                        getAttendanceColor(selectedLesson.attendance?.status)
                      )}>
                        {getAttendanceLabel(selectedLesson.attendance?.status)}
                      </span>
                      {selectedLesson.attendance?.check_in_at && (
                        <span className="text-xs text-muted-foreground">
                          체크인: {formatTime(selectedLesson.attendance.check_in_at)}
                        </span>
                      )}
                    </div>

                    {/* 출결 변경 버튼 (선생님만) */}
                    {canManage && selectedLesson.student_id && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">출결 상태 변경:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { status: "present", label: "출석" },
                            { status: "late", label: "지각" },
                            { status: "early_leave", label: "조퇴" },
                            { status: "absent", label: "결석" },
                            { status: "excused", label: "사유결석" },
                          ].map(({ status, label }) => (
                            <button
                              key={status}
                              onClick={() => handleAttendanceChange(
                                selectedLesson.id,
                                selectedLesson.student_id!,
                                status
                              )}
                              className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                                selectedLesson.attendance?.status === status
                                  ? getAttendanceColor(status)
                                  : "hover:bg-muted"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 수업 내용 */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">수업 내용</h4>
                  {selectedLesson.content ? (
                    <p className="text-sm whitespace-pre-wrap">{selectedLesson.content}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">수업 내용이 없습니다.</p>
                  )}
                </div>

                {/* 과제 */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">과제</h4>
                  {selectedLesson.homework ? (
                    <p className="text-sm whitespace-pre-wrap">{selectedLesson.homework}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">등록된 과제가 없습니다.</p>
                  )}
                </div>

                {/* 비고 */}
                {selectedLesson.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">비고</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedLesson.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
