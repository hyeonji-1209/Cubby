"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/contexts/user-context";
import {
  Loader2,
  Check,
  Clock,
  QrCode,
  User,
  Pencil,
  Copy,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { WEEKDAYS_KO } from "@/lib/date-utils";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeSVG),
  { ssr: false, loading: () => <div className="w-[160px] h-[160px] bg-muted animate-pulse" /> }
);

interface Student {
  id: string;
  user_id: string;
  nickname: string | null;
  userName: string;
  lesson_schedule: { day_of_week: number; start_time: string; end_time: string }[];
  isCurrentLesson: boolean;
  currentSchedule: { start_time: string; end_time: string } | null;
}

interface PreviousLesson {
  id: string;
  scheduled_at: string;
  content?: string;
  homework?: string;
  notes?: string;
  status: string;
}

interface TodayLesson {
  id: string;
  scheduled_at: string;
  status: string;
  content?: string;
  homework?: string;
  notes?: string;
}

export default function TeachingPage({ params }: { params: { id: string } }) {
  const toast = useToast();
  const { user, isLoading: isUserLoading } = useUser();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previousLesson, setPreviousLesson] = useState<PreviousLesson | null>(null);
  const [todayLesson, setTodayLesson] = useState<TodayLesson | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [content, setContent] = useState("");
  const [homework, setHomework] = useState("");
  const [notes, setNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const groupId = params?.id;
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isUserLoading && user && groupId && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadStudents();
    }
  }, [isUserLoading, user, groupId]);

  const loadStudents = async () => {
    if (!user) return;

    try {
      const supabase = createClient();

      const { data: assignedStudents } = await supabase
        .from("group_members")
        .select("id, user_id, nickname, lesson_schedule, user:profiles!user_id(name)")
        .eq("group_id", groupId)
        .eq("instructor_id", user.id)
        .eq("status", "approved")
        .eq("role", "student");

      if (!assignedStudents) {
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      const studentList: Student[] = assignedStudents.map((s) => {
        const schedules = (s.lesson_schedule as any[]) || [];
        let isCurrentLesson = false;
        let currentSchedule: { start_time: string; end_time: string } | null = null;

        for (const schedule of schedules) {
          if (schedule.day_of_week === currentDay) {
            if (currentTime >= schedule.start_time && currentTime <= schedule.end_time) {
              isCurrentLesson = true;
              currentSchedule = schedule;
              break;
            }
          }
        }

        return {
          id: s.id,
          user_id: s.user_id,
          nickname: s.nickname,
          userName: (s.user as any)?.name || "학생",
          lesson_schedule: schedules,
          isCurrentLesson,
          currentSchedule,
        };
      });

      // 현재 수업 중인 학생을 맨 앞으로
      studentList.sort((a, b) => {
        if (a.isCurrentLesson && !b.isCurrentLesson) return -1;
        if (!a.isCurrentLesson && b.isCurrentLesson) return 1;
        return 0;
      });

      setStudents(studentList);

      // 첫 번째 학생 자동 선택
      if (studentList.length > 0) {
        setSelectedStudent(studentList[0]);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error loading students:", err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      loadStudentLesson(selectedStudent);
    }
  }, [selectedStudent?.user_id]);

  const loadStudentLesson = async (student: Student) => {
    if (!user) return;

    setIsEditing(false);
    const supabase = createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // 오늘 수업 + 이전 완료된 수업 조회
    const [todayResult, previousResult] = await Promise.all([
      supabase
        .from("lessons")
        .select("id, scheduled_at, status, content, homework, notes")
        .eq("group_id", groupId)
        .eq("student_id", student.user_id)
        .gte("scheduled_at", today.toISOString())
        .lte("scheduled_at", todayEnd.toISOString())
        .limit(1),
      supabase
        .from("lessons")
        .select("id, scheduled_at, status, content, homework, notes")
        .eq("group_id", groupId)
        .eq("student_id", student.user_id)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false })
        .limit(1),
    ]);

    if (todayResult.data?.[0]) {
      const lesson = todayResult.data[0];
      setTodayLesson(lesson);
      setContent(lesson.content || "");
      setHomework(lesson.homework || "");
      setNotes(lesson.notes || "");

      // QR 코드 조회
      const { data: qrData } = await supabase
        .from("attendance_qr_codes")
        .select("code")
        .eq("lesson_id", lesson.id)
        .limit(1);

      if (qrData?.[0]) {
        setQrCode(qrData[0].code);
      } else {
        await createQrCode(lesson.id);
      }
    } else {
      // 오늘 수업이 없으면 생성
      setTodayLesson(null);
      setContent("");
      setHomework("");
      setNotes("");
      setQrCode(null);

      if (student.currentSchedule) {
        await createTodayLesson(student);
      }
    }

    if (previousResult.data?.[0]) {
      setPreviousLesson(previousResult.data[0]);
    } else {
      setPreviousLesson(null);
    }
  };

  const createTodayLesson = async (student: Student) => {
    if (!user || !student.currentSchedule) return;

    const supabase = createClient();
    const now = new Date();
    const [startH, startM] = student.currentSchedule.start_time.split(":").map(Number);
    now.setHours(startH, startM, 0, 0);

    const [endH, endM] = student.currentSchedule.end_time.split(":").map(Number);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    const { data: newLesson } = await supabase
      .from("lessons")
      .insert({
        group_id: groupId,
        instructor_id: user.id,
        student_id: student.user_id,
        scheduled_at: now.toISOString(),
        duration_minutes: durationMinutes > 0 ? durationMinutes : 60,
        is_makeup: false,
        status: "scheduled",
      })
      .select("id, scheduled_at, status")
      .single();

    if (newLesson) {
      setTodayLesson(newLesson);
      await createQrCode(newLesson.id);
    }
  };

  const createQrCode = async (lessonId: string) => {
    const supabase = createClient();
    const code = `${groupId}-${lessonId}-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3);

    await supabase.from("attendance_qr_codes").insert({
      lesson_id: lessonId,
      group_id: groupId,
      code,
      expires_at: expiresAt.toISOString(),
    });

    setQrCode(code);
  };

  const handleComplete = async () => {
    if (!todayLesson || !selectedStudent) return;

    setIsUpdating(true);
    const supabase = createClient();

    // 완료 시 자동 저장
    await supabase
      .from("lessons")
      .update({ content, homework, notes, status: "completed" })
      .eq("id", todayLesson.id);

    toast.success("수업이 완료되었습니다");
    setTodayLesson({ ...todayLesson, status: "completed", content, homework, notes });
    setIsEditing(false);
    setIsUpdating(false);

    // 선택된 학생 + 학생 목록 업데이트 (수업 완료 시 현재 수업 상태 해제)
    setSelectedStudent((prev) => prev ? { ...prev, isCurrentLesson: false } : null);
    setStudents((prev) =>
      prev.map((s) =>
        s.user_id === selectedStudent.user_id
          ? { ...s, isCurrentLesson: false }
          : s
      )
    );
  };

  const handleEditSave = async () => {
    if (!todayLesson) return;

    setIsUpdating(true);
    const supabase = createClient();

    await supabase
      .from("lessons")
      .update({ content, homework, notes })
      .eq("id", todayLesson.id);

    toast.success("수정되었습니다");
    setTodayLesson({ ...todayLesson, content, homework, notes });
    setIsEditing(false);
    setIsUpdating(false);
  };

  const qrScanUrl = qrCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/groups/${groupId}/scan?code=${qrCode}`
    : null;

  const handleCopyQrUrl = async () => {
    if (!qrScanUrl) return;
    try {
      await navigator.clipboard.writeText(qrScanUrl);
      toast.success("링크가 복사되었습니다");
    } catch {
      toast.error("복사에 실패했습니다");
    }
  };

  const getQrInfoText = () => {
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일`;
    const schedule = selectedStudent?.currentSchedule;
    const timeStr = schedule ? `${schedule.start_time}` : `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
    const studentName = selectedStudent?.nickname || selectedStudent?.userName || "";

    return { dateStr, timeStr, studentName };
  };

  const handlePrintQr = () => {
    const qrElement = document.getElementById("qr-code-container");
    if (!qrElement) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const { dateStr, timeStr, studentName } = getQrInfoText();
    const title = studentName ? `${dateStr} ${timeStr} ${studentName}` : `${dateStr} ${timeStr}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>출석 QR - ${title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .date-time { font-size: 24px; margin-bottom: 4px; }
            .student-name { font-size: 18px; color: #666; margin-bottom: 24px; }
            .qr { padding: 16px; }
            .footer { margin-top: 16px; font-size: 13px; color: #999; }
          </style>
        </head>
        <body>
          <div class="date-time">${dateStr} ${timeStr}</div>
          ${studentName ? `<div class="student-name">${studentName}</div>` : ""}
          <div class="qr">${qrElement.innerHTML}</div>
          <p class="footer">QR 코드를 스캔하여 출석 체크</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <User className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
          <p className="font-medium mb-1">담당 학생 없음</p>
          <p className="text-sm text-muted-foreground">배정된 학생이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 학생 목록 */}
      <div className="w-48 border-r flex flex-col shrink-0">
        <div className="px-3 py-2 border-b">
          <p className="text-xs font-medium text-muted-foreground">담당 학생</p>
        </div>
        <div className="flex-1 overflow-auto">
          {students.map((student) => {
            // 선택된 학생이고 수업 완료된 경우 초록색 표시 안함
            const isSelectedAndCompleted = selectedStudent?.id === student.id && todayLesson?.status === "completed";
            const showCurrentLesson = student.isCurrentLesson && !isSelectedAndCompleted;

            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={cn(
                  "w-full px-3 py-2.5 text-left text-sm transition-colors border-b",
                  selectedStudent?.id === student.id
                    ? "bg-primary/10"
                    : "hover:bg-muted/50",
                  showCurrentLesson && "bg-emerald-50 dark:bg-emerald-950/20"
                )}
              >
                <div className="flex items-center gap-2">
                  {showCurrentLesson && (
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                  )}
                  <span className="font-medium truncate">
                    {student.nickname || student.userName}
                  </span>
                </div>
              {student.lesson_schedule.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {student.lesson_schedule.map((s, i) => (
                    <span key={i}>
                      {i > 0 && ", "}
                      {WEEKDAYS_KO[s.day_of_week]} {s.start_time}
                    </span>
                  ))}
                </p>
              )}
            </button>
            );
          })}
        </div>
      </div>

      {/* 수업 내용 */}
      {selectedStudent && (
        <div className="flex-1 flex flex-col">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="font-semibold">
                  {selectedStudent.nickname || selectedStudent.userName}
                </h2>
                {selectedStudent.currentSchedule && (
                  <p className="text-xs text-muted-foreground">
                    {selectedStudent.currentSchedule.start_time} - {selectedStudent.currentSchedule.end_time}
                  </p>
                )}
              </div>
              {selectedStudent.isCurrentLesson && todayLesson?.status !== "completed" && (
                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-600">
                  수업 중
                </span>
              )}
              {todayLesson?.status === "completed" && (
                <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                  완료
                </span>
              )}
            </div>
            {todayLesson && (
              <div className="flex items-center gap-2">
                {todayLesson.status === "completed" ? (
                  isEditing ? (
                    <>
                      <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm">
                        취소
                      </Button>
                      <Button onClick={handleEditSave} disabled={isUpdating} size="sm">
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                        저장
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      <Pencil className="h-4 w-4 mr-1" />
                      수정
                    </Button>
                  )
                ) : (
                  <Button onClick={handleComplete} disabled={isUpdating} size="sm">
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                    완료
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* 수업 기록 입력 */}
            <div className="flex-1 p-4 overflow-auto">
              {todayLesson ? (
                <div className="h-full flex flex-col gap-3">
                  {(() => {
                    const isCompleted = todayLesson.status === "completed";
                    const canEdit = !isCompleted || isEditing;

                    return (
                      <>
                        <div className="flex-[3] flex flex-col min-h-0">
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 shrink-0">수업 내용</label>
                          <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="오늘 수업에서 다룬 내용..."
                            className="flex-1 resize-none min-h-[100px] text-sm"
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="flex-[2] flex flex-col min-h-0">
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 shrink-0">과제</label>
                          <Textarea
                            value={homework}
                            onChange={(e) => setHomework(e.target.value)}
                            placeholder="학생에게 내준 과제..."
                            className="flex-1 resize-none min-h-[60px] text-sm"
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="flex-1 flex flex-col min-h-0">
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 shrink-0">비고</label>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="기타 메모..."
                            className="flex-1 resize-none min-h-[40px] text-sm"
                            disabled={!canEdit}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">오늘 예정된 수업 없음</p>
                    <p className="text-sm">정규 수업 시간에 자동 생성됩니다</p>
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽 사이드바: QR + 이전 수업 */}
            <div className="w-72 p-4 overflow-auto border-l bg-muted/30 shrink-0 space-y-4">
              {/* QR 코드 (수업 진행 중일 때만) */}
              {todayLesson && todayLesson.status !== "completed" && (
                <div className="border bg-background p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-muted-foreground">출석 QR</h3>
                    {qrScanUrl && (
                      <div className="flex gap-1">
                        <button
                          onClick={handleCopyQrUrl}
                          className="p-1.5 hover:bg-muted transition-colors"
                          title="링크 복사"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={handlePrintQr}
                          className="p-1.5 hover:bg-muted transition-colors"
                          title="인쇄"
                        >
                          <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                  {qrScanUrl ? (
                    <div className="flex flex-col items-center">
                      <div id="qr-code-container" className="p-3 bg-white">
                        <QRCodeSVG value={qrScanUrl} size={200} level="M" />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3">
                        학생이 스캔하면 출석 처리
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <QrCode className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">준비 중...</p>
                    </div>
                  )}
                </div>
              )}

              {/* 이전 수업 */}
              <div className="border bg-background p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-muted-foreground">이전 수업</h3>
                  {previousLesson && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(previousLesson.scheduled_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                    </span>
                  )}
                </div>

                {previousLesson ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-0.5">수업 내용</p>
                      <p className="whitespace-pre-wrap">{previousLesson.content || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">과제</p>
                      <p className="whitespace-pre-wrap">{previousLesson.homework || "-"}</p>
                    </div>
                    {previousLesson.notes && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">비고</p>
                        <p className="whitespace-pre-wrap text-muted-foreground">{previousLesson.notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">기록 없음</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
