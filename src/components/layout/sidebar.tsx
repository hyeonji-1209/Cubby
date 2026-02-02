"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  LogOut,
  Plus,
  Home,
  GraduationCap,
  Heart,
  Users,
  Building2,
  Gamepad2,
  MoreHorizontal,
  Folder
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Group {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

const groupTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  education: GraduationCap,
  couple: Heart,
  family: Users,
  religion: Building2,
  hobby: Gamepad2,
  other: MoreHorizontal,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: memberships } = await supabase
          .from("group_members")
          .select(`
            group:groups(id, name, icon, type)
          `)
          .eq("user_id", user.id)
          .eq("status", "approved");

        if (memberships) {
          const groupList = memberships
            .map((m) => m.group as unknown as Group)
            .filter(Boolean);
          setGroups(groupList);
        }
      }
      setIsLoading(false);
    };

    fetchGroups();
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold">Cubby</span>
        </Link>
      </div>

      {/* Top Navigation */}
      <div className="px-3 py-3 border-b">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Home className="h-4 w-4" />
          홈
        </Link>
      </div>

      {/* Groups Section */}
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-2 px-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              내 모임
            </span>
            <Link
              href="/groups/create"
              className="p-1 rounded hover:bg-muted transition-colors"
              title="새 모임 만들기"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : groups.length > 0 ? (
            <nav className="space-y-1">
              {groups.map((group) => {
                const isActive = pathname === `/groups/${group.id}`;
                const IconComponent = groupTypeIcons[group.type] || Folder;
                return (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <IconComponent className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{group.name}</span>
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="text-center py-6 px-3">
              <p className="text-xs text-muted-foreground mb-3">
                아직 모임이 없어요
              </p>
              <Link
                href="/groups/create"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                모임 만들기
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="border-t p-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            pathname === "/settings"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          설정
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
