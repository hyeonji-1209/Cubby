"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Loader2,
  Radio,
  User,
  BookOpen,
  CheckCircle2,
  QrCode,
  Play,
  Square,
  ChevronLeft,
  Save,
} from "lucide-react";
import { Lesson } from "@/types";

interface ActiveLessonPageProps {
  params: { id: string };
}

interface LessonWithStudent extends Lesson {
  student?: {
    id: string;
    user: {
      id: string;
      name: string;
    };
  };
}

interface QRCode {
  id: string;
  code: string;
  lesson_id: string;
  created_at: string;
  expires_at: string;
}

export default function ActiveLessonPage({ params }: ActiveLessonPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LessonWithStudent | null>(null);
  const [previousLesson, setPreviousLesson] = useState<LessonWithStudent | null>(null);
  const [membership, setMembership] = useState<any>(null);
  const [isInstructor, setIsInstructor] = useState(false);

  // 수업 내용 작성
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // QR 코드 (수업당 하나)
  const [qrCode, setQrCode] = useState<QRCode | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // 출석 상태 (학생용)
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // 멤버십 확인
    const { data: membershipData } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!membershipData) {
      router.push("/dashboard");
      return;
    }

    setMembership(membershipData);
    const isInstructorRole = ["owner", "admin", "instructor"].includes(membershipData.role);
    setIsInstructor(isInstructorRole);

    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    // 활성 수업 조회
    let query = supabase
      .from("lessons")
      .select(`
        *,
        student:group_members!lessons_student_id_fkey(
          id,
          user:users(id, name)
        )
      `)
      .eq("group_id", params.id)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_at", { ascending: true })
      .limit(1);

    if (isInstructorRole) {
      query = query.eq("instructor_id", membershipData.id);
    } else {
      query = query.eq("student_id", membershipData.id);
    }

    const { data: lessons } = await query;

    if (lessons && lessons.length > 0) {
      const lesson = lessons[0];
      const lessonStart = new Date(lesson.scheduled_at);
      const lessonEnd = new Date(lessonStart.getTime() + lesson.duration_minutes * 60 * 1000);

      const isInProgress = lesson.status === "in_progress" || (now >= lessonStart && now <= lessonEnd);
      const isStartingSoon = lessonStart <= fiveMinutesLater && lessonStart > now;

      if (isInProgress || isStartingSoon) {
        setActiveLesson(lesson);
        setContent(lesson.content || "");
        setHomework(lesson.homework || "");
        setNotes(lesson.notes || "");

        // 이전 수업 조회
        const { data: prevLesson } = await supabase
          .from("lessons")
          .select(`
            *,
            student:group_members!lessons_student_id_fkey(
              id,
              user:users(id, name)
            )
          `)
          .eq("group_id", params.id)
          .eq("status", "completed")
          .eq(isInstructorRole ? "instructor_id" : "student_id", membershipData.id)
          .lt("scheduled_at", lesson.scheduled_at)
          .order("scheduled_at", { ascending: false })
          .limit(1)
          .single();

        if (prevLesson) {
          setPreviousLesson(prevLesson);
        }

        // 출석 상태 확인 (학생용)
        if (!isInstructorRole) {
          const { data: attendance } = await supabase
            .from("attendance")
            .select("status")
            .eq("lesson_id", lesson.id)
            .eq("member_id", membershipData.id)
            .single();

          if (attendance) {
            setAttendanceStatus(attendance.status);
          }
        }

        // 기존 QR 코드 확인 (강사용) - 수업당 하나
        if (isInstructorRole) {
          const { data: existingQR } = await supabase
            .from("attendance_qr_codes")
            .select("*")
            .eq("lesson_id", lesson.id)
            .single();

          if (existingQR) {
            setQrCode(existingQR);
          }
        }
      } else {
        // 활성 수업 없음 - 홈으로 리다이렉트
        router.push(`/groups/${params.id}`);
        return;
      }
    } else {
      // 활성 수업 없음 - 홈으로 리다이렉트
      router.push(`/groups/${params.id}`);
      return;
    }

    setIsLoading(false);
  };

  // QR 코드 자동 생성 (수업 5분 전부터 가능, 수업 종료시 만료)
  // 수업 시작 5분 후까지: 정상 출석
  // 그 이후: 지각
  const generateQRCode = async () => {
    if (!activeLesson || isGeneratingQR || qrCode) return;

    const now = new Date();
    const lessonStart = new Date(activeLesson.scheduled_at);
    const fiveMinutesBefore = new Date(lessonStart.getTime() - 5 * 60 * 1000);

    // 수업 5분 전부터만 QR 생성 가능
    if (now < fiveMinutesBefore) {
      return;
    }

    setIsGeneratingQR(true);
    const supabase = createClient();

    // 수업 종료 시간 = 만료 시간
    const expiresAt = new Date(lessonStart.getTime() + activeLesson.duration_minutes * 60 * 1000);

    // 고유 코드 생성
    const code = `${activeLesson.id}-${Math.random().toString(36).substring(2, 10)}`;

    const { data: newQR, error } = await supabase
      .from("attendance_qr_codes")
      .insert({
        lesson_id: activeLesson.id,
        code: code,
        group_id: params.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (newQR && !error) {
      setQrCode(newQR);
    }

    setIsGeneratingQR(false);
  };

  // 자동 QR 생성 (수업 5분 전이 되면 자동으로)
  useEffect(() => {
    if (!activeLesson || !isInstructor || qrCode) return;

    const checkAndGenerateQR = () => {
      const now = new Date();
      const lessonStart = new Date(activeLesson.scheduled_at);
      const fiveMinutesBefore = new Date(lessonStart.getTime() - 5 * 60 * 1000);

      if (now >= fiveMinutesBefore && !qrCode) {
        generateQRCode();
      }
    };

    // 즉시 체크
    checkAndGenerateQR();

    // 30초마다 체크 (아직 5분 전이 아닌 경우를 위해)
    const interval = setInterval(checkAndGenerateQR, 30000);

    return () => clearInterval(interval);
  }, [activeLesson, isInstructor, qrCode]);

  // 수업 시작
  const startLesson = async () => {
    if (!activeLesson) return;

    const supabase = createClient();
    await supabase
      .from("lessons")
      .update({ status: "in_progress" })
      .eq("id", activeLesson.id);

    setActiveLesson({ ...activeLesson, status: "in_progress" });
  };

  // 수업 종료
  const endLesson = async () => {
    if (!activeLesson) return;

    const supabase = createClient();
    await supabase
      .from("lessons")
      .update({
        status: "completed",
        content,
        homework,
        notes,
      })
      .eq("id", activeLesson.id);

    router.push(`/groups/${params.id}/lessons`);
  };

  // 수업 내용 저장
  const saveContent = async () => {
    if (!activeLesson) return;

    setIsSaving(true);
    const supabase = createClient();
    await supabase
      .from("lessons")
      .update({
        content,
        homework,
        notes,
      })
      .eq("id", activeLesson.id);

    setIsSaving(false);
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: ko });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "M월 d일 (EEE)", { locale: ko });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeLesson) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>활성 수업이 없습니다</p>
      </div>
    );
  }

  const lessonStart = new Date(activeLesson.scheduled_at);
  const lessonEnd = new Date(lessonStart.getTime() + activeLesson.duration_minutes * 60 * 1000);
  const now = new Date();
  const isInProgress = activeLesson.status === "in_progress" || (now >= lessonStart && now <= lessonEnd);
  const studentName = activeLesson.student?.user?.name || "학생";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className={`h-5 w-5 ${isInProgress ? "text-green-500" : "text-yellow-500"}`} />
            {isInProgress && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">
              {isInstructor ? `${studentName} 수업` : "내 수업"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(activeLesson.scheduled_at)} {formatTime(activeLesson.scheduled_at)} - {formatTime(lessonEnd.toISOString())}
            </p>
          </div>
        </div>

        {isInstructor && (
          <div className="flex items-center gap-2">
            {activeLesson.status === "scheduled" ? (
              <Button size="sm" onClick={startLesson}>
                <Play className="h-4 w-4 mr-1" />
                수업 시작
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={endLesson}>
                <Square className="h-4 w-4 mr-1" />
                수업 종료
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* 이전 수업 */}
          {previousLesson && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                이전 수업 ({formatDate(previousLesson.scheduled_at)})
              </h3>
              <div className="rounded-lg border p-4 bg-muted/30">
                {previousLesson.content ? (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">수업 내용</p>
                    <p className="text-sm whitespace-pre-wrap">{previousLesson.content}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">수업 내용이 없습니다</p>
                )}
                {previousLesson.homework && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">과제</p>
                    <p className="text-sm whitespace-pre-wrap">{previousLesson.homework}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 오늘 수업 작성 (강사용) */}
          {isInstructor && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  오늘 수업
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveContent}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  저장
                </Button>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">수업 내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full mt-1 p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={5}
                  placeholder="오늘 수업 내용을 입력하세요..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">과제</label>
                <textarea
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                  className="w-full mt-1 p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  placeholder="과제를 입력하세요..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">비고</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={2}
                  placeholder="추가 메모..."
                />
              </div>
            </div>
          )}

          {/* 수업 내용 보기 (학생용) */}
          {!isInstructor && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                오늘 수업
              </h3>

              {activeLesson.content ? (
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">수업 내용</p>
                  <p className="text-sm whitespace-pre-wrap">{activeLesson.content}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 수업 내용이 작성되지 않았습니다</p>
              )}

              {activeLesson.homework && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">과제</p>
                  <p className="text-sm whitespace-pre-wrap">{activeLesson.homework}</p>
                </div>
              )}

              {/* 출석 상태 */}
              {attendanceStatus && (
                <div className="rounded-lg border p-4 bg-green-50/50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">출석 완료</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side Panel - QR Code (강사용) */}
        {isInstructor && (
          <div className="w-80 border-l p-4 bg-muted/20">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              출석 QR 코드
            </h3>

            <div className="rounded-lg border bg-background p-4">
              {qrCode ? (
                <div className="space-y-4">
                  {/* QR 코드 표시 */}
                  <div className="aspect-square bg-white rounded-lg flex items-center justify-center p-4">
                    {/* QR 코드 이미지 - 실제 구현시 QR 라이브러리 사용 */}
                    <div className="w-full h-full border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center">
                      <QrCode className="h-16 w-16 text-gray-400 mb-2" />
                      <p className="text-xs text-center text-muted-foreground break-all px-2">
                        {qrCode.code.substring(0, 20)}...
                      </p>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-xs text-muted-foreground">
                      수업 종료 시 만료
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(qrCode.expires_at), "HH:mm", { locale: ko })}까지 유효
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">QR 코드 없음</p>
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={generateQRCode}
                    disabled={isGeneratingQR}
                  >
                    {isGeneratingQR ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <QrCode className="h-4 w-4 mr-1" />
                    )}
                    QR 코드 생성
                  </Button>
                </div>
              )}
            </div>

            {/* 출석 현황 */}
            <div className="mt-6">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">출석 현황</h4>
              <div className="rounded-lg border bg-background p-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{studentName}</span>
                  {attendanceStatus ? (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      출석
                    </span>
                  ) : (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      미출석
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
