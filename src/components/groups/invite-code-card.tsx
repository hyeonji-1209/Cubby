"use client";

import { Copy, Check } from "lucide-react";
import { useClipboard } from "@/hooks";

interface InviteCodeCardProps {
  inviteCode: string;
}

export function InviteCodeCard({ inviteCode }: InviteCodeCardProps) {
  const { copied, copy } = useClipboard();

  return (
    <div className="rounded-lg border p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium mb-1">초대 코드</p>
          <p className="text-2xl font-mono font-bold tracking-wider">
            {inviteCode}
          </p>
        </div>
        <button
          onClick={() => copy(inviteCode)}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              복사됨
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              복사
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        이 코드를 공유하여 새 멤버를 초대하세요
      </p>
    </div>
  );
}
