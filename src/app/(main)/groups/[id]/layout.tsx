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

  // 활성 수업 조회 (진행 중이거나 5분 이내 시작하는 수업)
  let activeLesson: ActiveLesson | null = null;

  if (group.type === "education") {
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    // 강사인 경우: 자신이 진행하는 수업 조회
    // 학생인 경우: 자신의 수업 조회
    const isInstructor = membership.role === "instructor" || membership.role === "owner" || membership.role === "admin";

    let query = supabase
      .from("lessons")
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        status,
        student_id,
        instructor_id
      `)
      .eq("group_id", params.id)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_at", { ascending: true })
      .limit(1);

    if (isInstructor) {
      query = query.eq("instructor_id", membership.id);
    } else {
      query = query.eq("student_id", membership.id);
    }

    const { data: lessons } = await query;

    if (lessons && lessons.length > 0) {
      const lesson = lessons[0];
      const lessonStart = new Date(lesson.scheduled_at);
      const lessonEnd = new Date(lessonStart.getTime() + lesson.duration_minutes * 60 * 1000);

      // 수업 중이거나 5분 이내 시작하는 경우
      const isInProgress = lesson.status === "in_progress" || (now >= lessonStart && now <= lessonEnd);
      const isStartingSoon = lessonStart <= fiveMinutesLater && lessonStart > now;

      if (isInProgress || isStartingSoon) {
        // 학생 이름 가져오기 (강사용)
        let studentName = "";
        if (isInstructor && lesson.student_id) {
          const { data: student } = await supabase
            .from("group_members")
            .select("user:users(name)")
            .eq("id", lesson.student_id)
            .single();
          studentName = (student?.user as any)?.name || "";
        }

        activeLesson = {
          id: lesson.id,
          student_name: studentName,
          scheduled_at: lesson.scheduled_at,
          status: isInProgress ? "in_progress" : "upcoming",
        };
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
      />

      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
