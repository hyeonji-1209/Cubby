"use client";

import { useState, useEffect, Fragment } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronDown,
  ChevronUp,
  CalendarClock,
} from "lucide-react";
import { Lesson, GroupMember, User as UserType, Attendance } from "@/types";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDateWithWeekday, getRoundedCurrentTime } from "@/lib/date-utils";
import { useUser } from "@/lib/contexts/user-context";
import { useGroup } from "@/lib/contexts/group-context";
import { RescheduleRequestModal } from "@/components/lessons/reschedule-request-modal";
import { RescheduleRequestsList } from "@/components/lessons/reschedule-requests-list";
import { addWeeks, isBefore } from "date-fns";

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
  const { user } = useUser();
  const { membership, isOwner, canManage, isStudent, isGuardian } = useGroup();

  const [lessons, setLessons] = useState<LessonWithDetails[]>([]);
  const [members, setMembers] = useState<(GroupMember & { user: UserType })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState(getRoundedCurrentTime());
  const [duration, setDuration] = useState(60);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"upcoming" | "past">("upcoming");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithDetails | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [rescheduleLesson, setRescheduleLesson] = useState<LessonWithDetails | null>(null);

  const isStudentOrGuardian = isStudent || isGuardian;

  useEffect(() => {
    if (user) loadData();
  }, [params.id, user?.id]);

  const loadData = async () => {
    if (!user) return;
    const supabase = createClient();

    // 수업 데이터 조회 (membership 정보는 context에서 가져옴)
    let lessonQuery = supabase
      .from("lessons")
      .select(`
        *,
        instructor:profiles!lessons_instructor_id_fkey(*),
        student:profiles!lessons_student_id_fkey(*)
      `)
      .eq("group_id", params.id)
      .order("scheduled_at", { ascending: false });

    // 학생/보호자는 자신의 수업만 조회
    if (isStudentOrGuardian) {
      lessonQuery = lessonQuery.eq("student_id", user.id);
    }

    const { data: lessonData } = await lessonQuery;

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
        user:profiles!user_id(*)
      `)
      .eq("group_id", params.id)
      .eq("status", "approved")
      .in("role", ["student"]);

    setLessons(lessonsWithAttendance as LessonWithDetails[]);
    setMembers((memberData as (GroupMember & { user: UserType })[]) || []);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !user) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const scheduledAt = new Date(`${selectedDate}T${selectedTime}`);

    await supabase.from("lessons").insert({
      group_id: params.id,
      instructor_id: user.id,
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
    setSelectedTime(getRoundedCurrentTime());
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

  // 학생/보호자용 수업 뷰
  if (isStudentOrGuardian) {
    const completedLessons = lessons.filter(l => l.status === "completed");
    const upcomingLessons = lessons.filter(l => l.status === "scheduled" || l.status === "in_progress")
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const nextLesson = upcomingLessons[0];

    // 출석 통계 계산
    const attendanceStats = {
      total: completedLessons.length,
      present: completedLessons.filter(l => l.attendance?.status === "present").length,
      late: completedLessons.filter(l => l.attendance?.status === "late").length,
      absent: completedLessons.filter(l => l.attendance?.status === "absent" || l.attendance?.status === "excused").length,
    };
    const attendanceRate = attendanceStats.total > 0
      ? Math.round(((attendanceStats.present + attendanceStats.late) / attendanceStats.total) * 100)
      : 100;

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">내 수업</h2>
        </div>

        <div className="flex-1 overflow-auto">
          {/* 요약 카드 그리드 */}
          <div className="p-4 grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border bg-card">
              <p className="text-xs text-muted-foreground mb-1">예정된 수업</p>
              <p className="text-2xl font-bold">{upcomingLessons.length}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <p className="text-xs text-muted-foreground mb-1">완료한 수업</p>
              <p className="text-2xl font-bold">{completedLessons.length}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <p className="text-xs text-muted-foreground mb-1">출석률</p>
              <p className={cn(
                "text-2xl font-bold",
                attendanceRate >= 80 ? "text-green-600" : attendanceRate >= 60 ? "text-yellow-600" : "text-red-600"
              )}>
                {attendanceRate}%
              </p>
            </div>
          </div>

          {/* 다가오는 수업 섹션 */}
          <div className="px-4 pb-4">
            <h3 className="text-sm font-semibold mb-3">다가오는 수업</h3>

            {upcomingLessons.length > 0 ? (
              <div className="space-y-2">
                {upcomingLessons.map((lesson, index) => {
                  const lessonDate = new Date(lesson.scheduled_at);
                  const maxRescheduleDate = addWeeks(new Date(), 3);
                  const canReschedule = lesson.status === "scheduled" && isBefore(lessonDate, maxRescheduleDate);
                  const isFirst = index === 0;

                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "p-4 rounded-xl border transition-colors",
                        isFirst ? "bg-primary/5 border-primary/20" : "bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex flex-col items-center justify-center",
                            isFirst ? "bg-primary/10" : "bg-muted"
                          )}>
                            <span className={cn(
                              "text-lg font-bold leading-none",
                              isFirst && "text-primary"
                            )}>
                              {lessonDate.getDate()}
                            </span>
                            <span className={cn(
                              "text-[10px] uppercase",
                              isFirst ? "text-primary/70" : "text-muted-foreground"
                            )}>
                              {["일", "월", "화", "수", "목", "금", "토"][lessonDate.getDay()]}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {formatTime(lesson.scheduled_at)}
                              </p>
                              {lesson.status === "in_progress" && (
                                <span className="px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-medium">
                                  진행중
                                </span>
                              )}
                              {isFirst && lesson.status === "scheduled" && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                  다음 수업
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {lesson.instructor?.name} 선생님 · {lesson.duration_minutes}분
                            </p>
                          </div>
                        </div>
                        {canReschedule && (
                          <button
                            onClick={() => setRescheduleLesson(lesson)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="일정 변경 신청"
                          >
                            <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 rounded-xl border bg-card">
                <Calendar className="h-10 w-10 mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">예정된 수업이 없습니다</p>
              </div>
            )}
          </div>

          {/* 지난 수업 섹션 */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">지난 수업</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {attendanceStats.present}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  {attendanceStats.late}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {attendanceStats.absent}
                </span>
              </div>
            </div>

            {completedLessons.length > 0 ? (
              <div className="space-y-1">
                {completedLessons.map((lesson) => {
                  const lessonDate = new Date(lesson.scheduled_at);
                  const isExpanded = expandedLessonId === lesson.id;

                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "rounded-xl border bg-card overflow-hidden transition-all",
                        isExpanded && "ring-1 ring-primary/50"
                      )}
                    >
                      <button
                        className="w-full flex items-center gap-3 p-3 text-left"
                        onClick={() => setExpandedLessonId(isExpanded ? null : lesson.id)}
                      >
                        {/* 출석 상태 인디케이터 */}
                        <div className={cn(
                          "w-1 h-10 rounded-full shrink-0",
                          lesson.attendance?.status === "present" && "bg-green-500",
                          lesson.attendance?.status === "late" && "bg-yellow-500",
                          (lesson.attendance?.status === "absent" || lesson.attendance?.status === "excused") && "bg-red-500",
                          !lesson.attendance?.status && "bg-gray-300 dark:bg-gray-600"
                        )} />

                        {/* 날짜 */}
                        <div className="w-10 text-center shrink-0">
                          <p className="text-lg font-bold leading-none">{lessonDate.getDate()}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {lessonDate.getMonth() + 1}월
                          </p>
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {formatTime(lesson.scheduled_at)}
                            <span className="text-muted-foreground ml-1">· {lesson.duration_minutes}분</span>
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lesson.instructor?.name} 선생님
                          </p>
                        </div>

                        {/* 출석 배지 */}
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-xs font-medium shrink-0",
                          getAttendanceColor(lesson.attendance?.status)
                        )}>
                          {getAttendanceLabel(lesson.attendance?.status)}
                        </span>

                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                          isExpanded && "rotate-180"
                        )} />
                      </button>

                      {/* 확장 내용 */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t bg-muted/30 space-y-3">
                          {lesson.content && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">수업 내용</p>
                              <p className="text-sm">{lesson.content}</p>
                            </div>
                          )}
                          {lesson.homework && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">과제</p>
                              <p className="text-sm">{lesson.homework}</p>
                            </div>
                          )}
                          {lesson.notes && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">비고</p>
                              <p className="text-sm">{lesson.notes}</p>
                            </div>
                          )}
                          {!lesson.content && !lesson.homework && !lesson.notes && (
                            <p className="text-sm text-muted-foreground">기록된 내용이 없습니다</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 rounded-xl border bg-card">
                <BookOpen className="h-10 w-10 mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">아직 완료된 수업이 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Reschedule Request Modal */}
        {rescheduleLesson && (
          <RescheduleRequestModal
            lesson={rescheduleLesson}
            onClose={() => setRescheduleLesson(null)}
            onSuccess={() => {
              setRescheduleLesson(null);
              loadData();
            }}
          />
        )}
      </div>
    );
  }

  // 오늘 날짜 기준 수업 통계 계산
  const todayLessons = lessons.filter(l => {
    const date = new Date(l.scheduled_at);
    return date.toDateString() === now.toDateString();
  });
  const upcomingLessonsCount = lessons.filter(l => l.status === "scheduled" || l.status === "in_progress").length;
  const completedLessonsCount = lessons.filter(l => l.status === "completed").length;

  // 출석 통계 (전체)
  const allAttendanceStats = {
    present: lessons.filter(l => l.attendance?.status === "present").length,
    late: lessons.filter(l => l.attendance?.status === "late").length,
    early_leave: lessons.filter(l => l.attendance?.status === "early_leave").length,
    absent: lessons.filter(l => l.attendance?.status === "absent").length,
    excused: lessons.filter(l => l.attendance?.status === "excused").length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">수업 관리</h2>
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
              <Select value={selectedStudent || "none"} onValueChange={(v) => setSelectedStudent(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="선택 안함 (그룹 수업)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함 (그룹 수업)</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.user_id || member.id}>
                      {member.nickname || member.user?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* 통계 대시보드 */}
      <div className="p-4 grid grid-cols-4 lg:grid-cols-7 gap-2 border-b shrink-0">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{todayLessons.length}</p>
          <p className="text-xs text-blue-600 dark:text-blue-500">오늘</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border">
          <p className="text-xl font-bold">{upcomingLessonsCount}</p>
          <p className="text-xs text-muted-foreground">예정</p>
        </div>
        <div className="p-3 rounded-lg bg-muted border">
          <p className="text-xl font-bold">{completedLessonsCount}</p>
          <p className="text-xs text-muted-foreground">완료</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <p className="text-xl font-bold text-green-700 dark:text-green-400">{allAttendanceStats.present}</p>
          <p className="text-xs text-green-600 dark:text-green-500">출석</p>
        </div>
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{allAttendanceStats.late}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-500">지각</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
          <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{allAttendanceStats.early_leave}</p>
          <p className="text-xs text-orange-600 dark:text-orange-500">조퇴</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-xl font-bold text-red-700 dark:text-red-400">{allAttendanceStats.absent + allAttendanceStats.excused}</p>
          <p className="text-xs text-red-600 dark:text-red-500">결석</p>
        </div>
      </div>

      {/* Main Content - Left/Right Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Lesson List */}
        <div className="w-80 lg:w-96 border-r flex flex-col shrink-0">
          {/* Reschedule Requests for Instructors */}
          {user && (
            <RescheduleRequestsList
              groupId={params.id}
              instructorId={user.id}
              onUpdate={loadData}
            />
          )}

          {/* Filter Tabs */}
          <div className="flex p-2 gap-1 border-b shrink-0">
            <button
              onClick={() => setViewMode("upcoming")}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === "upcoming"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              예정 ({upcomingLessonsCount})
            </button>
            <button
              onClick={() => setViewMode("past")}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === "past"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              완료 ({completedLessonsCount})
            </button>
          </div>

          {/* Lesson List */}
          <div className="flex-1 overflow-auto">
            {filteredLessons.length > 0 ? (
              <div className="divide-y">
                {filteredLessons.map((lesson) => {
                  const isSelected = selectedLesson?.id === lesson.id;
                  const lessonDate = new Date(lesson.scheduled_at);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className={cn(
                        "w-full p-3 text-left transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getStatusColor(lesson.status))}>
                            {getStatusLabel(lesson.status)}
                          </span>
                          {lesson.is_makeup && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                              보강
                            </span>
                          )}
                        </div>
                        {lesson.student_id && (
                          <span className={cn("w-2 h-2 rounded-full shrink-0", {
                            "bg-green-500": lesson.attendance?.status === "present",
                            "bg-yellow-500": lesson.attendance?.status === "late",
                            "bg-orange-500": lesson.attendance?.status === "early_leave",
                            "bg-red-500": lesson.attendance?.status === "absent" || lesson.attendance?.status === "excused",
                            "bg-gray-300": !lesson.attendance?.status,
                          })} />
                        )}
                      </div>
                      <p className="font-medium text-sm">
                        {lessonDate.getMonth() + 1}/{lessonDate.getDate()}
                        <span className="text-muted-foreground ml-1">
                          ({["일", "월", "화", "수", "목", "금", "토"][lessonDate.getDay()]})
                        </span>
                        <span className="ml-2">{formatTime(lesson.scheduled_at)}</span>
                      </p>
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>{lesson.student?.name || "그룹 수업"}</span>
                        <span>{lesson.duration_minutes}분</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">{viewMode === "upcoming" ? "예정된 수업이 없습니다" : "지난 수업이 없습니다"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Lesson Detail */}
        {selectedLesson ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Detail Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getStatusColor(selectedLesson.status))}>
                      {getStatusLabel(selectedLesson.status)}
                    </span>
                    {selectedLesson.is_makeup && (
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        보강
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold">{formatDateWithWeekday(selectedLesson.scheduled_at)} {formatTime(selectedLesson.scheduled_at)}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canManage && (
                  <>
                    {selectedLesson.status === "scheduled" && (
                      <>
                        <Button size="sm" onClick={() => handleStatusChange(selectedLesson.id, "in_progress")}>
                          <Play className="h-4 w-4 mr-1" />
                          시작
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(selectedLesson.id, "cancelled")}>
                          <XCircle className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      </>
                    )}
                    {selectedLesson.status === "in_progress" && (
                      <Button size="sm" onClick={() => handleStatusChange(selectedLesson.id, "completed")}>
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
                  </>
                )}
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="p-1.5 hover:bg-muted rounded-lg ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-auto p-4 space-y-6">
              {/* 기본 정보 테이블 */}
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2.5 text-muted-foreground w-24">학생</td>
                    <td className="py-2.5 font-medium">{selectedLesson.student?.name || "그룹 수업"}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">강사</td>
                    <td className="py-2.5 font-medium">{selectedLesson.instructor?.name || "-"}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">수업 시간</td>
                    <td className="py-2.5 font-medium">{selectedLesson.duration_minutes}분</td>
                  </tr>
                </tbody>
              </table>

              {/* 출결 관리 */}
              {selectedLesson.student_id && (
                <div>
                  <h4 className="font-semibold mb-2">출결 상태</h4>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {[
                      { status: "present", label: "출석", color: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
                      { status: "late", label: "지각", color: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
                      { status: "early_leave", label: "조퇴", color: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
                      { status: "absent", label: "결석", color: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
                      { status: "excused", label: "사유", color: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
                    ].map(({ status, label, color, text }) => (
                      <button
                        key={status}
                        onClick={() => canManage && handleAttendanceChange(selectedLesson.id, selectedLesson.student_id!, status)}
                        disabled={!canManage}
                        className={cn(
                          "p-3 rounded-lg transition-all",
                          selectedLesson.attendance?.status === status
                            ? `${color} ring-2 ring-offset-2 ring-current ${text}`
                            : "bg-muted/50 hover:bg-muted",
                          !canManage && "cursor-default"
                        )}
                      >
                        <p className={cn("text-lg font-bold", selectedLesson.attendance?.status === status ? text : "")}>{label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 수업 내용 */}
              <div>
                <h4 className="font-semibold mb-2">수업 내용</h4>
                <div className="border rounded-lg p-3 min-h-[80px] bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedLesson.content || <span className="text-muted-foreground">-</span>}
                  </p>
                </div>
              </div>

              {/* 과제 */}
              <div>
                <h4 className="font-semibold mb-2">과제</h4>
                <div className="border rounded-lg p-3 min-h-[80px] bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedLesson.homework || <span className="text-muted-foreground">-</span>}
                  </p>
                </div>
              </div>

              {/* 비고 */}
              <div>
                <h4 className="font-semibold mb-2">비고</h4>
                <div className="border rounded-lg p-3 min-h-[60px] bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedLesson.notes || <span className="text-muted-foreground">-</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>수업을 선택하세요</p>
              {canManage && filteredLessons.length === 0 && viewMode === "upcoming" && (
                <Button variant="link" onClick={() => setShowForm(true)} className="mt-2">
                  첫 수업을 등록해보세요
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
