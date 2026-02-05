import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronRight, BookOpen, Calendar, Clock } from "lucide-react";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { GROUP_TYPE_ICONS, GROUP_TYPE_LABELS, DEFAULT_GROUP_ICON } from "@/lib/group-utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 사용자의 모임 목록 조회
  const { data: memberships } = await supabase
    .from("group_members")
    .select(`
      *,
      group:groups(*)
    `)
    .eq("user_id", user?.id)
    .eq("status", "approved");

  const groups = memberships?.map((m) => m.group) || [];

  // 이번 달 + 다음 달 일정 조회
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user?.id)
    .gte("start_at", startOfMonth.toISOString())
    .lte("start_at", endOfNextMonth.toISOString())
    .order("start_at");

  // Get student's lessons for calendar (month range)
  const { data: calendarLessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("student_id", user?.id)
    .gte("scheduled_at", startOfMonth.toISOString())
    .lte("scheduled_at", endOfNextMonth.toISOString())
    .in("status", ["scheduled", "in_progress", "completed"])
    .order("scheduled_at");

  // Get student's reservations for calendar (month range)
  const { data: calendarReservations } = await supabase
    .from("room_reservations")
    .select("*")
    .eq("reserved_by", user?.id)
    .gte("start_at", startOfMonth.toISOString())
    .lte("start_at", endOfNextMonth.toISOString())
    .eq("status", "approved")
    .order("start_at");

  // Get student's upcoming lessons for sidebar (limited to 5)
  const { data: upcomingLessons } = await supabase
    .from("lessons")
    .select(`
      *,
      group:groups(id, name, icon)
    `)
    .eq("student_id", user?.id)
    .gte("scheduled_at", now.toISOString())
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_at")
    .limit(5);

  // Get student's upcoming reservations for sidebar (limited to 5)
  const { data: upcomingReservations } = await supabase
    .from("room_reservations")
    .select(`
      *,
      group:groups(id, name, icon)
    `)
    .eq("reserved_by", user?.id)
    .gte("start_at", now.toISOString())
    .eq("status", "approved")
    .order("start_at")
    .limit(5);

  // Check if user has any student roles (to show the schedule section)
  const hasStudentSchedules = (upcomingLessons?.length || 0) > 0 || (upcomingReservations?.length || 0) > 0;

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Calendar - 패딩 없이 꽉 참 */}
      <div className="flex-1 h-full">
        <DashboardCalendar
          events={events || []}
          groups={groups}
          lessons={calendarLessons || []}
          reservations={calendarReservations || []}
        />
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 p-4 space-y-6 overflow-auto border-t lg:border-t-0 lg:border-l bg-background">
          {/* Upcoming Schedules for Students */}
          {hasStudentSchedules && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  다가오는 일정
                </h2>
              </div>
              <div className="space-y-2">
                {/* Upcoming Lessons */}
                {upcomingLessons?.map((lesson) => (
                  <Link
                    key={`lesson-${lesson.id}`}
                    href={`/groups/${lesson.group_id}/lessons`}
                    className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-blue-700 dark:text-blue-400">
                        수업 ({lesson.duration_minutes || 60}분)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(lesson.scheduled_at), "M월 d일 (EEE) HH:mm", { locale: ko })}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {lesson.group?.name}
                      </p>
                    </div>
                  </Link>
                ))}

                {/* Upcoming Reservations */}
                {upcomingReservations?.map((reservation) => (
                  <Link
                    key={`res-${reservation.id}`}
                    href={`/groups/${reservation.group_id}/reservations`}
                    className="flex items-start gap-3 p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-purple-700 dark:text-purple-400">
                        연습실 예약
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(reservation.start_at), "M월 d일 (EEE) HH:mm", { locale: ko })}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {reservation.group?.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* My Groups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">내 모임</h2>
              <Link
                href="/groups"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center"
              >
                전체
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {groups.length > 0 ? (
              <div className="space-y-2">
                {groups.slice(0, 5).map((group) => {
                  const IconComponent = GROUP_TYPE_ICONS[group.type] || DEFAULT_GROUP_ICON;
                  return (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {group.icon ? (
                          group.icon.startsWith("http") ? (
                            <img
                              src={group.icon}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">{group.icon}</span>
                          )
                        ) : (
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {GROUP_TYPE_LABELS[group.type] || "기타"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  참여 중인 모임이 없어요
                </p>
                <Link
                  href="/groups/create"
                  className="text-sm text-primary hover:underline"
                >
                  모임 만들기
                </Link>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border">
              <p className="text-2xl font-bold">{groups.length}</p>
              <p className="text-xs text-muted-foreground">모임</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-2xl font-bold">{events?.length || 0}</p>
              <p className="text-xs text-muted-foreground">일정</p>
            </div>
          </div>

          {/* Actions */}
          <DashboardActions />
        </div>
    </div>
  );
}
