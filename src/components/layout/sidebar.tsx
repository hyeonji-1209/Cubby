"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings, LogOut, Plus, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/contexts/user-context";
import { GROUP_TYPE_ICONS, DEFAULT_GROUP_ICON } from "@/lib/group-utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { groups, isLoading } = useUser();

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
                const isPending = group.status === "pending";
                const IconComponent = GROUP_TYPE_ICONS[group.type] || DEFAULT_GROUP_ICON;

                if (isPending) {
                  return (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm opacity-50 cursor-not-allowed"
                    >
                      <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {group.icon ? (
                          group.icon.startsWith("http") ? (
                            <img
                              src={group.icon}
                              alt=""
                              className="w-full h-full object-cover grayscale"
                            />
                          ) : (
                            <span className="text-sm">{group.icon}</span>
                          )
                        ) : (
                          <IconComponent className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="truncate flex-1">{group.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 shrink-0">
                        대기
                      </span>
                    </div>
                  );
                }

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
                    <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {group.icon ? (
                        group.icon.startsWith("http") ? (
                          <img
                            src={group.icon}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">{group.icon}</span>
                        )
                      ) : (
                        <IconComponent className="h-3.5 w-3.5" />
                      )}
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
