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
  BookOpen,
  Clock,
  UsersRound,
  Home,
} from "lucide-react";

interface GroupNavigationProps {
  group: Group;
  membership: GroupMember;
}

export function GroupNavigation({ group, membership }: GroupNavigationProps) {
  const pathname = usePathname();
  const baseUrl = `/groups/${group.id}`;

  const isOwnerOrAdmin = membership.role === "owner" || membership.role === "admin";
  const isEducationType = group.type === "education";
  const hasPracticeRoom = group.settings?.has_practice_room;

  // 탭 순서: 홈, 수업관리, 클래스예약, 공지사항, 일정, 멤버, 소그룹, 설정
  const navItems = [
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
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
