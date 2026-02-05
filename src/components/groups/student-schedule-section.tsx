"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CalendarClock, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { format, addWeeks, isBefore } from "date-fns";
import { ko } from "date-fns/locale";
import { Lesson, User as UserType } from "@/types";
import { RescheduleRequestModal } from "@/components/lessons/reschedule-request-modal";
import { useUser } from "@/lib/contexts/user-context";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface LessonWithDetails extends Lesson {
  instructor?: UserType;
}

interface StudentScheduleSectionProps {
  groupId: string;
}

export function StudentScheduleSection({ groupId }: StudentScheduleSectionProps) {
  const { user } = useUser();
  const [upcomingLessons, setUpcomingLessons] = useState<LessonWithDetails[]>([]);
  const [pastLessons, setPastLessons] = useState<LessonWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  useEffect(() => {
    if (user) loadLessons();
  }, [groupId, user?.id]);

  const loadLessons = async () => {
    if (!user) return;
    const supabase = createClient();

    const now = new Date();
    const threeWeeksLater = addWeeks(now, 3);

    // 다가오는 수업 조회
    const { data: upcoming } = await supabase
      .from("lessons")
      .select(`
        *,
        instructor:profiles!lessons_instructor_id_fkey(*)
      `)
      .eq("group_id", groupId)
      .eq("student_id", user.id)
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", threeWeeksLater.toISOString())
      .eq("status", "scheduled")
      .order("scheduled_at")
      .limit(10);

    // 지난 수업 조회 (최근 5개)
    const { data: past } = await supabase
      .from("lessons")
      .select(`
        *,
        instructor:profiles!lessons_instructor_id_fkey(*)
      `)
      .eq("group_id", groupId)
      .eq("student_id", user.id)
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false })
      .limit(5);

    setUpcomingLessons((upcoming as LessonWithDetails[]) || []);
    setPastLessons((past as LessonWithDetails[]) || []);
    setIsLoading(false);
  };

  // Filter reschedulable lessons (within 3 weeks)
  const reschedulableLessons = upcomingLessons.filter(lesson => {
    const lessonDate = new Date(lesson.scheduled_at);
    const maxDate = addWeeks(new Date(), 3);
    return lesson.status === "scheduled" && isBefore(lessonDate, maxDate);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasUpcoming = upcomingLessons.length > 0;
  const hasPast = pastLessons.length > 0;

  if (!hasUpcoming && !hasPast) {
    return null;
  }

  const nextLesson = upcomingLessons[0];
  const nextLessonDate = nextLesson ? new Date(nextLesson.scheduled_at) : null;

  return (
    <div className="space-y-4">
      {/* 다음 수업 정보 */}
      {hasUpcoming && nextLessonDate && (
        <Link
          href={`/groups/${groupId}/lessons`}
          className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">다음 수업</p>
              <p className="text-xs text-muted-foreground">
                {format(nextLessonDate, "M월 d일 (EEE) HH:mm", { locale: ko })}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* 수업 변경 신청 버튼 */}
      {reschedulableLessons.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center gap-2"
          onClick={() => setShowRescheduleModal(true)}
        >
          <CalendarClock className="h-4 w-4" />
          수업 일정 변경 신청
        </Button>
      )}

      {/* 지난 수업 내용 */}
      {hasPast && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">지난 수업</h3>
            <Link
              href={`/groups/${groupId}/lessons`}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center"
            >
              전체
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {pastLessons.slice(0, 3).map((lesson) => {
              const lessonDate = new Date(lesson.scheduled_at);
              const hasContent = lesson.content || lesson.homework;
              return (
                <Link
                  key={lesson.id}
                  href={`/groups/${groupId}/lessons`}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {format(lessonDate, "M월 d일 (EEE)", { locale: ko })}
                    </span>
                    {lesson.instructor?.name && (
                      <span className="text-xs text-muted-foreground">
                        {lesson.instructor.name}
                      </span>
                    )}
                  </div>
                  {hasContent ? (
                    <div className="space-y-1">
                      {lesson.content && (
                        <p className="text-sm line-clamp-2">{lesson.content}</p>
                      )}
                      {lesson.homework && (
                        <p className="text-xs text-primary">
                          과제: {lesson.homework.length > 30 ? lesson.homework.slice(0, 30) + "..." : lesson.homework}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">수업 내용이 없습니다</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && reschedulableLessons.length > 0 && (
        <RescheduleRequestModal
          lessons={reschedulableLessons}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={() => {
            setShowRescheduleModal(false);
            loadLessons();
          }}
        />
      )}
    </div>
  );
}
