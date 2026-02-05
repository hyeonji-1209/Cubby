import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Users,
  ChevronRight,
  Settings,
  Pin,
  UsersRound,
  GraduationCap,
} from "lucide-react";
import { Group } from "@/types";
import { GroupCalendar } from "@/components/groups/group-calendar";
import { InviteCodeSection } from "@/components/groups/invite-code-section";
import { StudentScheduleSection } from "@/components/groups/student-schedule-section";

interface GroupPageProps {
  params: { id: string };
}

export default async function GroupPage({ params }: GroupPageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !group) {
    notFound();
  }

  const { data: myMembership } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", params.id)
    .eq("user_id", user?.id)
    .single();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("group_id", params.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: memberCount } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", params.id)
    .eq("status", "approved");

  // 이번 달 + 다음 달 일정
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("group_id", params.id)
    .gte("start_at", startOfMonth.toISOString())
    .lte("start_at", endOfNextMonth.toISOString())
    .order("start_at");

  const typedGroup = group as Group;
  const isOwnerOrAdmin = myMembership?.is_owner;
  const isInstructor = myMembership?.role === "instructor";
  const isEducationType = typedGroup.type === "education";
  const isStudent = myMembership?.role === "student" || myMembership?.role === "guardian";
  const canManage = isOwnerOrAdmin || isInstructor;

  // 수업과 예약 조회
  let lessons: any[] = [];
  let reservations: any[] = [];
  let regularSchedules: any[] = [];

  if (user) {
    if (isStudent) {
      // 학생용: 본인 수업만 조회
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("group_id", params.id)
        .eq("student_id", user.id)
        .gte("scheduled_at", startOfMonth.toISOString())
        .lte("scheduled_at", endOfNextMonth.toISOString())
        .in("status", ["scheduled", "in_progress", "completed"])
        .order("scheduled_at");

      lessons = lessonData || [];

      // 본인 예약 조회
      const { data: reservationData } = await supabase
        .from("room_reservations")
        .select("*")
        .eq("group_id", params.id)
        .eq("reserved_by", user.id)
        .gte("start_at", startOfMonth.toISOString())
        .lte("start_at", endOfNextMonth.toISOString())
        .eq("status", "approved")
        .order("start_at");

      reservations = reservationData || [];
    } else if (canManage) {
      // 관리자/선생님용: 전체 수업 조회 (학생, 강사, 장소 정보 포함)
      const { data: lessonData } = await supabase
        .from("lessons")
        .select(`
          *,
          student:profiles!lessons_student_id_fkey(id, name),
          instructor:profiles!lessons_instructor_id_fkey(id, name)
        `)
        .eq("group_id", params.id)
        .gte("scheduled_at", startOfMonth.toISOString())
        .lte("scheduled_at", endOfNextMonth.toISOString())
        .in("status", ["scheduled", "in_progress", "completed"])
        .order("scheduled_at");

      // 클래스 정보 매핑 (room_id -> room name)
      const classes = typedGroup.settings?.classes || [];
      lessons = (lessonData || []).map((lesson: any) => ({
        ...lesson,
        room: lesson.room_id ? classes.find((c) => c.id === lesson.room_id) : undefined,
      }));

      // 전체 예약 조회
      const { data: reservationData } = await supabase
        .from("room_reservations")
        .select("*")
        .eq("group_id", params.id)
        .gte("start_at", startOfMonth.toISOString())
        .lte("start_at", endOfNextMonth.toISOString())
        .eq("status", "approved")
        .order("start_at");

      reservations = reservationData || [];

      // 정규수업 스케줄 조회 (학생 멤버의 lesson_schedule)
      const { data: membersWithSchedule } = await supabase
        .from("group_members")
        .select(`
          user_id,
          lesson_schedule,
          instructor_id,
          user:profiles!group_members_user_id_fkey(id, name),
          instructor:profiles!group_members_instructor_id_fkey(id, name)
        `)
        .eq("group_id", params.id)
        .eq("status", "approved")
        .in("role", ["student", "guardian"]);

      // RegularSchedule 형식으로 변환
      (membersWithSchedule || []).forEach((member: any) => {
        const schedules = member.lesson_schedule || [];
        schedules.forEach((schedule: any) => {
          const roomInfo = schedule.room_id ? classes.find((c) => c.id === schedule.room_id) : undefined;
          regularSchedules.push({
            memberId: member.user_id,
            studentName: member.user?.name || "",
            instructorId: member.instructor_id,
            instructorName: member.instructor?.name,
            dayOfWeek: schedule.day_of_week,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            roomId: schedule.room_id,
            roomName: roomInfo?.name,
            subject: schedule.subject,
          });
        });
      });
    }
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Calendar - 패딩 없이 꽉 참 */}
      <div className="flex-1 h-full">
        <GroupCalendar
          events={events || []}
          groupId={params.id}
          classes={typedGroup.settings?.classes || []}
          lessons={lessons}
          reservations={reservations}
          regularSchedules={regularSchedules}
          hideAddButton={true}
          showLessonDetails={canManage}
          isOwner={isOwnerOrAdmin}
          hideReservationLabels={canManage}
          hasMultiInstructor={typedGroup.settings?.multi_instructor}
          currentUserId={user?.id}
        />
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 p-4 space-y-6 overflow-auto border-t lg:border-t-0 lg:border-l bg-background">
          {/* Quick Stats - 학생은 멤버 수 숨김 */}
          {!isStudent && (
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/groups/${params.id}/members`}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <Users className="h-5 w-5 text-muted-foreground mb-2" />
                <p className="text-2xl font-bold">{memberCount || 0}</p>
                <p className="text-xs text-muted-foreground">멤버</p>
              </Link>

              {isEducationType ? (
                <Link
                  href={`/groups/${params.id}/lessons`}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <GraduationCap className="h-5 w-5 text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">수업</p>
                </Link>
              ) : (
                <Link
                  href={`/groups/${params.id}/subgroups`}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <UsersRound className="h-5 w-5 text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-xs text-muted-foreground">소그룹</p>
                </Link>
              )}
            </div>
          )}

          {/* Student Schedule Section - for education type groups */}
          {isEducationType && isStudent && (
            <StudentScheduleSection groupId={params.id} />
          )}

          {/* Announcements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">공지사항</h2>
              <Link
                href={`/groups/${params.id}/announcements`}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center"
              >
                전체
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {announcements && announcements.length > 0 ? (
              <div className="space-y-2">
                {announcements.slice(0, 4).map((announcement) => (
                  <Link
                    key={announcement.id}
                    href={`/groups/${params.id}/announcements`}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    {announcement.is_pinned && (
                      <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{announcement.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">공지사항이 없습니다</p>
              </div>
            )}
          </div>

          {/* Invite Code */}
          {isOwnerOrAdmin && (
            <InviteCodeSection
              groupId={params.id}
              inviteCode={typedGroup.invite_code}
              codeType={typedGroup.settings?.invite_code_type || 'one_time'}
              isUsed={typedGroup.settings?.invite_code_used || false}
              expiryDate={typedGroup.settings?.invite_code_expiry}
            />
          )}

          {/* Settings Link */}
          {isOwnerOrAdmin && (
            <Link
              href={`/groups/${params.id}/settings`}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">모임 설정</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}
        </div>
    </div>
  );
}
