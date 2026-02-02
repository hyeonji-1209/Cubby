"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  Shield,
  Crown,
  MoreVertical,
  UserMinus,
  UserCheck,
  UserX,
  Loader2,
  Search,
  GraduationCap,
} from "lucide-react";
import { GroupMember, User, MemberRole, Group } from "@/types";
import { Input } from "@/components/ui/input";
import { MemberApprovalModal } from "@/components/groups/member-approval-modal";

interface MembersPageProps {
  params: { id: string };
}

const roleLabels: Record<MemberRole, string> = {
  owner: "오너",
  admin: "관리자",
  instructor: "강사",
  guardian: "보호자",
  member: "멤버",
};

const roleIcons: Record<MemberRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  instructor: GraduationCap,
  guardian: Users,
  member: Users,
};

export default function MembersPage({ params }: MembersPageProps) {
  const [members, setMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [pendingMembers, setPendingMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<MemberRole>("member");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [approvalMember, setApprovalMember] = useState<(GroupMember & { user: User }) | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 그룹 정보 로드
    const { data: groupData } = await supabase
      .from("groups")
      .select("*")
      .eq("id", params.id)
      .single();

    if (groupData) {
      setGroup(groupData as Group);
    }

    // 사용자 역할 확인
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", params.id)
      .eq("user_id", user?.id)
      .single();

    if (membership) {
      setUserRole(membership.role as MemberRole);
    }

    // 승인된 멤버 로드
    const { data: approvedData } = await supabase
      .from("group_members")
      .select(`
        *,
        user:users(*)
      `)
      .eq("group_id", params.id)
      .eq("status", "approved")
      .order("created_at");

    // 대기중인 멤버 로드
    const { data: pendingData } = await supabase
      .from("group_members")
      .select(`
        *,
        user:users(*)
      `)
      .eq("group_id", params.id)
      .eq("status", "pending")
      .order("created_at");

    setMembers((approvedData as (GroupMember & { user: User })[]) || []);
    setPendingMembers((pendingData as (GroupMember & { user: User })[]) || []);
    setIsLoading(false);
  };

  const canManage = userRole === "owner" || userRole === "admin";

  const handleApprove = (member: GroupMember & { user: User }) => {
    // 교육 타입이면 모달 표시
    if (group?.type === "education") {
      setApprovalMember(member);
      setShowApprovalModal(true);
    } else {
      // 그 외에는 바로 승인
      handleSimpleApprove(member.id);
    }
  };

  const handleSimpleApprove = async (memberId: string) => {
    const supabase = createClient();
    await supabase
      .from("group_members")
      .update({ status: "approved" })
      .eq("id", memberId);
    loadData();
  };

  const handleReject = async (memberId: string) => {
    if (!confirm("가입 신청을 거절하시겠습니까?")) return;

    const supabase = createClient();
    await supabase
      .from("group_members")
      .update({ status: "rejected" })
      .eq("id", memberId);
    loadData();
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("멤버를 내보내시겠습니까?")) return;

    const supabase = createClient();
    await supabase.from("group_members").delete().eq("id", memberId);
    loadData();
    setOpenMenuId(null);
  };

  const handleChangeRole = async (memberId: string, newRole: MemberRole) => {
    const supabase = createClient();
    await supabase
      .from("group_members")
      .update({ role: newRole })
      .eq("id", memberId);
    loadData();
    setOpenMenuId(null);
  };

  const filteredMembers = members.filter((member) => {
    const name = member.nickname || member.user?.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 역할별 그룹핑
  const groupedMembers = {
    owner: filteredMembers.filter((m) => m.role === "owner"),
    admin: filteredMembers.filter((m) => m.role === "admin"),
    instructor: filteredMembers.filter((m) => m.role === "instructor"),
    guardian: filteredMembers.filter((m) => m.role === "guardian"),
    member: filteredMembers.filter((m) => m.role === "member"),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">멤버 ({members.length})</h2>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="멤버 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pending Members */}
      {canManage && pendingMembers.length > 0 && (
        <div className="rounded-xl border p-4 bg-yellow-500/5 border-yellow-500/20">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            가입 대기 ({pendingMembers.length})
          </h3>
          <div className="space-y-2">
            {pendingMembers.map((member) => {
              const RoleIcon = roleIcons[member.role];
              return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {(member.nickname || member.user?.name || "?")[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.nickname || member.user?.name}
                      </p>
                      {group?.type === "education" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-muted">
                          <RoleIcon className="h-3 w-3" />
                          {roleLabels[member.role]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(member.id)}
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(member)}>
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members List by Role */}
      {(["owner", "admin", "instructor", "guardian", "member"] as MemberRole[]).map(
        (role) => {
          const roleMembers = groupedMembers[role];
          if (roleMembers.length === 0) return null;

          const RoleIcon = roleIcons[role];

          return (
            <div key={role}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <RoleIcon className="h-4 w-4" />
                {roleLabels[role]} ({roleMembers.length})
              </h3>
              <div className="space-y-2">
                {roleMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {member.user?.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (member.nickname || member.user?.name || "?")[0]
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.nickname || member.user?.name}
                          </p>
                          {member.role === "owner" && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        {member.nickname && member.user?.name && (
                          <p className="text-sm text-muted-foreground">
                            {member.user.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {canManage && member.role !== "owner" && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === member.id ? null : member.id
                            )
                          }
                          className="p-2 hover:bg-muted rounded"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openMenuId === member.id && (
                          <div className="absolute right-0 top-10 w-36 bg-background border rounded-lg shadow-lg py-1 z-10">
                            {userRole === "owner" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleChangeRole(
                                      member.id,
                                      member.role === "admin" ? "member" : "admin"
                                    )
                                  }
                                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                >
                                  <Shield className="h-4 w-4" />
                                  {member.role === "admin"
                                    ? "관리자 해제"
                                    : "관리자 지정"}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleRemove(member.id)}
                              className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                            >
                              <UserMinus className="h-4 w-4" />
                              내보내기
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }
      )}

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 rounded-xl border">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">검색 결과가 없습니다</p>
        </div>
      )}

      {/* 승인 모달 */}
      {group && (
        <MemberApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setApprovalMember(null);
          }}
          onSuccess={loadData}
          member={approvalMember}
          group={group}
          instructors={members.filter((m) => m.role === "instructor")}
        />
      )}
    </div>
  );
}
