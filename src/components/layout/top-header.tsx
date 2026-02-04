"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { useUser } from "@/lib/contexts/user-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JoinGroupModal } from "@/components/groups/join-group-modal";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";

interface TopHeaderProps {
  className?: string;
}

export function TopHeader({ className }: TopHeaderProps) {
  const { profile } = useUser();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b md:left-64 ${className || ""}`}>
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo & Greeting - Mobile */}
          <div className="md:hidden">
            <span className="text-sm font-medium">
              {profile?.name ? `${profile.name}님` : "Cubby"}
            </span>
          </div>

          {/* Desktop - Greeting */}
          <div className="hidden md:block">
            <span className="text-sm font-medium">
              {profile?.name ? `${profile.name}님, 오늘도 좋은 하루 보내세요!` : "오늘도 좋은 하루 보내세요!"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="p-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>초대코드로 참여</p>
              </TooltipContent>
            </Tooltip>

            <NotificationDropdown />

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/groups/create"
                  className="p-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>새 모임 만들기</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <JoinGroupModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </TooltipProvider>
  );
}
