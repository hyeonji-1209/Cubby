import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupNavigation } from "@/components/groups/group-navigation";
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

  return (
    <div className="h-full flex flex-col">
      {/* Group Navigation */}
      <GroupNavigation
        group={group as Group}
        membership={membership as GroupMember}
      />

      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
