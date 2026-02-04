import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupNavigation } from "@/components/groups/group-navigation";
import { Group, GroupMember } from "@/types";

interface GroupLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

interface ActiveLesson {
  id: string;
  title?: string;
  student_name?: string;
  scheduled_at: string;
  status: string;
}

export default async function GroupLayout({ children, params }: GroupLayoutProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 그룹 정보 조회
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", params.id)
    .single();

  if (groupError || !group) {
    notFound();
  }

  // 멤버십 확인
  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership || membership.status !== "approved") {
    redirect("/dashboard");
  }

  // 대기 중 멤버 수 조회 (관리자만 표시)
  let pendingMemberCount = 0;
  if (membership.is_owner) {
    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", params.id)
      .eq("status", "pending");
    pendingMemberCount = count || 0;
  }

  // 활성 수업 조회 (정기 수업 시간 기준: 5분 전 ~ 수업 종료)
  let activeLesson: ActiveLesson | null = null;

  if (group.type === "education") {
    const now = new Date();
    const currentDay = now.getDay(); // 0=일, 1=월, ..., 6=토
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
    const fiveMinutesLaterTime = `${fiveMinutesLater.getHours().toString().padStart(2, "0")}:${fiveMinutesLater.getMinutes().toString().padStart(2, "0")}`;

    const isInstructor = membership.role === "instructor";

    if (isInstructor) {
      // 강사인 경우: 담당 학생들의 정기 수업 시간 확인
      const { data: assignedStudents } = await supabase
        .from("group_members")
        .select("user_id, nickname, lesson_schedule, user:profiles!user_id(name)")
        .eq("group_id", params.id)
        .eq("instructor_id", user.id)
        .eq("status", "approved");

      if (assignedStudents && assignedStudents.length > 0) {
        // 오늘 수업 시간이 현재 시간 기준 5분 전 ~ 종료 시간 내에 있는 학생 찾기
        for (const student of assignedStudents) {
          const schedules = (student.lesson_schedule as any[]) || [];
          for (const schedule of schedules) {
            if (schedule.day_of_week === currentDay) {
              const startTime = schedule.start_time;
              const endTime = schedule.end_time;

              // 수업 시작 5분 전 ~ 수업 종료 시간 사이인지 확인
              const isInProgress = currentTime >= startTime && currentTime <= endTime;
              const isStartingSoon = currentTime < startTime && fiveMinutesLaterTime >= startTime;

              if (isInProgress || isStartingSoon) {
                const studentName = student.nickname || (student.user as any)?.name || "";
                activeLesson = {
                  id: student.user_id, // 학생의 user_id를 임시 ID로 사용
                  student_name: studentName,
                  scheduled_at: new Date().toISOString(),
                  status: isInProgress ? "in_progress" : "upcoming",
                };
                break;
              }
            }
          }
          if (activeLesson) break;
        }
      }
    } else if (membership.role === "student") {
      // 학생인 경우: 자신의 정기 수업 시간 확인
      const schedules = (membership.lesson_schedule as any[]) || [];
      for (const schedule of schedules) {
        if (schedule.day_of_week === currentDay) {
          const startTime = schedule.start_time;
          const endTime = schedule.end_time;

          const isInProgress = currentTime >= startTime && currentTime <= endTime;
          const isStartingSoon = currentTime < startTime && fiveMinutesLaterTime >= startTime;

          if (isInProgress || isStartingSoon) {
            activeLesson = {
              id: user.id,
              student_name: "",
              scheduled_at: new Date().toISOString(),
              status: isInProgress ? "in_progress" : "upcoming",
            };
            break;
          }
        }
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Group Navigation */}
      <GroupNavigation
        group={group as Group}
        membership={membership as GroupMember}
        activeLesson={activeLesson}
        pendingMemberCount={pendingMemberCount}
      />

      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
