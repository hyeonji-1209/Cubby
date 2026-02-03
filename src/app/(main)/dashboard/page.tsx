import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  ChevronRight,
  GraduationCap,
  Heart,
  Users,
  Building2,
  Gamepad2,
  MoreHorizontal,
  Folder
} from "lucide-react";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";

const groupTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  education: GraduationCap,
  couple: Heart,
  family: Users,
  religion: Building2,
  hobby: Gamepad2,
  other: MoreHorizontal,
};

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

  const groupTypeLabels: Record<string, string> = {
    education: "교육/학원",
    couple: "연인",
    family: "가족",
    religion: "종교",
    hobby: "동호회",
    other: "기타",
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Calendar - 패딩 없이 꽉 참 */}
      <div className="flex-1 h-full">
        <DashboardCalendar events={events || []} groups={groups} />
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 p-4 space-y-6 overflow-auto border-t lg:border-t-0 lg:border-l bg-background">
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
                  const IconComponent = groupTypeIcons[group.type] || Folder;
                  return (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {groupTypeLabels[group.type] || "기타"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-xl">
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
            <div className="p-4 rounded-xl border">
              <p className="text-2xl font-bold">{groups.length}</p>
              <p className="text-xs text-muted-foreground">모임</p>
            </div>
            <div className="p-4 rounded-xl border">
              <p className="text-2xl font-bold">{events?.length || 0}</p>
              <p className="text-xs text-muted-foreground">일정</p>
            </div>
          </div>
        </div>
    </div>
  );
}
