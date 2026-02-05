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
import { Lesson, GroupMember, User as UserType, Attendance, ClassRoom } from "@/types";
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
  const { group, membership, isOwner, canManage, isStudent, isGuardian } = useGroup();

  const [lessons, setLessons] = useState<LessonWithDetails[]>([]);
  const [members, setMembers] = useState<(GroupMember & { user: UserType })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTime, setSelectedTime] = useState(getRoundedCurrentTime());
  const [duration, setDuration] = useState(60);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"upcoming" | "past">("upcoming");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithDetails | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  // 선생님용: 선택된 학생 ID (학생별 수업 보기)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  // 선생님용: 선택된 학생의 수업 중 선택된 수업 (내용 편집용)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  // 수업 내용 편집 상태
  const [editContent, setEditContent] = useState("");
  const [editHomework, setEditHomework] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingContent, setIsSavingContent] = useState(false);
  // 일정 변경 요청 보기 모드
  const [showRescheduleRequests, setShowRescheduleRequests] = useState(false);
  // 일정 변경 요청 수 (배지용)
  const [rescheduleRequestCount, setRescheduleRequestCount] = useState(0);

  // 사용 가능한 클래스(교실) 목록
  const availableClasses = group?.settings?.classes || [];

  // 선택된 학생의 수업 목록
  const selectedStudentLessons = selectedStudentId
    ? lessons.filter(l => l.student_id === selectedStudentId)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    : [];

  // 선택된 학생 정보
  const selectedStudentInfo = selectedStudentId
    ? members.find(m => m.user_id === selectedStudentId)
    : null;

  // 선택된 학생의 진행 중인 수업 (있으면 자동 선택)
  const inProgressLesson = selectedStudentId
    ? selectedStudentLessons.find(l => l.status === "in_progress")
    : null;

  // 선택된 학생의 완료된 수업 (이전 수업 내역)
  const completedStudentLessons = selectedStudentId
    ? selectedStudentLessons.filter(l => l.status === "completed")
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    : [];

  // 현재 편집 중인 수업
  const editingLesson = editingLessonId
    ? selectedStudentLessons.find(l => l.id === editingLessonId)
    : null;

  const isStudentOrGuardian = isStudent || isGuardian;

  useEffect(() => {
    if (user) {
      loadData();
      loadRescheduleRequestCount();
    }
  }, [params.id, user?.id]);

  // 일정 변경 요청 수 조회
  const loadRescheduleRequestCount = async () => {
    if (!user) return;
    const supabase = createClient();

    const { data } = await supabase
      .from("lesson_change_requests")
      .select(`
        id,
        lesson:lessons!lesson_id(instructor_id)
      `)
      .eq("status", "pending");

    const count = (data || []).filter(
      (req: any) => req.lesson?.instructor_id === user.id
    ).length;
    setRescheduleRequestCount(count);
  };

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
    const endAt = new Date(scheduledAt.getTime() + duration * 60 * 1000);

    // 학생이 선택된 경우 시간 겹침 확인
    if (selectedStudent) {
      // 해당 학생의 같은 날짜 수업 조회
      const dayStart = new Date(scheduledAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(scheduledAt);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: existingLessons } = await supabase
        .from("lessons")
        .select("*")
        .eq("student_id", selectedStudent)
        .gte("scheduled_at", dayStart.toISOString())
        .lte("scheduled_at", dayEnd.toISOString())
        .in("status", ["scheduled", "in_progress"]);

      // 시간 겹침 확인
      const hasOverlap = existingLessons?.some((lesson) => {
        const lessonStart = new Date(lesson.scheduled_at);
        const lessonEnd = new Date(lessonStart.getTime() + (lesson.duration_minutes || 60) * 60 * 1000);
        // 시간이 겹치는지 확인: 새 수업 시작 < 기존 수업 끝 AND 새 수업 끝 > 기존 수업 시작
        return scheduledAt < lessonEnd && endAt > lessonStart;
      });

      if (hasOverlap) {
        alert("해당 학생은 이미 같은 시간에 수업이 있습니다.");
        setIsSubmitting(false);
        return;
      }
    }

    await supabase.from("lessons").insert({
      group_id: params.id,
      instructor_id: user.id,
      student_id: selectedStudent || null,
      room_id: selectedRoom || null,
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
    setSelectedRoom("");
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

  // 수업 클래스(교실) 변경 (선생님용)
  const handleRoomChange = async (lessonId: string, roomId: string | null) => {
    const supabase = createClient();
    await supabase
      .from("lessons")
      .update({ room_id: roomId })
      .eq("id", lessonId);
    loadData();
  };

  // 수업 내용 저장 (선생님용)
  const handleSaveLessonContent = async () => {
    if (!editingLessonId) return;
    setIsSavingContent(true);
    const supabase = createClient();
    await supabase
      .from("lessons")
      .update({
        content: editContent,
        homework: editHomework,
        notes: editNotes,
      })
      .eq("id", editingLessonId);
    loadData();
    setIsSavingContent(false);
  };

  // 수업 선택 시 편집 상태 초기화
  const selectLessonForEdit = (lesson: LessonWithDetails) => {
    setEditingLessonId(lesson.id);
    setEditContent(lesson.content || "");
    setEditHomework(lesson.homework || "");
    setEditNotes(lesson.notes || "");
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

    // 전체 수업 목록 (다가오는 수업이 위에, 지난 수업이 아래)
    const allLessons = [
      ...upcomingLessons,
      ...completedLessons.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    ];

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

    // 변경 가능한 수업 목록 (3주 이내)
    const reschedulableLessons = upcomingLessons.filter(lesson => {
      const lessonDate = new Date(lesson.scheduled_at);
      const maxDate = addWeeks(new Date(), 3);
      return lesson.status === "scheduled" && isBefore(lessonDate, maxDate);
    });

    // 수업 상세 모달용
    const handleLessonClick = (lesson: LessonWithDetails) => {
      if (lesson.status === "completed") {
        setSelectedLesson(lesson);
      }
    };

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">내 수업</h2>
          <span className="text-sm text-muted-foreground">
            출석률 {attendanceRate}%
          </span>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Lesson List */}
          <div className={cn(
            "flex-1 flex flex-col overflow-hidden transition-all",
            selectedLesson ? "lg:flex-none lg:w-80 xl:w-96 lg:border-r" : ""
          )}>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* 일정 변경 신청 버튼 */}
              {reschedulableLessons.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => setShowRescheduleModal(true)}
                >
                  <CalendarClock className="h-4 w-4" />
                  수업 일정 변경 신청
                </Button>
              )}

              {/* 전체 수업 테이블 */}
              {allLessons.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">날짜</th>
                        <th className="text-left px-3 py-2 font-medium">시간</th>
                        <th className={cn("text-left px-3 py-2 font-medium", selectedLesson && "hidden lg:table-cell")}>선생님</th>
                        <th className="text-right px-3 py-2 font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allLessons.map((lesson) => {
                        const lessonDate = new Date(lesson.scheduled_at);
                        const isUpcoming = lesson.status === "scheduled" || lesson.status === "in_progress";
                        const isNextLesson = upcomingLessons[0]?.id === lesson.id;
                        const isCompleted = lesson.status === "completed";
                        const isSelected = selectedLesson?.id === lesson.id;
                        return (
                          <tr
                            key={lesson.id}
                            onClick={() => handleLessonClick(lesson)}
                            className={cn(
                              isUpcoming ? "bg-primary/5" : "",
                              isCompleted && "cursor-pointer hover:bg-muted/50 transition-colors",
                              isSelected && "bg-primary/10"
                            )}
                          >
                            <td className="px-3 py-2.5">
                              {lessonDate.getMonth() + 1}/{lessonDate.getDate()}
                              <span className="text-muted-foreground ml-1">
                                ({["일", "월", "화", "수", "목", "금", "토"][lessonDate.getDay()]})
                              </span>
                            </td>
                            <td className="px-3 py-2.5">{formatTime(lesson.scheduled_at)}</td>
                            <td className={cn("px-3 py-2.5 text-muted-foreground", selectedLesson && "hidden lg:table-cell")}>{lesson.instructor?.name}</td>
                            <td className="px-3 py-2.5 text-right">
                              {isUpcoming ? (
                                lesson.status === "in_progress" ? (
                                  <span className="text-yellow-600">진행중</span>
                                ) : isNextLesson ? (
                                  <span className="text-primary font-medium">다음 수업</span>
                                ) : (
                                  <span className="text-muted-foreground">예정</span>
                                )
                              ) : (
                                <span className={cn(
                                  lesson.attendance?.status === "present" && "text-green-600",
                                  lesson.attendance?.status === "late" && "text-yellow-600",
                                  (lesson.attendance?.status === "absent" || lesson.attendance?.status === "excused") && "text-red-600",
                                  !lesson.attendance?.status && "text-muted-foreground"
                                )}>
                                  {getAttendanceLabel(lesson.attendance?.status)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">수업이 없습니다</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Lesson Detail (Side Panel) */}
          {selectedLesson && (
            <div className="hidden lg:flex flex-1 flex-col overflow-hidden bg-background">
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b shrink-0">
                <div>
                  <h3 className="font-semibold">수업 상세</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDateWithWeekday(selectedLesson.scheduled_at)} {formatTime(selectedLesson.scheduled_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="p-1.5 hover:bg-muted rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* 출결 상태 */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">출결 상태</span>
                  <span className={cn(
                    "text-sm font-medium",
                    selectedLesson.attendance?.status === "present" && "text-green-600",
                    selectedLesson.attendance?.status === "late" && "text-yellow-600",
                    (selectedLesson.attendance?.status === "absent" || selectedLesson.attendance?.status === "excused") && "text-red-600",
                    !selectedLesson.attendance?.status && "text-muted-foreground"
                  )}>
                    {getAttendanceLabel(selectedLesson.attendance?.status)}
                  </span>
                </div>

                {/* 선생님 */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">선생님</span>
                  <span className="text-sm font-medium">{selectedLesson.instructor?.name || "-"}</span>
                </div>

                {/* 수업 시간 */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">수업 시간</span>
                  <span className="text-sm font-medium">{selectedLesson.duration_minutes}분</span>
                </div>

                {/* 수업 내용 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">수업 내용</h4>
                  <div className="border rounded-lg p-3 min-h-[80px] bg-muted/20">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedLesson.content || <span className="text-muted-foreground">기록된 내용이 없습니다</span>}
                    </p>
                  </div>
                </div>

                {/* 과제 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">과제</h4>
                  <div className="border rounded-lg p-3 min-h-[80px] bg-muted/20">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedLesson.homework || <span className="text-muted-foreground">과제가 없습니다</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile: Bottom Sheet Style Panel */}
          {selectedLesson && (
            <div
              className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/50"
              onClick={(e) => e.target === e.currentTarget && setSelectedLesson(null)}
            >
              <div className="bg-background rounded-t-xl w-full max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Handle */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div>
                    <h3 className="font-semibold">수업 상세</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDateWithWeekday(selectedLesson.scheduled_at)} {formatTime(selectedLesson.scheduled_at)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedLesson(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  {/* 출결 상태 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">출결 상태</span>
                    <span className={cn(
                      "text-sm font-medium",
                      selectedLesson.attendance?.status === "present" && "text-green-600",
                      selectedLesson.attendance?.status === "late" && "text-yellow-600",
                      (selectedLesson.attendance?.status === "absent" || selectedLesson.attendance?.status === "excused") && "text-red-600",
                      !selectedLesson.attendance?.status && "text-muted-foreground"
                    )}>
                      {getAttendanceLabel(selectedLesson.attendance?.status)}
                    </span>
                  </div>

                  {/* 선생님 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">선생님</span>
                    <span className="text-sm font-medium">{selectedLesson.instructor?.name || "-"}</span>
                  </div>

                  {/* 수업 시간 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">수업 시간</span>
                    <span className="text-sm font-medium">{selectedLesson.duration_minutes}분</span>
                  </div>

                  {/* 수업 내용 */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">수업 내용</h4>
                    <div className="border rounded-lg p-3 min-h-[60px] bg-muted/20">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedLesson.content || <span className="text-muted-foreground">기록된 내용이 없습니다</span>}
                      </p>
                    </div>
                  </div>

                  {/* 과제 */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">과제</h4>
                    <div className="border rounded-lg p-3 min-h-[60px] bg-muted/20">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedLesson.homework || <span className="text-muted-foreground">과제가 없습니다</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reschedule Request Modal */}
        {showRescheduleModal && reschedulableLessons.length > 0 && (
          <RescheduleRequestModal
            lessons={reschedulableLessons}
            onClose={() => setShowRescheduleModal(false)}
            onSuccess={() => {
              setShowRescheduleModal(false);
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

            {/* 클래스(교실) 선택 */}
            {availableClasses.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">클래스 (교실)</label>
                <Select value={selectedRoom || "none"} onValueChange={(v) => setSelectedRoom(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택 안함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안함</SelectItem>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.capacity && `(${cls.capacity}명)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
      <div className="p-4 flex items-center gap-4 border-b shrink-0">
        <div className="flex-1 grid grid-cols-4 lg:grid-cols-7 gap-2">
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
        {/* 일정 변경 요청 버튼 */}
        {rescheduleRequestCount > 0 && (
          <Button
            variant={showRescheduleRequests ? "default" : "outline"}
            size="sm"
            className={cn(
              "shrink-0 gap-2",
              !showRescheduleRequests && "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
            )}
            onClick={() => {
              setShowRescheduleRequests(!showRescheduleRequests);
              setSelectedLesson(null);
              setSelectedStudentId(null);
            }}
          >
            <CalendarClock className="h-4 w-4" />
            변경요청
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white">
              {rescheduleRequestCount}
            </span>
          </Button>
        )}
      </div>

      {/* Main Content - Left/Right Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Lesson List */}
        <div className="w-80 lg:w-96 border-r flex flex-col shrink-0">
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
                        {lesson.student_id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentId(lesson.student_id!);
                              setSelectedLesson(null);
                            }}
                            className="text-primary hover:underline"
                          >
                            {lesson.student?.name}
                          </button>
                        ) : (
                          <span>그룹 수업</span>
                        )}
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

        {/* Right Panel - Reschedule Requests, Student Detail View, or Lesson Detail */}
        {showRescheduleRequests ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold">수업 일정 변경 요청</h3>
              </div>
              <button
                onClick={() => setShowRescheduleRequests(false)}
                className="p-1.5 hover:bg-muted rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Reschedule Requests Content */}
            <div className="flex-1 overflow-auto p-4">
              {user && (
                <RescheduleRequestsList
                  groupId={params.id}
                  instructorId={user.id}
                  onUpdate={() => {
                    loadData();
                    loadRescheduleRequestCount();
                  }}
                />
              )}
            </div>
          </div>
        ) : selectedStudentId && selectedStudentInfo ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Student Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div>
                <p className="text-xs text-muted-foreground">학생 수업 관리</p>
                <h3 className="font-semibold">{selectedStudentInfo.nickname || selectedStudentInfo.user?.name}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentId(null);
                  setEditingLessonId(null);
                }}
                className="p-1.5 hover:bg-muted rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Student Lessons Content - Split Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: 수업 목록 테이블 또는 현재 수업 편집 */}
              <div className={cn(
                "flex flex-col overflow-hidden border-r",
                inProgressLesson ? "w-1/2" : "w-2/5"
              )}>
                {/* 진행 중인 수업이 있으면 편집 폼 표시 */}
                {inProgressLesson ? (
                  <div className="flex-1 overflow-auto p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                        진행중
                      </span>
                      <span className="text-sm font-medium">
                        {formatDateWithWeekday(inProgressLesson.scheduled_at)} {formatTime(inProgressLesson.scheduled_at)}
                      </span>
                    </div>

                    {/* 수업 내용 입력 */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">수업 내용</label>
                      <textarea
                        value={editingLessonId === inProgressLesson.id ? editContent : (inProgressLesson.content || "")}
                        onChange={(e) => {
                          if (editingLessonId !== inProgressLesson.id) {
                            selectLessonForEdit(inProgressLesson);
                          }
                          setEditContent(e.target.value);
                        }}
                        onFocus={() => {
                          if (editingLessonId !== inProgressLesson.id) {
                            selectLessonForEdit(inProgressLesson);
                          }
                        }}
                        className="w-full min-h-[120px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="오늘 수업 내용을 입력하세요..."
                      />
                    </div>

                    {/* 과제 입력 */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">과제</label>
                      <textarea
                        value={editingLessonId === inProgressLesson.id ? editHomework : (inProgressLesson.homework || "")}
                        onChange={(e) => {
                          if (editingLessonId !== inProgressLesson.id) {
                            selectLessonForEdit(inProgressLesson);
                          }
                          setEditHomework(e.target.value);
                        }}
                        onFocus={() => {
                          if (editingLessonId !== inProgressLesson.id) {
                            selectLessonForEdit(inProgressLesson);
                          }
                        }}
                        className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="과제를 입력하세요..."
                      />
                    </div>

                    {/* 비고 입력 */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">비고</label>
                      <textarea
                        value={editingLessonId === inProgressLesson.id ? editNotes : (inProgressLesson.notes || "")}
                        onChange={(e) => {
                          if (editingLessonId !== inProgressLesson.id) {
                            selectLessonForEdit(inProgressLesson);
                          }
                          setEditNotes(e.target.value);
                        }}
                        onFocus={() => {
                          if (editingLessonId !== inProgressLesson.id) {
                            selectLessonForEdit(inProgressLesson);
                          }
                        }}
                        className="w-full min-h-[60px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="비고 사항을 입력하세요..."
                      />
                    </div>

                    {/* 저장 및 완료 버튼 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleSaveLessonContent}
                        disabled={isSavingContent || editingLessonId !== inProgressLesson.id}
                      >
                        {isSavingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={async () => {
                          if (editingLessonId === inProgressLesson.id) {
                            await handleSaveLessonContent();
                          }
                          handleStatusChange(inProgressLesson.id, "completed");
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        수업 완료
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* 진행 중인 수업이 없으면 수업 목록 테이블 */
                  <div className="flex-1 overflow-auto p-4">
                    <h4 className="text-sm font-medium mb-2">수업 목록</h4>
                    {selectedStudentLessons.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium">날짜</th>
                              <th className="text-left px-3 py-2 font-medium">시간</th>
                              <th className="text-right px-3 py-2 font-medium">상태</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {selectedStudentLessons.map((lesson) => {
                              const lessonDate = new Date(lesson.scheduled_at);
                              const isUpcoming = lesson.status === "scheduled" || lesson.status === "in_progress";
                              const isSelected = editingLessonId === lesson.id;

                              return (
                                <tr
                                  key={lesson.id}
                                  onClick={() => selectLessonForEdit(lesson)}
                                  className={cn(
                                    "cursor-pointer transition-colors",
                                    isUpcoming ? "bg-primary/5" : "",
                                    isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                                  )}
                                >
                                  <td className="px-3 py-2.5">
                                    {lessonDate.getMonth() + 1}/{lessonDate.getDate()}
                                    <span className="text-muted-foreground ml-1">
                                      ({["일", "월", "화", "수", "목", "금", "토"][lessonDate.getDay()]})
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">{formatTime(lesson.scheduled_at)}</td>
                                  <td className="px-3 py-2.5 text-right">
                                    {isUpcoming ? (
                                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getStatusColor(lesson.status))}>
                                        {getStatusLabel(lesson.status)}
                                      </span>
                                    ) : (
                                      <span className={cn(
                                        "text-xs",
                                        lesson.attendance?.status === "present" && "text-green-600",
                                        lesson.attendance?.status === "late" && "text-yellow-600",
                                        (lesson.attendance?.status === "absent" || lesson.attendance?.status === "excused") && "text-red-600",
                                        !lesson.attendance?.status && "text-muted-foreground"
                                      )}>
                                        {getAttendanceLabel(lesson.attendance?.status)}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg">
                        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">수업이 없습니다</p>
                      </div>
                    )}

                    {/* 출석 통계 */}
                    {completedStudentLessons.length > 0 && (() => {
                      const stats = {
                        total: completedStudentLessons.length,
                        present: completedStudentLessons.filter(l => l.attendance?.status === "present").length,
                        late: completedStudentLessons.filter(l => l.attendance?.status === "late").length,
                        absent: completedStudentLessons.filter(l => l.attendance?.status === "absent" || l.attendance?.status === "excused").length,
                      };
                      const rate = stats.total > 0
                        ? Math.round(((stats.present + stats.late) / stats.total) * 100)
                        : 100;
                      return (
                        <div className="mt-4 p-3 border rounded-lg bg-muted/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium">출석 통계</span>
                            <span className="text-xs text-muted-foreground">출석률 {rate}%</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-center">
                            <div className="p-1.5 rounded bg-muted/50">
                              <p className="text-sm font-bold">{stats.total}</p>
                              <p className="text-[9px] text-muted-foreground">완료</p>
                            </div>
                            <div className="p-1.5 rounded bg-green-50 dark:bg-green-950/30">
                              <p className="text-sm font-bold text-green-600">{stats.present}</p>
                              <p className="text-[9px] text-green-600">출석</p>
                            </div>
                            <div className="p-1.5 rounded bg-yellow-50 dark:bg-yellow-950/30">
                              <p className="text-sm font-bold text-yellow-600">{stats.late}</p>
                              <p className="text-[9px] text-yellow-600">지각</p>
                            </div>
                            <div className="p-1.5 rounded bg-red-50 dark:bg-red-950/30">
                              <p className="text-sm font-bold text-red-600">{stats.absent}</p>
                              <p className="text-[9px] text-red-600">결석</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Right: 선택된 수업 내용/과제/비고 편집 또는 이전 수업 내역 */}
              <div className={cn(
                "flex flex-col overflow-hidden",
                inProgressLesson ? "w-1/2" : "w-3/5"
              )}>
                {inProgressLesson ? (
                  /* 진행 중일 때: 이전 수업 내역 */
                  <div className="flex-1 overflow-auto p-4">
                    <h4 className="text-sm font-medium mb-3">이전 수업 내역</h4>
                    {completedStudentLessons.length > 0 ? (
                      <div className="space-y-3">
                        {completedStudentLessons.slice(0, 10).map((lesson) => {
                          const lessonDate = new Date(lesson.scheduled_at);
                          return (
                            <div key={lesson.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium">
                                  {lessonDate.getMonth() + 1}/{lessonDate.getDate()}
                                  <span className="text-muted-foreground ml-1">
                                    ({["일", "월", "화", "수", "목", "금", "토"][lessonDate.getDay()]})
                                  </span>
                                </span>
                                <span className={cn(
                                  "text-[10px]",
                                  lesson.attendance?.status === "present" && "text-green-600",
                                  lesson.attendance?.status === "late" && "text-yellow-600",
                                  (lesson.attendance?.status === "absent" || lesson.attendance?.status === "excused") && "text-red-600"
                                )}>
                                  {getAttendanceLabel(lesson.attendance?.status)}
                                </span>
                              </div>
                              {lesson.content && (
                                <div className="mb-2">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">수업 내용</p>
                                  <p className="text-xs whitespace-pre-wrap line-clamp-3">{lesson.content}</p>
                                </div>
                              )}
                              {lesson.homework && (
                                <div className="mb-2">
                                  <p className="text-[10px] text-muted-foreground mb-0.5">과제</p>
                                  <p className="text-xs whitespace-pre-wrap line-clamp-2">{lesson.homework}</p>
                                </div>
                              )}
                              {lesson.notes && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-0.5">비고</p>
                                  <p className="text-xs whitespace-pre-wrap line-clamp-2">{lesson.notes}</p>
                                </div>
                              )}
                              {!lesson.content && !lesson.homework && !lesson.notes && (
                                <p className="text-xs text-muted-foreground">기록 없음</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg">
                        <p className="text-sm text-muted-foreground">이전 수업이 없습니다</p>
                      </div>
                    )}
                  </div>
                ) : editingLesson ? (
                  /* 수업 선택됨: 내용/과제/비고 편집 */
                  <div className="flex-1 overflow-auto p-4 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getStatusColor(editingLesson.status))}>
                          {getStatusLabel(editingLesson.status)}
                        </span>
                        <span className="text-sm font-medium">
                          {formatDateWithWeekday(editingLesson.scheduled_at)} {formatTime(editingLesson.scheduled_at)}
                        </span>
                      </div>
                      {editingLesson.status === "scheduled" && (
                        <Button size="sm" onClick={() => handleStatusChange(editingLesson.id, "in_progress")}>
                          <Play className="h-4 w-4 mr-1" />
                          시작
                        </Button>
                      )}
                    </div>

                    {/* 수업 내용 입력 */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">수업 내용</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="수업 내용을 입력하세요..."
                      />
                    </div>

                    {/* 과제 입력 */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">과제</label>
                      <textarea
                        value={editHomework}
                        onChange={(e) => setEditHomework(e.target.value)}
                        className="w-full min-h-[80px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="과제를 입력하세요..."
                      />
                    </div>

                    {/* 비고 입력 */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">비고</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full min-h-[60px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="비고 사항을 입력하세요..."
                      />
                    </div>

                    {/* 저장 버튼 */}
                    <Button
                      className="w-full"
                      onClick={handleSaveLessonContent}
                      disabled={isSavingContent}
                    >
                      {isSavingContent ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      저장
                    </Button>
                  </div>
                ) : (
                  /* 수업 미선택: 안내 메시지 */
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">수업을 선택하면</p>
                      <p className="text-sm">내용을 편집할 수 있습니다</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : selectedLesson ? (
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
                    <td className="py-2.5 font-medium">
                      {selectedLesson.student_id ? (
                        <button
                          onClick={() => {
                            setSelectedStudentId(selectedLesson.student_id!);
                            setSelectedLesson(null);
                          }}
                          className="text-primary hover:underline"
                        >
                          {selectedLesson.student?.name}
                        </button>
                      ) : (
                        "그룹 수업"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">강사</td>
                    <td className="py-2.5 font-medium">{selectedLesson.instructor?.name || "-"}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">수업 시간</td>
                    <td className="py-2.5 font-medium">{selectedLesson.duration_minutes}분</td>
                  </tr>
                  {availableClasses.length > 0 && (
                    <tr>
                      <td className="py-2.5 text-muted-foreground">클래스</td>
                      <td className="py-2.5 font-medium">
                        {selectedLesson.room_id
                          ? availableClasses.find(c => c.id === selectedLesson.room_id)?.name || "-"
                          : "-"}
                      </td>
                    </tr>
                  )}
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
