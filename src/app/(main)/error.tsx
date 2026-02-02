"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">오류가 발생했습니다</h2>
        <p className="text-muted-foreground mb-6">
          잠시 후 다시 시도해주세요
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            홈으로
          </Link>
          <Button onClick={() => reset()}>다시 시도</Button>
        </div>
      </div>
    </div>
  );
}
