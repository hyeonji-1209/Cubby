"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Plus, ChevronRight, Loader2 } from "lucide-react";
import { JoinGroupModal } from "@/components/groups/join-group-modal";
import { Group } from "@/types";

const groupTypeLabels: Record<string, string> = {
  education: "교육/학원",
  couple: "연인",
  family: "가족",
  religion: "종교",
  hobby: "동호회",
  other: "기타",
};

const groupTypeIcons: Record<string, string> = {
  education: "📚",
  couple: "❤️",
  family: "👨‍👩‍👧‍👦",
  religion: "🙏",
  hobby: "🎯",
  other: "📌",
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<(Group & { role: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [hasCoupleGroup, setHasCoupleGroup] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: memberships } = await supabase
      .from("group_members")
      .select(`
        *,
        group:groups(*)
      `)
      .eq("user_id", user?.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    const groupList = memberships?.map((m) => ({
      ...m.group,
      role: m.role,
    })) || [];

    setGroups(groupList as (Group & { role: string })[]);
    setHasCoupleGroup(groupList.some((g) => g.type === "couple"));
    setIsLoading(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 모임</h1>
          <p className="text-muted-foreground text-sm">
            참여 중인 모임을 관리하세요
          </p>
        </div>
      </div>

      {/* Create Group Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/groups/create?type=education"
          className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <span className="text-2xl">📚</span>
          <span className="text-sm font-medium">교육/학원</span>
        </Link>

        {!hasCoupleGroup && (
          <Link
            href="/groups/create?type=couple"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-pink-500/30 hover:border-pink-500 hover:bg-pink-500/5 transition-colors"
          >
            <span className="text-2xl">❤️</span>
            <span className="text-sm font-medium">연인</span>
          </Link>
        )}

        <Link
          href="/groups/create?type=family"
          className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-green-500/30 hover:border-green-500 hover:bg-green-500/5 transition-colors"
        >
          <span className="text-2xl">👨‍👩‍👧‍👦</span>
          <span className="text-sm font-medium">가족</span>
        </Link>

        <Link
          href="/groups/create?type=hobby"
          className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 transition-colors"
        >
          <span className="text-2xl">🎯</span>
          <span className="text-sm font-medium">동호회</span>
        </Link>
      </div>

      {/* Groups List */}
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                      {group.icon || groupTypeIcons[group.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{group.name}</p>
                        {group.role === "owner" && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            소유자
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {groupTypeLabels[group.type]}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              아직 참여 중인 모임이 없습니다
            </p>
            <p className="text-sm text-muted-foreground">
              위에서 모임 타입을 선택해 새 모임을 만들어보세요
            </p>
          </CardContent>
        </Card>
      )}

      {/* Join with Code */}
      <Card>
        <CardContent className="p-4">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-medium">초대코드로 참여</p>
                <p className="text-sm text-muted-foreground">
                  초대코드가 있다면 여기서 입력하세요
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Join Modal */}
      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          loadGroups();
        }}
      />
    </div>
  );
}
