"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { JoinGroupModal } from "@/components/groups/join-group-modal";

export function DashboardActions() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Link
          href="/groups/create"
          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          모임 만들기
        </Link>
        <button
          onClick={() => setIsJoinModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm font-medium"
        >
          <UserPlus className="h-4 w-4" />
          초대코드 입력
        </button>
      </div>

      <JoinGroupModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </>
  );
}
