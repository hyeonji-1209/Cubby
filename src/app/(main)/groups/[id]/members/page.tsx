"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  MoreVertical,
  UserMinus,
  UserCheck,
  UserX,
  Loader2,
  Search,
  X,
  Crown,
  Clock,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { GroupMember, User, MemberRole, Group, Lesson, LessonSchedule } from "@/types";
import { Input } from "@/components/ui/input";
import { MemberApprovalModal } from "@/components/groups/member-approval-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/role-utils";
import { formatDateShort, WEEKDAYS_KO } from "@/lib/date-utils";
import { useUser } from "@/lib/contexts/user-context";

interface MembersPageProps {
  params: { id: string };
}

export default function MembersPage({ params }: MembersPageProps) {
  const { confirm } = useConfirm();
  const { user: currentUser } = useUser();

  const [members, setMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [pendingMembers, setPendingMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [approvalMember, setApprovalMember] = useState<(GroupMember & { user: User }) | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<(GroupMember & { user: User }) | null>(null);

  // 선택된 멤버 관련 데이터
  const [assignedStudents, setAssignedStudents] = useState<(GroupMember & { user: User })[]>([]);
  const [instructorInfo, setInstructorInfo] = useState<(GroupMember & { user: User }) | null>(null);
  const [lessonHistory, setLessonHistory] = useState<Lesson[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [params.id, currentUser?.id]);

  // 선택된 멤버가 변경되면 관련 데이터 로드
  useEffect(() => {
    if (selectedMember) {
      loadMemberDetail(selectedMember);
    }
  }, [selectedMember?.id]);

  const loadData = async () => {
    if (!currentUser) return;

    const supabase = createClient();

    // 멤버 데이터만 조회 (group은 layout에서 이미 조회됨)
    const [membershipResult, approvedResult, pendingResult] = await Promise.all([
      supabase
        .from("group_members")
        .select("is_owner, group:groups(*)")
        .eq("group_id", params.id)
        .eq("user_id", currentUser.id)
        .single(),
      supabase
        .from("group_members")
        .select(`*, user:profiles!user_id(*)`)
        .eq("group_id", params.id)
        .eq("status", "approved")
        .order("created_at"),
      supabase
        .from("group_members")
        .select(`*, user:profiles!user_id(*)`)
        .eq("group_id", params.id)
        .eq("status", "pending")
        .order("created_at"),
    ]);

    if (membershipResult.data) {
      setIsOwner(membershipResult.data.is_owner || false);
      if (membershipResult.data.group) {
        setGroup(membershipResult.data.group as Group);
      }
    }

    setMembers((approvedResult.data as (GroupMember & { user: User })[]) || []);
    setPendingMembers((pendingResult.data as (GroupMember & { user: User })[]) || []);
    setIsLoading(false);
  };

  // 선택된 멤버의 상세 데이터 로드
  const loadMemberDetail = async (member: GroupMember & { user: User }) => {
    setIsLoadingDetail(true);
    const supabase = createClient();

    if (member.role === "instructor") {
      // 강사: 담당 학생들 조회
      const { data: students } = await supabase
        .from("group_members")
        .select(`*, user:profiles!user_id(*)`)
        .eq("group_id", params.id)
        .eq("instructor_id", member.user_id)
        .eq("status", "approved")
        .order("nickname");

      setAssignedStudents((students as (GroupMember & { user: User })[]) || []);
      setInstructorInfo(null);
      setLessonHistory([]);
    } else if (member.role === "student") {
      // 학생: 담당 강사 정보 조회
      if (member.instructor_id) {
        const instructor = members.find(m => m.user_id === member.instructor_id);
        setInstructorInfo(instructor || null);
      } else {
        setInstructorInfo(null);
      }

      // 학생의 수업 이력 조회
      const { data: lessons } = await supabase
        .from("lessons")
        .select("*")
        .eq("group_id", params.id)
        .eq("student_id", member.user_id)
        .order("scheduled_at", { ascending: false })
        .limit(20);

      setLessonHistory((lessons as Lesson[]) || []);
      setAssignedStudents([]);
    } else {
      setAssignedStudents([]);
      setInstructorInfo(null);
      setLessonHistory([]);
    }

    setIsLoadingDetail(false);
  };

  const canManage = isOwner;

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

  const handleToggleOwner = async (memberId: string, currentIsOwner: boolean) => {
    // max_owners 체크
    if (!currentIsOwner && group?.settings?.max_owners) {
      const ownerCount = members.filter(m => m.is_owner).length;
      if (ownerCount >= group.settings.max_owners) {
        alert(`관리자는 최대 ${group.settings.max_owners}명까지만 지정할 수 있습니다.`);
        return;
      }
    }

    const supabase = createClient();
    await supabase
      .from("group_members")
      .update({ is_owner: !currentIsOwner })
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
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium truncate">{member.nickname || member.user?.name}</p>
                            {member.is_owner && <Crown className="h-3 w-3 text-yellow-500" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {ROLE_LABELS[member.role]}
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
                    <th className="py-3 px-4 font-medium">이름</th>
                    <th className="py-3 px-4 font-medium w-24 text-center">role</th>
                    <th className="py-3 px-4 font-medium w-28 text-center hidden md:table-cell">가입일</th>
                    {canManage && <th className="py-3 px-4 font-medium w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMembers.map((member) => {
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
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              {ROLE_LABELS[member.role]}
                            </span>
                            {member.is_owner && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-yellow-600 dark:text-yellow-400">
                                <Crown className="h-2.5 w-2.5" />
                                관리자
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground hidden md:table-cell">
                          {formatDateShort(member.created_at)}
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {openMenuId === member.id && (
                                <div className="absolute right-0 top-8 w-36 bg-background border rounded-lg shadow-lg py-1 z-20">
                                  {member.role === "instructor" && (
                                    <button
                                      onClick={() => handleToggleOwner(member.id, member.is_owner)}
                                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                    >
                                      <Crown className="h-3.5 w-3.5" />
                                      {member.is_owner ? "관리자 해제" : "관리자 지정"}
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
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{ROLE_LABELS[selectedMember.role]}</span>
                {selectedMember.is_owner && (
                  <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <Crown className="h-3.5 w-3.5" />
                    관리자
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {canManage && (
                  <>
                    {selectedMember.role === "instructor" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleOwner(selectedMember.id, selectedMember.is_owner)}
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        {selectedMember.is_owner ? "관리자 해제" : "관리자 지정"}
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
              {/* 기본 정보 */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl mb-2">
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

              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* 강사 상세 */}
                  {selectedMember.role === "instructor" && (
                    <div className="space-y-4">
                      {/* 담당 학생 목록 */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          담당 학생 ({assignedStudents.length})
                        </h4>
                        {assignedStudents.length > 0 ? (
                          <div className="space-y-2">
                            {assignedStudents.map((student) => (
                              <div
                                key={student.id}
                                className="p-3 rounded-lg border bg-muted/30"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">
                                    {student.nickname || student.user?.name}
                                  </span>
                                </div>
                                {/* 수업 시간 */}
                                {student.lesson_schedule && (student.lesson_schedule as LessonSchedule[]).length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {(student.lesson_schedule as LessonSchedule[]).map((schedule, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary"
                                      >
                                        {WEEKDAYS_KO[schedule.day_of_week]} {schedule.start_time}~{schedule.end_time}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            담당 학생이 없습니다
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 학생 상세 */}
                  {selectedMember.role === "student" && (
                    <div className="space-y-4">
                      {/* 담당 강사 */}
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">담당 강사</span>
                        <span className="text-sm font-medium">
                          {instructorInfo?.nickname || instructorInfo?.user?.name || "-"}
                        </span>
                      </div>

                      {/* 수업 시간 */}
                      {selectedMember.lesson_schedule && (selectedMember.lesson_schedule as LessonSchedule[]).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            수업 시간
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(selectedMember.lesson_schedule as LessonSchedule[]).map((schedule, idx) => (
                              <span
                                key={idx}
                                className="text-sm px-3 py-1 rounded-lg bg-primary/10 text-primary"
                              >
                                {WEEKDAYS_KO[schedule.day_of_week]} {schedule.start_time}~{schedule.end_time}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 수업 이력 */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          수업 이력
                        </h4>
                        {lessonHistory.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-2 px-3 font-medium">수업</th>
                                  <th className="py-2 px-3 font-medium hidden sm:table-cell">내용</th>
                                  <th className="py-2 px-3 font-medium hidden md:table-cell">과제</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {lessonHistory.map((lesson) => {
                                  const lessonDate = new Date(lesson.scheduled_at);
                                  const dateStr = `${lessonDate.getMonth() + 1}/${lessonDate.getDate()}`;
                                  return (
                                    <tr key={lesson.id} className="hover:bg-muted/30">
                                      <td className="py-2 px-3">
                                        <div className="font-medium">
                                          {selectedMember.nickname || selectedMember.user?.name}_{dateStr}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {lessonDate.toLocaleDateString("ko-KR", {
                                            month: "short",
                                            day: "numeric",
                                            weekday: "short",
                                          })}
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 hidden sm:table-cell">
                                        <p className="text-muted-foreground line-clamp-2">
                                          {lesson.content || "-"}
                                        </p>
                                      </td>
                                      <td className="py-2 px-3 hidden md:table-cell">
                                        <p className="text-muted-foreground line-clamp-2">
                                          {lesson.homework || "-"}
                                        </p>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            수업 이력이 없습니다
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 보호자/기타 역할 */}
                  {selectedMember.role !== "instructor" && selectedMember.role !== "student" && (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">이메일</span>
                        <span>{selectedMember.user?.email || "-"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">가입일</span>
                        <span>{formatDateShort(selectedMember.created_at)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
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
