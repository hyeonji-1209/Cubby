"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Group, GroupMember, Lesson } from "@/types";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Users,
  Settings,
  BookOpen,
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
}

export function GroupNavigation({ group, membership, activeLesson }: GroupNavigationProps) {
  const pathname = usePathname();
  const baseUrl = `/groups/${group.id}`;

  const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin";
  const isInstructor = membership.role === "instructor";
  const isEducationType = group.type === "education";
  const hasPracticeRoom = group.settings?.has_practice_room;

  // 활성 수업 탭 라벨 생성
  const activeLessonLabel = activeLesson
    ? activeLesson.status === "in_progress"
      ? `${activeLesson.student_name || "수업"} 진행중`
      : `${activeLesson.student_name || "수업"} 곧 시작`
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
    ...(isEducationType
      ? [
          { href: `${baseUrl}/lessons`, label: "수업관리", icon: BookOpen },
          ...(hasPracticeRoom || isOwnerOrAdmin
            ? [{ href: `${baseUrl}/reservations`, label: "클래스예약", icon: Clock }]
            : []),
        ]
      : []),
    { href: `${baseUrl}/announcements`, label: "공지사항", icon: Bell },
    { href: `${baseUrl}/calendar`, label: "일정", icon: Calendar },
    { href: `${baseUrl}/members`, label: "멤버", icon: Users },
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

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActiveLessonTab
                    ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20"
                    : isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-4 w-4", isActiveLessonTab && "text-green-500")} />
                  {hasPulse && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
