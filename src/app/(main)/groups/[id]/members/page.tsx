"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  Shield,
  MoreVertical,
  UserMinus,
  UserCheck,
  UserX,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { GroupMember, User, MemberRole, Group } from "@/types";
import { Input } from "@/components/ui/input";
import { MemberApprovalModal } from "@/components/groups/member-approval-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_ICONS, ROLE_COLORS } from "@/lib/role-utils";
import { formatDateShort } from "@/lib/date-utils";

interface MembersPageProps {
  params: { id: string };
}

// 공유 상수 별칭 (기존 코드 호환)
const roleLabels = ROLE_LABELS;
const roleIcons = ROLE_ICONS;
const roleColors = ROLE_COLORS;

export default function MembersPage({ params }: MembersPageProps) {
  const { confirm } = useConfirm();

  const [members, setMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [pendingMembers, setPendingMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<MemberRole>("member");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [approvalMember, setApprovalMember] = useState<(GroupMember & { user: User }) | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<(GroupMember & { user: User }) | null>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: groupData } = await supabase
      .from("groups")
      .select("*")
      .eq("id", params.id)
      .single();

    if (groupData) {
      setGroup(groupData as Group);
    }

    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", params.id)
      .eq("user_id", user?.id)
      .single();

    if (membership) {
      setUserRole(membership.role as MemberRole);
    }

    const { data: approvedData } = await supabase
      .from("group_members")
      .select(`
        *,
        user:users(*)
      `)
      .eq("group_id", params.id)
      .eq("status", "approved")
      .order("created_at");

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
    if (group?.type === "education") {
      setApprovalMember(member);
      setShowApprovalModal(true);
    } else {
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
    const confirmed = await confirm({
      title: "가입 거절",
      message: "가입 신청을 거절하시겠습니까?",
      confirmText: "거절",
      variant: "destructive",
    });
    if (!confirmed) return;

    const supabase = createClient();
    await supabase
      .from("group_members")
      .update({ status: "rejected" })
      .eq("id", memberId);
    loadData();
  };

  const handleRemove = async (memberId: string) => {
    const confirmed = await confirm({
      title: "멤버 내보내기",
      message: "멤버를 내보내시겠습니까?",
      confirmText: "내보내기",
      variant: "destructive",
    });
    if (!confirmed) return;

    const supabase = createClient();
    await supabase.from("group_members").delete().eq("id", memberId);
    loadData();
    setOpenMenuId(null);
    if (selectedMember?.id === memberId) {
      setSelectedMember(null);
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h2 className="text-lg font-semibold">멤버 ({members.length})</h2>
        {canManage && pendingMembers.length > 0 && (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            대기 {pendingMembers.length}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="멤버 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Table / List */}
        <div className={`overflow-auto ${selectedMember ? "hidden md:block md:w-80 lg:w-96 border-r" : "flex-1"}`}>
          {/* Pending Members */}
          {canManage && pendingMembers.length > 0 && (
            <div className="p-4 bg-yellow-50/50 dark:bg-yellow-950/10 border-b">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                가입 대기 ({pendingMembers.length})
              </h3>
              <div className="space-y-2">
                {pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-md bg-background border"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                        {(member.nickname || member.user?.name || "?")[0]}
                      </div>
                      <span className="text-sm">{member.nickname || member.user?.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleReject(member.id)}>
                        <UserX className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(member)}>
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredMembers.length > 0 ? (
            selectedMember ? (
              // 심플 리스트 (선택 시)
              <div className="divide-y">
                {filteredMembers.map((member) => {
                  const isSelected = selectedMember?.id === member.id;
                  const RoleIcon = roleIcons[member.role];
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "p-3 cursor-pointer",
                        isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                          {member.user?.avatar_url ? (
                            <img src={member.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (member.nickname || member.user?.name || "?")[0]
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.nickname || member.user?.name}</p>
                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]", roleColors[member.role])}>
                            <RoleIcon className="h-2.5 w-2.5" />
                            {roleLabels[member.role]}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // 풀 테이블 (선택 없을 시)
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-3 px-4 font-medium">이름</th>
                    <th className="py-3 px-4 font-medium w-24 text-center">역할</th>
                    <th className="py-3 px-4 font-medium w-28 text-center hidden md:table-cell">가입일</th>
                    {canManage && <th className="py-3 px-4 font-medium w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMembers.map((member) => {
                    const RoleIcon = roleIcons[member.role];
                    return (
                      <tr
                        key={member.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedMember(member)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                              {member.user?.avatar_url ? (
                                <img src={member.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                (member.nickname || member.user?.name || "?")[0]
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{member.nickname || member.user?.name}</p>
                              {member.nickname && member.user?.name && (
                                <p className="text-xs text-muted-foreground">{member.user.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs", roleColors[member.role])}>
                            <RoleIcon className="h-3 w-3" />
                            {roleLabels[member.role]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground hidden md:table-cell">
                          {formatDateShort(member.created_at)}
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {member.role !== "owner" && (
                              <div className="relative">
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {openMenuId === member.id && (
                                  <div className="absolute right-0 top-8 w-32 bg-background border rounded-lg shadow-lg py-1 z-20">
                                    {userRole === "owner" && (
                                      <button
                                        onClick={() => handleChangeRole(member.id, member.role === "admin" ? "member" : "admin")}
                                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                      >
                                        <Shield className="h-3.5 w-3.5" />
                                        {member.role === "admin" ? "관리자 해제" : "관리자 지정"}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemove(member.id)}
                                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                    >
                                      <UserMinus className="h-3.5 w-3.5" />
                                      내보내기
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-50" />
              <p>{searchQuery ? "검색 결과가 없습니다" : "멤버가 없습니다"}</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedMember && (
          <div className="flex-1 flex flex-col bg-background overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs", roleColors[selectedMember.role])}>
                {(() => { const RoleIcon = roleIcons[selectedMember.role]; return <RoleIcon className="h-3 w-3" />; })()}
                {roleLabels[selectedMember.role]}
              </span>
              <div className="flex items-center gap-1">
                {canManage && selectedMember.role !== "owner" && (
                  <>
                    {userRole === "owner" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangeRole(selectedMember.id, selectedMember.role === "admin" ? "member" : "admin")}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {selectedMember.role === "admin" ? "관리자 해제" : "관리자 지정"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(selectedMember.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                  </>
                )}
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-1.5 hover:bg-muted rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl mb-3">
                  {selectedMember.user?.avatar_url ? (
                    <img src={selectedMember.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (selectedMember.nickname || selectedMember.user?.name || "?")[0]
                  )}
                </div>
                <h3 className="text-lg font-semibold">{selectedMember.nickname || selectedMember.user?.name}</h3>
                {selectedMember.nickname && selectedMember.user?.name && (
                  <p className="text-sm text-muted-foreground">{selectedMember.user.name}</p>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">이메일</span>
                  <span>{selectedMember.user?.email || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">가입일</span>
                  <span>{formatDateShort(selectedMember.created_at)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">역할</span>
                  <span>{roleLabels[selectedMember.role]}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
