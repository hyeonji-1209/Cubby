"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function JoinGroupPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [groupName, setGroupName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
        .select("id, name, type")
        .eq("invite_code", inviteCode.toUpperCase().trim())
        .single();

      if (groupError || !group) {
        setError("유효하지 않은 초대 코드입니다.");
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

      // 모임 가입 신청
      const { error: joinError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: "member",
          status: "pending",
        });

      if (joinError) {
        setError("모임 가입에 실패했습니다. 다시 시도해주세요.");
        setIsLoading(false);
        return;
      }

      setGroupName(group.name);
      setSuccess(true);
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-4 md:p-6 py-8 md:py-16">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">가입 신청 완료</h1>
          <p className="text-muted-foreground mb-6">
            <span className="font-medium text-foreground">{groupName}</span> 모임에
            <br />
            가입 신청이 완료되었습니다.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            관리자의 승인 후 모임에 참여할 수 있습니다.
          </p>
          <Button onClick={() => router.push("/dashboard")} className="w-full">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 md:p-6 py-4 md:py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <Link
          href="/dashboard"
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">초대코드로 참여</h1>
          <p className="text-muted-foreground text-sm">
            초대 코드를 입력하여 모임에 참여하세요
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
      </form>

      {/* Info */}
      <div className="mt-8 p-4 rounded-xl bg-muted/50">
        <h3 className="font-medium text-sm mb-2">초대 코드란?</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          초대 코드는 모임 관리자가 생성하는 고유한 코드입니다.
          코드를 입력하면 해당 모임에 가입 신청이 되며,
          관리자의 승인 후 모임에 참여할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
