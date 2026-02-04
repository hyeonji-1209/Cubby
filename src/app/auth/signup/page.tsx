"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";
import {
  validateName,
  validateEmail,
  validatePassword,
  validatePhone,
  normalizePhone,
  sanitizeInput,
} from "@/lib/input-validation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // 이름 검증
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      setError(nameValidation.error || "이름을 확인해주세요.");
      setIsLoading(false);
      return;
    }

    // 이메일 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || "이메일을 확인해주세요.");
      setIsLoading(false);
      return;
    }

    // 전화번호 검증
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || "전화번호를 확인해주세요.");
      setIsLoading(false);
      return;
    }

    // 비밀번호 검증
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || "비밀번호를 확인해주세요.");
      setIsLoading(false);
      return;
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const normalizedPhone = normalizePhone(phone);

    // 전화번호 중복 확인
    const { data: existingPhone } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (existingPhone) {
      setError("이미 등록된 전화번호입니다.");
      setIsLoading(false);
      return;
    }

    // 입력값 정제
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = email.trim().toLowerCase();

    const { error, data } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        data: {
          name: sanitizedName,
          phone: normalizedPhone,
        },
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    // 이메일 인증이 필요한 경우 (user는 있지만 session이 없음)
    if (data.user && !data.session) {
      setIsEmailSent(true);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      setError(error.message);
    }

    setIsResending(false);
  };

  // 이메일 인증 안내 화면
  if (isEmailSent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">이메일을 확인하세요</h1>
            <p className="text-muted-foreground text-sm">
              <span className="font-medium text-foreground">{email}</span>
              <br />
              으로 인증 링크를 보냈습니다.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>이메일의 링크를 클릭하여 회원가입을 완료하세요.</p>
            <p className="mt-1">스팸함도 확인해 주세요.</p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              isLoading={isResending}
            >
              인증 메일 다시 보내기
            </Button>

            <Link href="/auth/login">
              <Button variant="ghost" className="w-full">
                로그인으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">회원가입</h1>
          <p className="text-muted-foreground text-sm">
            새 계정을 만들어 시작하세요
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            type="text"
            label="이름"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            type="email"
            label="이메일"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <PhoneInput
            label="전화번호"
            value={phone}
            onChange={setPhone}
            required
          />

          <Input
            type="password"
            label="비밀번호"
            placeholder="6자 이상 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            type="password"
            label="비밀번호 확인"
            placeholder="비밀번호 재입력"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            회원가입
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
          <Link
            href="/auth/login"
            className="text-primary hover:underline font-medium"
          >
            로그인
          </Link>
        </div>
      </div>
    </main>
  );
}
