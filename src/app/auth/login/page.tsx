"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/input-validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setNeedsEmailVerification(false);

    // 이메일 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || "이메일을 확인해주세요.");
      setIsLoading(false);
      return;
    }

    // 비밀번호 기본 체크
    if (!password || !password.trim()) {
      setError("비밀번호를 입력해주세요.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    const sanitizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed") || error.code === "email_not_confirmed") {
        setNeedsEmailVerification(true);
        setError("이메일 인증이 필요합니다. 이메일을 확인해주세요.");
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);

    const supabase = createClient();
    const sanitizedEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sanitizedEmail,
    });

    if (error) {
      setError(error.message);
    } else {
      setResendSuccess(true);
    }

    setIsResending(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">로그인</h1>
          <p className="text-muted-foreground text-sm">
            Cubby에 오신 것을 환영합니다
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            label="이메일"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label="비밀번호"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {resendSuccess && (
            <p className="text-sm text-primary text-center">
              인증 메일을 다시 보냈습니다. 이메일을 확인해주세요.
            </p>
          )}

          {needsEmailVerification && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              isLoading={isResending}
            >
              인증 메일 다시 보내기
            </Button>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            로그인
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">계정이 없으신가요? </span>
          <Link
            href="/auth/signup"
            className="text-primary hover:underline font-medium"
          >
            회원가입
          </Link>
        </div>
      </div>
    </main>
  );
}
