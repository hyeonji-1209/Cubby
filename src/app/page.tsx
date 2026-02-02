import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-primary">Cubby</h1>
        <p className="text-muted-foreground text-lg">
          다양한 모임을 하나로 관리하세요
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto pt-8">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            로그인
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            회원가입
          </Link>
        </div>
      </div>
    </main>
  );
}
