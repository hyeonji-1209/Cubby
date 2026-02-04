"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UsersRound,
  Plus,
  X,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { SubGroup, GroupMember, User } from "@/types";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/date-utils";
import { useUser } from "@/lib/contexts/user-context";
import { useGroup } from "@/lib/contexts/group-context";

interface SubgroupsPageProps {
  params: { id: string };
}

export default function SubgroupsPage({ params }: SubgroupsPageProps) {
  const { confirm } = useConfirm();
  const { user: currentUser } = useUser();
  const { isOwner } = useGroup();

  const [subgroups, setSubgroups] = useState<(SubGroup & { members?: User[] })[]>([]);
  const [members, setMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<(SubGroup & { members?: User[] }) | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [params.id, currentUser?.id]);

  const loadData = async () => {
    if (!currentUser) return;

    const supabase = createClient();

    // 병렬로 소그룹과 멤버 데이터 조회
    const [subgroupResult, memberResult] = await Promise.all([
      supabase
        .from("subgroups")
        .select("*")
        .eq("group_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("group_members")
        .select(`*, user:profiles!user_id(*)`)
        .eq("group_id", params.id)
        .eq("status", "approved"),
    ]);

    setSubgroups((subgroupResult.data as (SubGroup & { members?: User[] })[]) || []);
    setMembers((memberResult.data as (GroupMember & { user: User })[]) || []);
    setIsLoading(false);
  };

  const canManage = isOwner;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    setIsSubmitting(true);
    const supabase = createClient();

    if (editingId) {
      await supabase
        .from("subgroups")
        .update({
          name: name.trim(),
          member_ids: selectedMembers,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);
    } else {
      await supabase.from("subgroups").insert({
        group_id: params.id,
        name: name.trim(),
        instructor_id: currentUser.id,
        member_ids: selectedMembers,
        lesson_schedule: [],
      });
    }

    resetForm();
    loadData();
  };

  const handleEdit = (subgroup: SubGroup) => {
    setEditingId(subgroup.id);
    setName(subgroup.name);
    setSelectedMembers(subgroup.member_ids || []);
    setShowForm(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "소그룹 삭제",
      message: "정말 삭제하시겠습니까?",
      confirmText: "삭제",
      variant: "destructive",
    });
    if (!confirmed) return;

    const supabase = createClient();
    await supabase.from("subgroups").delete().eq("id", id);
    loadData();
    setOpenMenuId(null);
    if (selectedSubgroup?.id === id) {
      setSelectedSubgroup(null);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setSelectedMembers([]);
    setIsSubmitting(false);
  };

  const getMemberName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.nickname || member?.user?.name || "알 수 없음";
  };


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
        <h2 className="text-lg font-semibold">소그룹 ({subgroups.length})</h2>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            소그룹 만들기
          </Button>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={resetForm} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-background rounded-lg p-6 w-full max-w-md mx-4 space-y-4 max-h-[80vh] overflow-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {editingId ? "소그룹 수정" : "새 소그룹 만들기"}
              </h3>
              <button type="button" onClick={resetForm} className="p-1 hover:bg-muted rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <Input
              placeholder="소그룹 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div>
              <label className="text-sm font-medium mb-2 block">멤버 선택</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.user_id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border text-left",
                      selectedMembers.includes(member.user_id)
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
                      {(member.nickname || member.user?.name || "?")[0]}
                    </div>
                    <span className="text-sm truncate">
                      {member.nickname || member.user?.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "수정"
                ) : (
                  "만들기"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Table / List */}
        <div className={`overflow-auto ${selectedSubgroup ? "hidden md:block md:w-80 lg:w-96 border-r" : "flex-1"}`}>
          {subgroups.length > 0 ? (
            selectedSubgroup ? (
              // 심플 리스트 (선택 시)
              <div className="divide-y">
                {subgroups.map((subgroup) => {
                  const isSelected = selectedSubgroup?.id === subgroup.id;
                  return (
                    <div
                      key={subgroup.id}
                      className={cn(
                        "p-3 cursor-pointer",
                        isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedSubgroup(subgroup)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <UsersRound className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{subgroup.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {subgroup.member_ids?.length || 0}명
                          </p>
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
                    <th className="py-3 px-4 font-medium">소그룹명</th>
                    <th className="py-3 px-4 font-medium w-24 text-center">
                      <Users className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="py-3 px-4 font-medium w-28 text-center hidden md:table-cell">생성일</th>
                    {canManage && <th className="py-3 px-4 font-medium w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subgroups.map((subgroup) => (
                    <tr
                      key={subgroup.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedSubgroup(subgroup)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <UsersRound className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{subgroup.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">
                        {subgroup.member_ids?.length || 0}명
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground hidden md:table-cell">
                        {formatDateShort(subgroup.created_at)}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === subgroup.id ? null : subgroup.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openMenuId === subgroup.id && (
                              <div className="absolute right-0 top-8 w-28 bg-background border rounded-lg shadow-lg py-1 z-20">
                                <button
                                  onClick={() => handleEdit(subgroup)}
                                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDelete(subgroup.id)}
                                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <UsersRound className="h-12 w-12 mb-3 opacity-50" />
              <p>소그룹이 없습니다</p>
              {canManage && (
                <Button variant="link" onClick={() => setShowForm(true)} className="mt-2">
                  첫 소그룹을 만들어보세요
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedSubgroup && (
          <div className="flex-1 flex flex-col bg-background overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UsersRound className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">{selectedSubgroup.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                {canManage && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(selectedSubgroup)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(selectedSubgroup.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                  </>
                )}
                <button
                  onClick={() => setSelectedSubgroup(null)}
                  className="p-1.5 hover:bg-muted rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">생성일</p>
                <p className="text-sm">{formatDateShort(selectedSubgroup.created_at)}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">
                  멤버 ({selectedSubgroup.member_ids?.length || 0})
                </p>
                {selectedSubgroup.member_ids && selectedSubgroup.member_ids.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSubgroup.member_ids.map((memberId) => {
                      const member = members.find((m) => m.user_id === memberId);
                      return (
                        <div
                          key={memberId}
                          className="flex items-center gap-3 p-2 rounded-md border"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                            {getMemberName(memberId)[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{getMemberName(memberId)}</p>
                            {member?.user?.email && (
                              <p className="text-xs text-muted-foreground">{member.user.email}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    멤버가 없습니다
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
