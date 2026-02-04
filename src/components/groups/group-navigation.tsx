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
  BookOpen,
} from "lucide-react";

interface GroupNavigationProps {
  group: Group;
  membership: GroupMember;
  pendingMemberCount?: number;
}

export function GroupNavigation({ group, membership, pendingMemberCount = 0 }: GroupNavigationProps) {
  const pathname = usePathname();
  const baseUrl = `/groups/${group.id}`;

  const isOwnerOrAdmin = membership.is_owner;
  const isInstructor = membership.role === "instructor";
  const isStudent = membership.role === "student";
  const isGuardian = membership.role === "guardian";
  const isStudentOrGuardian = isStudent || isGuardian;
  const canManageMembers = isOwnerOrAdmin || isInstructor;
  const isEducationType = group.type === "education";
  const hasPracticeRoom = group.settings?.has_practice_room;

  // 탭 순서: 홈, 수업관리, 클래스예약, 공지사항, 일정, 멤버, 소그룹, 설정
  const navItems = [
    { href: baseUrl, label: "홈", icon: Home, exact: true },
    // 강사용: 수업 관리 탭 (담당 학생 수업 진행)
    ...(isEducationType && isInstructor
      ? [{ href: `${baseUrl}/teaching`, label: "수업관리", icon: BookOpen }]
      : []),
    // 학생/보호자용: 수업 관리 탭 (수업 이력 보기)
    ...(isEducationType && isStudentOrGuardian
      ? [{ href: `${baseUrl}/lessons`, label: "수업관리", icon: BookOpen }]
      : []),
    // 교육 타입 전용 항목
    ...(isEducationType && (hasPracticeRoom || isOwnerOrAdmin)
      ? [{ href: `${baseUrl}/reservations`, label: "클래스예약", icon: Clock }]
      : []),
    { href: `${baseUrl}/announcements`, label: "공지사항", icon: Bell },
    { href: `${baseUrl}/calendar`, label: "일정", icon: Calendar },
    // 멤버/소그룹 탭 (오너/강사만)
    ...(canManageMembers
      ? [
          { href: `${baseUrl}/members`, label: "멤버", icon: Users, badge: pendingMemberCount > 0 ? pendingMemberCount : undefined },
          { href: `${baseUrl}/subgroups`, label: "소그룹", icon: UsersRound },
        ]
      : []),
    // 설정 (오너/관리자만)
    ...(isOwnerOrAdmin
      ? [{ href: `${baseUrl}/settings`, label: "설정", icon: Settings }]
      : []),
  ];

  return (
    <div className="border-b bg-background">
      <div className="px-4 py-3 border-b flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 -ml-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{group.name}</h1>
        </div>
      </div>
      <div className="flex overflow-x-auto scrollbar-hide">
        {navItems.map((item: any) => {
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
              {item.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
