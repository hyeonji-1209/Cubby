import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupNavigation } from "@/components/groups/group-navigation";
import { GroupLayoutWrapper } from "@/components/groups/group-layout-wrapper";
import { Group, GroupMember } from "@/types";

interface GroupLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function GroupLayout({ children, params }: GroupLayoutProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 그룹 + 멤버십 조회 (병렬)
  const [groupResult, membershipResult] = await Promise.all([
    supabase.from("groups").select("*").eq("id", params.id).single(),
    supabase.from("group_members").select("*").eq("group_id", params.id).eq("user_id", user.id).single(),
  ]);

  if (groupResult.error || !groupResult.data) {
    notFound();
  }

  if (membershipResult.error || !membershipResult.data || membershipResult.data.status !== "approved") {
    redirect("/dashboard");
  }

  const group = groupResult.data;
  const membership = membershipResult.data;

  // 대기 중 멤버 수 조회 (관리자만)
  let pendingMemberCount = 0;
  if (membership.is_owner) {
    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", params.id)
      .eq("status", "pending");
    pendingMemberCount = count || 0;
  }

  return (
    <GroupLayoutWrapper group={group as Group} membership={membership as GroupMember}>
      <div className="h-full flex flex-col">
        <GroupNavigation
          group={group as Group}
          membership={membership as GroupMember}
          pendingMemberCount={pendingMemberCount}
        />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </GroupLayoutWrapper>
  );
}
