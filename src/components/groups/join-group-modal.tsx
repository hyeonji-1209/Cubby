"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Users,
  ShieldCheck,
  ChevronLeft,
} from "lucide-react";
import { Group } from "@/types";
import { cn } from "@/lib/utils";

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type JoinStep = "code" | "role" | "success";
type EducationRole = "student" | "instructor" | "guardian";

export function JoinGroupModal({ isOpen, onClose }: JoinGroupModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<JoinStep>("code");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [foundGroup, setFoundGroup] = useState<Group | null>(null);
  const [selectedRole, setSelectedRole] = useState<EducationRole | null>(null);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("로그인이 필요합니다.");
        setIsLoading(false);
        return;
      }

      // 초대 코드로 모임 찾기
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("invite_code", inviteCode.toUpperCase().trim())
        .single();

      if (groupError || !group) {
        setError("유효하지 않은 초대 코드입니다.");
        setIsLoading(false);
        return;
      }

      // 초대 코드 유효성 검사
      const settings = group.settings || {};
      const codeType = settings.invite_code_type || 'one_time';
      const isUsed = settings.invite_code_used || false;
      const expiryDate = settings.invite_code_expiry;

      // 단발성 코드 - 이미 사용됨
      if (codeType === 'one_time' && isUsed) {
        setError("이미 사용된 초대 코드입니다.");
        setIsLoading(false);
        return;
      }

      // 유효기간 코드 - 만료됨
      if (codeType === 'expiry' && expiryDate && new Date(expiryDate) < new Date()) {
        setError("만료된 초대 코드입니다.");
        setIsLoading(false);
        return;
      }

      // 이미 가입되어 있는지 확인
      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id, status")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        if (existingMember.status === "approved") {
          setError("이미 참여 중인 모임입니다.");
        } else if (existingMember.status === "pending") {
          setError("이미 가입 신청 중인 모임입니다.");
        } else {
          setError("가입할 수 없는 모임입니다.");
        }
        setIsLoading(false);
        return;
      }

      setFoundGroup(group as Group);
      setGroupName(group.name);

      // 교육 타입이면 역할 선택 단계로
      if (group.type === "education") {
        setStep("role");
      } else {
        // 교육 타입이 아니면 바로 가입 처리
        await joinGroup(group as Group, "member");
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = async (role: EducationRole) => {
    if (!foundGroup) return;
    setSelectedRole(role);
    setIsLoading(true);
    await joinGroup(foundGroup, role);
    setIsLoading(false);
  };

  const joinGroup = async (group: Group, role: EducationRole | "member") => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("로그인이 필요합니다.");
        return;
      }

      // 역할 매핑
      const memberRole = role === "instructor" ? "instructor"
        : role === "guardian" ? "guardian"
        : "member";

      // 모임 가입 신청
      const { error: joinError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: memberRole,
          status: "pending",
        });

      if (joinError) {
        setError("모임 가입에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      // 단발성 코드인 경우 사용됨으로 표시
      const settings = group.settings || {};
      const codeType = settings.invite_code_type || 'one_time';

      if (codeType === 'one_time') {
        await supabase
          .from("groups")
          .update({
            settings: {
              ...settings,
              invite_code_used: true,
            }
          })
          .eq("id", group.id);
      }

      setStep("success");
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleClose = () => {
    setStep("code");
    setInviteCode("");
    setError(null);
    setGroupName("");
    setFoundGroup(null);
    setSelectedRole(null);
    onClose();
  };

  const handleGoHome = () => {
    handleClose();
    router.push("/dashboard");
    router.refresh();
  };

  const handleBack = () => {
    setStep("code");
    setError(null);
    setSelectedRole(null);
  };

  const getRoleLabel = (role: EducationRole | null) => {
    switch (role) {
      case "student": return "학생/수강생";
      case "instructor": return "강사";
      case "guardian": return "보호자";
      default: return "";
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
          <div className="flex items-center gap-2">
            {step === "role" && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold">
              {step === "code" && "초대코드로 참여"}
              {step === "role" && "역할 선택"}
              {step === "success" && "가입 신청 완료"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step 1: Code Input */}
          {step === "code" && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">초대 코드</label>
                <Input
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="예: ABC123"
                  className="text-center text-lg tracking-widest font-mono h-14"
                  maxLength={10}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  모임 관리자에게 받은 초대 코드를 입력하세요
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12"
                disabled={!inviteCode.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    확인 중...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    모임 참여하기
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  초대 코드는 모임 관리자가 생성하는 고유한 코드입니다.
                  코드를 입력하면 해당 모임에 가입 신청이 되며,
                  관리자의 승인 후 모임에 참여할 수 있습니다.
                </p>
              </div>
            </form>
          )}

          {/* Step 2: Role Selection (Education type only) */}
          {step === "role" && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{groupName}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  어떤 역할로 참여하시겠습니까?
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {/* 학생/수강생 */}
                <button
                  onClick={() => handleRoleSelect("student")}
                  disabled={isLoading}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    isLoading && selectedRole === "student" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">학생/수강생</p>
                      <p className="text-xs text-muted-foreground">
                        수업을 받는 학생으로 참여합니다
                      </p>
                    </div>
                    {isLoading && selectedRole === "student" && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                </button>

                {/* 강사 */}
                <button
                  onClick={() => handleRoleSelect("instructor")}
                  disabled={isLoading}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    isLoading && selectedRole === "instructor" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">강사</p>
                      <p className="text-xs text-muted-foreground">
                        수업을 진행하는 강사로 참여합니다
                      </p>
                    </div>
                    {isLoading && selectedRole === "instructor" && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                </button>

                {/* 보호자 */}
                <button
                  onClick={() => handleRoleSelect("guardian")}
                  disabled={isLoading}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-left transition-all",
                    "hover:border-primary hover:bg-primary/5",
                    isLoading && selectedRole === "guardian" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">보호자</p>
                      <p className="text-xs text-muted-foreground">
                        자녀의 수업을 관리하는 보호자로 참여합니다
                      </p>
                    </div>
                    {isLoading && selectedRole === "guardian" && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">가입 신청 완료</h3>
              <p className="text-muted-foreground mb-2">
                <span className="font-medium text-foreground">{groupName}</span> 모임에
              </p>
              {selectedRole && (
                <p className="text-muted-foreground mb-2">
                  <span className="font-medium text-primary">{getRoleLabel(selectedRole)}</span>로
                </p>
              )}
              <p className="text-muted-foreground mb-6">
                가입 신청이 완료되었습니다.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                관리자의 승인 후 모임에 참여할 수 있습니다.
              </p>
              <Button onClick={handleGoHome} className="w-full">
                확인
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
