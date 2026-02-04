"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lesson, GroupMember, User } from "@/types";
import {
  Loader2,
  Play,
  Check,
  Clock,
  User as UserIcon,
  FileText,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ActiveLessonPageProps {
  params: { id: string };
}

interface LessonWithDetails extends Lesson {
  instructor?: User;
  student?: User;
  student_member?: GroupMember;
}

export default function ActiveLessonPage({ params }: ActiveLessonPageProps) {
  const toast = useToast();
  const [lesson, setLesson] = useState<LessonWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [notes, setNotes] = useState("");
  const [userRole, setUserRole] = useState<string>("student");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadActiveLesson();
  }, [params.id]);

  const loadActiveLesson = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    setUserId(user.id);

    // 멤버십 확인
    const { data: membership } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!membership) return;
    setUserRole(membership.role);

    const isInstructor = membership.role === "instructor";
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
    const fiveMinutesLaterTime = `${fiveMinutesLater.getHours().toString().padStart(2, "0")}:${fiveMinutesLater.getMinutes().toString().padStart(2, "0")}`;

    let activeStudentMember: any = null;
    let activeSchedule: any = null;

    if (isInstructor) {
      // 강사: 담당 학생들의 정기 수업 시간 확인
      const { data: assignedStudents } = await supabase
        .from("group_members")
        .select("*, user:profiles!user_id(*)")
        .eq("group_id", params.id)
        .eq("instructor_id", user.id)
        .eq("status", "approved");

      if (assignedStudents && assignedStudents.length > 0) {
        for (const student of assignedStudents) {
          const schedules = (student.lesson_schedule as any[]) || [];
          for (const schedule of schedules) {
            if (schedule.day_of_week === currentDay) {
              const startTime = schedule.start_time;
              const endTime = schedule.end_time;

              const isInProgress = currentTime >= startTime && currentTime <= endTime;
              const isStartingSoon = currentTime < startTime && fiveMinutesLaterTime >= startTime;

              if (isInProgress || isStartingSoon) {
                activeStudentMember = student;
                activeSchedule = schedule;
                break;
              }
            }
          }
          if (activeStudentMember) break;
        }
      }
    } else {
      // 학생: 자신의 정기 수업 시간 확인
      const schedules = (membership.lesson_schedule as any[]) || [];
      for (const schedule of schedules) {
        if (schedule.day_of_week === currentDay) {
          const startTime = schedule.start_time;
          const endTime = schedule.end_time;

          const isInProgress = currentTime >= startTime && currentTime <= endTime;
          const isStartingSoon = currentTime < startTime && fiveMinutesLaterTime >= startTime;

          if (isInProgress || isStartingSoon) {
            // 자기 정보 조회
            const { data: myMember } = await supabase
              .from("group_members")
              .select("*, user:profiles!user_id(*)")
              .eq("group_id", params.id)
              .eq("user_id", user.id)
              .single();
            activeStudentMember = myMember;
            activeSchedule = schedule;
            break;
          }
        }
      }
    }

    if (activeStudentMember && activeSchedule) {
      // 강사 정보 조회
      let instructorData = null;
      if (activeStudentMember.instructor_id) {
        const { data: instructor } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", activeStudentMember.instructor_id)
          .single();
        instructorData = instructor;
      }

      // 오늘 날짜에 수업 시간 설정
      const today = new Date();
      const [startH, startM] = activeSchedule.start_time.split(":").map(Number);
      today.setHours(startH, startM, 0, 0);

      const [endH, endM] = activeSchedule.end_time.split(":").map(Number);
      const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

      const isInProgress = currentTime >= activeSchedule.start_time && currentTime <= activeSchedule.end_time;

      setLesson({
        id: activeStudentMember.user_id,
        group_id: params.id,
        instructor_id: activeStudentMember.instructor_id || "",
        student_id: activeStudentMember.user_id,
        scheduled_at: today.toISOString(),
        duration_minutes: durationMinutes > 0 ? durationMinutes : 60,
        is_makeup: false,
        status: isInProgress ? "in_progress" : "scheduled",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        student: activeStudentMember.user,
        instructor: instructorData,
        student_member: activeStudentMember,
      });
    }

    setIsLoading(false);
  };

  const handleStartLesson = async () => {
    if (!lesson) return;

    setIsUpdating(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("lessons")
      .update({ status: "in_progress" })
      .eq("id", lesson.id);

    if (error) {
      toast.error("수업 시작에 실패했습니다.");
    } else {
      toast.success("수업이 시작되었습니다.");
      setLesson({ ...lesson, status: "in_progress" });
    }

    setIsUpdating(false);
  };

  const handleCompleteLesson = async () => {
    if (!lesson) return;

    setIsUpdating(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("lessons")
      .update({
        status: "completed",
        content: content.trim() || null,
        homework: homework.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", lesson.id);

    if (error) {
      toast.error("수업 완료에 실패했습니다.");
    } else {
      toast.success("수업이 완료되었습니다.");
      setLesson(null);
    }

    setIsUpdating(false);
  };

  const handleSaveNotes = async () => {
    if (!lesson) return;

    setIsUpdating(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("lessons")
      .update({
        content: content.trim() || null,
        homework: homework.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", lesson.id);

    if (error) {
      toast.error("저장에 실패했습니다.");
    } else {
      toast.success("저장되었습니다.");
    }

    setIsUpdating(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-12">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">진행 중인 수업이 없습니다</h2>
          <p className="text-sm text-muted-foreground mb-4">
            예정된 수업이 시작 5분 전이 되면 여기에 표시됩니다.
          </p>
          <Link href={`/groups/${params.id}`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              홈으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const lessonStart = new Date(lesson.scheduled_at);
  const lessonEnd = new Date(
    lessonStart.getTime() + lesson.duration_minutes * 60 * 1000
  );
  const now = new Date();
  const isStarted = lesson.status === "in_progress" || now >= lessonStart;
  const studentName =
    lesson.student_member?.nickname || lesson.student?.name || "학생";
  const isInstructor = userRole === "instructor";

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-3",
            isStarted
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isStarted ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            )}
          />
          {isStarted ? "수업 진행 중" : "곧 시작"}
        </div>

        <h1 className="text-2xl font-bold mb-2">{studentName} 수업</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDate(lesson.scheduled_at)}
          </span>
          <span>
            {formatTime(lesson.scheduled_at)} ~{" "}
            {formatTime(lessonEnd.toISOString())}
          </span>
        </div>
      </div>

      {/* 참여자 정보 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">강사</p>
          <p className="font-medium">{lesson.instructor?.name || "-"}</p>
        </div>
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">학생</p>
          <p className="font-medium">{studentName}</p>
        </div>
      </div>

      {/* 강사용: 수업 시작/완료 버튼 */}
      {isInstructor && (
        <div className="mb-6">
          {!isStarted ? (
            <Button
              onClick={handleStartLesson}
              disabled={isUpdating}
              className="w-full gap-2"
              size="lg"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              수업 시작
            </Button>
          ) : (
            <Button
              onClick={handleCompleteLesson}
              disabled={isUpdating}
              className="w-full gap-2"
              variant="default"
              size="lg"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              수업 완료
            </Button>
          )}
        </div>
      )}

      {/* 강사용: 수업 기록 */}
      {isInstructor && isStarted && (
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <BookOpen className="h-4 w-4" />
              수업 내용
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="오늘 수업에서 다룬 내용을 기록하세요..."
              rows={4}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <FileText className="h-4 w-4" />
              과제
            </label>
            <Textarea
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="학생에게 내준 과제를 기록하세요..."
              rows={3}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <UserIcon className="h-4 w-4" />
              비고
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="기타 메모..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleSaveNotes}
            disabled={isUpdating}
            variant="outline"
            className="w-full"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            저장
          </Button>
        </div>
      )}

      {/* 학생용: 수업 정보 표시 */}
      {!isInstructor && (
        <div className="space-y-4">
          {lesson.content && (
            <div className="p-4 rounded-lg border">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                수업 내용
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {lesson.content}
              </p>
            </div>
          )}

          {lesson.homework && (
            <div className="p-4 rounded-lg border">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                과제
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {lesson.homework}
              </p>
            </div>
          )}

          {lesson.notes && (
            <div className="p-4 rounded-lg border">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                비고
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {lesson.notes}
              </p>
            </div>
          )}

          {!lesson.content && !lesson.homework && !lesson.notes && (
            <div className="text-center py-8 text-muted-foreground">
              <p>수업이 진행 중입니다.</p>
              <p className="text-sm">수업이 끝나면 내용이 업데이트됩니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
