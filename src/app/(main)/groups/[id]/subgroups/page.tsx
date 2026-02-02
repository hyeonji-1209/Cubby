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

interface SubgroupsPageProps {
  params: { id: string };
}

export default function SubgroupsPage({ params }: SubgroupsPageProps) {
  const [subgroups, setSubgroups] = useState<(SubGroup & { members?: User[] })[]>([]);
  const [members, setMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>("member");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 사용자 역할 확인
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", params.id)
      .eq("user_id", user?.id)
      .single();

    if (membership) {
      setUserRole(membership.role);
    }

    // 소그룹 로드
    const { data: subgroupData } = await supabase
      .from("subgroups")
      .select("*")
      .eq("group_id", params.id)
      .order("created_at", { ascending: false });

    // 멤버 목록 로드
    const { data: memberData } = await supabase
      .from("group_members")
      .select(`
        *,
        user:users(*)
      `)
      .eq("group_id", params.id)
      .eq("status", "approved");

    setSubgroups((subgroupData as (SubGroup & { members?: User[] })[]) || []);
    setMembers((memberData as (GroupMember & { user: User })[]) || []);
    setIsLoading(false);
  };

  const canManage = userRole === "owner" || userRole === "admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
        instructor_id: user?.id,
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
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const supabase = createClient();
    await supabase.from("subgroups").delete().eq("id", id);
    loadData();
    setOpenMenuId(null);
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
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">소그룹</h2>
        {canManage && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            소그룹 만들기
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              {editingId ? "소그룹 수정" : "새 소그룹 만들기"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 hover:bg-muted rounded"
            >
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
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                    selectedMembers.includes(member.user_id)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                    {(member.nickname || member.user?.name || "?")[0]}
                  </div>
                  <span className="text-sm truncate">
                    {member.nickname || member.user?.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
      )}

      {/* Subgroups List */}
      {subgroups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {subgroups.map((subgroup) => (
            <div
              key={subgroup.id}
              className="rounded-xl border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UsersRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{subgroup.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {subgroup.member_ids?.length || 0}명
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === subgroup.id ? null : subgroup.id
                        )
                      }
                      className="p-1 hover:bg-muted rounded"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {openMenuId === subgroup.id && (
                      <div className="absolute right-0 top-8 w-28 bg-background border rounded-lg shadow-lg py-1 z-10">
                        <button
                          onClick={() => handleEdit(subgroup)}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(subgroup.id)}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Member Avatars */}
              {subgroup.member_ids && subgroup.member_ids.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {subgroup.member_ids.slice(0, 6).map((memberId) => (
                    <div
                      key={memberId}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs"
                      title={getMemberName(memberId)}
                    >
                      {getMemberName(memberId)[0]}
                    </div>
                  ))}
                  {subgroup.member_ids.length > 6 && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                      +{subgroup.member_ids.length - 6}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border">
          <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">소그룹이 없습니다</p>
          {canManage && (
            <Button
              variant="link"
              onClick={() => setShowForm(true)}
              className="mt-2"
            >
              첫 소그룹을 만들어보세요
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
