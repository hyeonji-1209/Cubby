"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Group, GroupMember } from "@/types";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Users,
  Settings,
  Clock,
  UsersRound,
  Home,
  Radio,
} from "lucide-react";

interface ActiveLesson {
  id: string;
  title?: string;
  student_name?: string;
  scheduled_at: string;
  status: string;
}

interface GroupNavigationProps {
  group: Group;
  membership: GroupMember;
  activeLesson?: ActiveLesson | null;
  pendingMemberCount?: number;
}

export function GroupNavigation({ group, membership, activeLesson, pendingMemberCount = 0 }: GroupNavigationProps) {
  const pathname = usePathname();
  const baseUrl = `/groups/${group.id}`;

  const isOwnerOrAdmin = membership.is_owner;
  const isInstructor = membership.role === "instructor";
  const isEducationType = group.type === "education";
  const hasPracticeRoom = group.settings?.has_practice_room;

  // 활성 수업 탭 라벨 생성
  const activeLessonLabel = activeLesson
    ? activeLesson.student_name
      ? `${activeLesson.student_name} 수업`
      : "수업 중"
    : "";

  // 탭 순서: (활성수업), 홈, 수업관리, 클래스예약, 공지사항, 일정, 멤버, 소그룹, 설정
  const navItems = [
    // 활성 수업 탭 (수업 중 또는 5분 전)
    ...(activeLesson && isEducationType
      ? [{
          href: `${baseUrl}/active-lesson`,
          label: activeLessonLabel,
          icon: Radio,
          isActive: true,
          pulse: activeLesson.status === "in_progress",
        }]
      : []),
    { href: baseUrl, label: "홈", icon: Home, exact: true },
    // 교육 타입 전용 항목
    ...(isEducationType && (hasPracticeRoom || isOwnerOrAdmin)
      ? [{ href: `${baseUrl}/reservations`, label: "클래스예약", icon: Clock }]
      : []),
    { href: `${baseUrl}/announcements`, label: "공지사항", icon: Bell },
    { href: `${baseUrl}/calendar`, label: "일정", icon: Calendar },
    { href: `${baseUrl}/members`, label: "멤버", icon: Users, badge: pendingMemberCount > 0 ? pendingMemberCount : undefined },
    { href: `${baseUrl}/subgroups`, label: "소그룹", icon: UsersRound },
    // 설정 (오너/관리자만)
    ...(isOwnerOrAdmin
      ? [{ href: `${baseUrl}/settings`, label: "설정", icon: Settings }]
      : []),
  ];

  return (
    <>
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Group Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {group.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {navItems.map((item: any) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            const isActiveLessonTab = item.isActive;
            const hasPulse = item.pulse;
            const badge = item.badge;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActiveLessonTab
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30"
                    : isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-4 w-4", isActiveLessonTab && "text-emerald-600 dark:text-emerald-400")} />
                  {hasPulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </span>
                {item.label}
                {badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
