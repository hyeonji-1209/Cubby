"use client";

import Link from "next/link";
import { Bell, Plus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TopHeaderProps {
  className?: string;
}

export function TopHeader({ className }: TopHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 알림 개수
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);

        setUnreadCount(count || 0);

        // 사용자 이름
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        setUserName(profile?.name || null);
      }
    };

    fetchUserData();
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b md:left-64 ${className || ""}`}>
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo & Greeting - Mobile */}
          <div className="md:hidden">
            <span className="text-sm font-medium">
              {userName ? `${userName}님` : "Cubby"}
            </span>
          </div>

          {/* Desktop - Greeting */}
          <div className="hidden md:block">
            <span className="text-sm font-medium">
              {userName ? `${userName}님, 오늘도 좋은 하루 보내세요!` : "오늘도 좋은 하루 보내세요!"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/groups/join"
                  className="p-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>초대코드로 참여</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/notifications"
                  className="relative p-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>알림</p>
              </TooltipContent>
            </Tooltip>

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
    </TooltipProvider>
  );
}
