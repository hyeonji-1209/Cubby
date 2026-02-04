"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  Camera,
} from "lucide-react";
import { useUser } from "@/lib/contexts/user-context";
import { useGroup } from "@/lib/contexts/group-context";

interface ScanPageProps {
  params: { id: string };
}

export default function ScanPage({ params }: ScanPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");
  const { user } = useUser();
  const { membership } = useGroup();

  const [isProcessing, setIsProcessing] = useState(false);
  const [code, setCode] = useState(codeFromUrl || "");
  const [result, setResult] = useState<{
    success: boolean;
    status?: string;
    message: string;
    lessonInfo?: {
      scheduled_at: string;
      student_name: string;
    };
  } | null>(null);

  useEffect(() => {
    // URL에서 코드가 있으면 자동으로 출석 처리
    if (codeFromUrl && membership) {
      handleScan(codeFromUrl);
    }
  }, [codeFromUrl, membership]);

  const handleScan = async (qrCode: string) => {
    if (!membership || isProcessing) return;

    setIsProcessing(true);
    setResult(null);

    const supabase = createClient();

    // QR 코드 조회
    const { data: qrData, error: qrError } = await supabase
      .from("attendance_qr_codes")
      .select(`
        *,
        lesson:lessons(
          id,
          scheduled_at,
          duration_minutes,
          status,
          student_id,
          instructor_id
        )
      `)
      .eq("code", qrCode)
      .eq("group_id", params.id)
      .single();

    if (qrError || !qrData) {
      setResult({
        success: false,
        message: "유효하지 않은 QR 코드입니다.",
      });
      setIsProcessing(false);
      return;
    }

    const lesson = qrData.lesson;
    const now = new Date();
    const expiresAt = new Date(qrData.expires_at);
    const lessonStart = new Date(lesson.scheduled_at);
    const fiveMinutesAfterStart = new Date(lessonStart.getTime() + 5 * 60 * 1000);

    // 만료 체크
    if (now > expiresAt) {
      setResult({
        success: false,
        message: "QR 코드가 만료되었습니다. (수업 종료)",
      });
      setIsProcessing(false);
      return;
    }

    // 이미 출석했는지 확인
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("lesson_id", lesson.id)
      .eq("member_id", membership.id)
      .single();

    if (existingAttendance) {
      setResult({
        success: false,
        message: "이미 출석 처리되었습니다.",
      });
      setIsProcessing(false);
      return;
    }

    // 출석 상태 결정
    // 수업 시작 5분 후까지: 정상 출석, 그 이후: 지각
    let attendanceStatus: "present" | "late" = "present";
    if (now > fiveMinutesAfterStart) {
      attendanceStatus = "late";
    }

    // 출석 기록 생성
    const { error: attendanceError } = await supabase
      .from("attendance")
      .insert({
        lesson_id: lesson.id,
        member_id: membership.id,
        status: attendanceStatus,
        check_in_at: now.toISOString(),
      });

    if (attendanceError) {
      setResult({
        success: false,
        message: "출석 처리 중 오류가 발생했습니다.",
      });
      setIsProcessing(false);
      return;
    }

    setResult({
      success: true,
      status: attendanceStatus,
      message: attendanceStatus === "present" ? "출석 완료!" : "지각 처리되었습니다.",
      lessonInfo: {
        scheduled_at: lesson.scheduled_at,
        student_name: user?.name || "",
      },
    });

    setIsProcessing(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      handleScan(code.trim());
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          출석 QR 스캔
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {result ? (
            // 결과 표시
            <div className="text-center space-y-4">
              {result.success ? (
                <>
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                    result.status === "present"
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-yellow-100 dark:bg-yellow-900/30"
                  }`}>
                    {result.status === "present" ? (
                      <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${
                      result.status === "present"
                        ? "text-green-600 dark:text-green-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }`}>
                      {result.message}
                    </h3>
                    {result.lessonInfo && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {format(new Date(result.lessonInfo.scheduled_at), "M월 d일 (EEE) HH:mm", { locale: ko })} 수업
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/groups/${params.id}/active-lesson`)}
                  >
                    수업 페이지로 이동
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">
                      출석 실패
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {result.message}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setResult(null);
                      setCode("");
                    }}
                  >
                    다시 시도
                  </Button>
                </>
              )}
            </div>
          ) : (
            // 스캔 입력
            <div className="space-y-6">
              {/* 카메라 스캔 영역 (실제 구현시 QR 스캐너 라이브러리 사용) */}
              <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center border-2 border-dashed">
                <Camera className="h-16 w-16 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  QR 코드를 스캔하세요
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (카메라 스캔은 추후 지원 예정)
                </p>
              </div>

              {/* 수동 입력 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    또는 코드 직접 입력
                  </span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="QR 코드 입력..."
                  className="w-full px-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!code.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      처리 중...
                    </>
                  ) : (
                    "출석하기"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
