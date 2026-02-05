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
  Trash2,
} from "lucide-react";
import { GroupMember, User, MemberRole, Lesson, LessonSchedule, Attendance } from "@/types";
import { Input } from "@/components/ui/input";
import { MemberApprovalModal } from "@/components/groups/member-approval-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/role-utils";
import { formatDateShort, WEEKDAYS_KO, addMinutesToTime } from "@/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/lib/contexts/user-context";
import { useGroup } from "@/lib/contexts/group-context";

interface MembersPageProps {
  params: { id: string };
}

export default function MembersPage({ params }: MembersPageProps) {
  const { confirm } = useConfirm();
  const { user: currentUser } = useUser();
  const { group, membership, isOwner, canManage } = useGroup();

  const [members, setMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [pendingMembers, setPendingMembers] = useState<(GroupMember & { user: User })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [approvalMember, setApprovalMember] = useState<(GroupMember & { user: User }) | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<(GroupMember & { user: User }) | null>(null);

  // 선택된 멤버 관련 데이터
  const [assignedStudents, setAssignedStudents] = useState<(GroupMember & { user: User })[]>([]);
  const [instructorInfo, setInstructorInfo] = useState<(GroupMember & { user: User }) | null>(null);
  const [lessonHistory, setLessonHistory] = useState<(Lesson & { attendance?: Attendance })[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    early_leave: 0,
    absent: 0,
    excused: 0,
  });
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // 강사가 관리할 수 있는 학생 ID 목록
  const [myAssignedStudentIds, setMyAssignedStudentIds] = useState<string[]>([]);

  // 수업 시간 편집 상태
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<LessonSchedule[]>([]);
  const [editingInstructorId, setEditingInstructorId] = useState<string>("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [params.id, currentUser?.id]);

  // 선택된 멤버가 변경되면 관련 데이터 로드
  useEffect(() => {
    if (selectedMember) {
      setSelectedLessonId(null); // 수업 선택 초기화
      loadMemberDetail(selectedMember);
    }
  }, [selectedMember?.id]);

  const loadData = async () => {
    if (!currentUser) return;

    const supabase = createClient();

    // 멤버 목록만 조회 (group, membership은 context에서 제공)
    const [approvedResult, pendingResult] = await Promise.all([
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

    const allMembers = (approvedResult.data as (GroupMember & { user: User })[]) || [];
    setMembers(allMembers);
    setPendingMembers((pendingResult.data as (GroupMember & { user: User })[]) || []);

    // 강사인 경우 담당 학생 ID 목록 저장
    if (membership.role === "instructor" && !isOwner) {
      const assignedIds = allMembers
        .filter(m => m.instructor_id === currentUser.id)
        .map(m => m.user_id);
      setMyAssignedStudentIds(assignedIds);
    }

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
        .limit(50);

      // 출석 데이터 조회
      const lessonIds = lessons?.map(l => l.id) || [];
      let attendanceMap: Record<string, Attendance> = {};

      if (lessonIds.length > 0) {
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("*")
          .in("lesson_id", lessonIds);

        if (attendanceData) {
          attendanceData.forEach(att => {
            attendanceMap[att.lesson_id] = att;
          });
        }
      }

      // 수업에 출석 데이터 연결
      const lessonsWithAttendance = (lessons || []).map(lesson => ({
        ...lesson,
        attendance: attendanceMap[lesson.id] || null,
      }));

      // 출석 통계 계산
      const completedLessons = lessonsWithAttendance.filter(l => l.status === "completed");
      const stats = {
        total: completedLessons.length,
        present: completedLessons.filter(l => l.attendance?.status === "present").length,
        late: completedLessons.filter(l => l.attendance?.status === "late").length,
        early_leave: completedLessons.filter(l => l.attendance?.status === "early_leave").length,
        absent: completedLessons.filter(l => l.attendance?.status === "absent").length,
        excused: completedLessons.filter(l => l.attendance?.status === "excused").length,
      };

      setAttendanceStats(stats);
      setLessonHistory(lessonsWithAttendance as (Lesson & { attendance?: Attendance })[]);
      setAssignedStudents([]);
    } else {
      setAssignedStudents([]);
      setInstructorInfo(null);
      setLessonHistory([]);
    }

    setIsLoadingDetail(false);
  };

  // 오너는 모든 멤버 관리 가능, 강사는 담당 학생만 관리 가능
  // canManage는 context에서 제공
  const isInstructorOnly = membership.role === "instructor" && !isOwner;

  // 특정 멤버를 관리할 수 있는지 확인
  const canManageMember = (member: GroupMember & { user: User }) => {
    if (isOwner) return true;
    if (isInstructorOnly && myAssignedStudentIds.includes(member.user_id)) return true;
    return false;
  };

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

  // 수업 시간 편집 시작
  const startEditSchedule = (member: GroupMember & { user: User }) => {
    setEditingSchedule((member.lesson_schedule as LessonSchedule[]) || []);
    setEditingInstructorId(member.instructor_id || "");
    setIsEditingSchedule(true);
  };

  // 수업 시간 편집 취소
  const cancelEditSchedule = () => {
    setIsEditingSchedule(false);
    setEditingSchedule([]);
    setEditingInstructorId("");
  };

  // 스케줄 추가
  const addScheduleItem = () => {
    setEditingSchedule([
      ...editingSchedule,
      { day_of_week: 1, start_time: "14:00", end_time: "15:00" },
    ]);
  };

  // 스케줄 삭제
  const removeScheduleItem = (index: number) => {
    setEditingSchedule(editingSchedule.filter((_, i) => i !== index));
  };

  // 스케줄 업데이트
  const updateScheduleItem = (index: number, field: keyof LessonSchedule, value: string | number) => {
    const updated = [...editingSchedule];
    updated[index] = { ...updated[index], [field]: value };
    // 시작 시간 변경 시 종료 시간 자동 조정
    if (field === "start_time" && typeof value === "string") {
      updated[index].end_time = addMinutesToTime(value, 60);
    }
    setEditingSchedule(updated);
  };

  // 수업 시간 저장
  const saveSchedule = async () => {
    if (!selectedMember) return;

    setIsSavingSchedule(true);
    const supabase = createClient();

    try {
      await supabase
        .from("group_members")
        .update({
          lesson_schedule: editingSchedule,
          instructor_id: editingInstructorId || null,
        })
        .eq("id", selectedMember.id);

      // 로컬 상태 업데이트
      setMembers(members.map(m =>
        m.id === selectedMember.id
          ? { ...m, lesson_schedule: editingSchedule, instructor_id: editingInstructorId || undefined }
          : m
      ));
      setSelectedMember({
        ...selectedMember,
        lesson_schedule: editingSchedule,
        instructor_id: editingInstructorId || undefined,
      });

      setIsEditingSchedule(false);
    } catch (error) {
      console.error("Failed to save schedule:", error);
    } finally {
      setIsSavingSchedule(false);
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

  // 강사는 담당 학생만 볼 수 있음 (오너는 전체 볼 수 있음)
  const visibleMembers = isInstructorOnly
    ? members.filter(m =>
        m.user_id === currentUser?.id || // 본인
        myAssignedStudentIds.includes(m.user_id) // 담당 학생
      )
    : members;

  const filteredMembers = visibleMembers.filter((member) => {
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
        <h2 className="text-lg font-semibold">
          {isInstructorOnly ? "담당 학생" : "멤버"} ({visibleMembers.length})
        </h2>
        {isOwner && pendingMembers.length > 0 && (
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
          {/* Pending Members - 오너만 볼 수 있음 */}
          {isOwner && pendingMembers.length > 0 && (
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
                        {canManage && canManageMember(member) && (
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
                                  {isOwner && member.role === "instructor" && (
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
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                  {selectedMember.user?.avatar_url ? (
                    <img src={selectedMember.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (selectedMember.nickname || selectedMember.user?.name || "?")[0]
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{selectedMember.nickname || selectedMember.user?.name}</h3>
                    {selectedMember.is_owner && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedMember.role]}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canManage && canManageMember(selectedMember) && (
                  <>
                    {isOwner && selectedMember.role === "instructor" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleOwner(selectedMember.id, selectedMember.is_owner)}
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        {selectedMember.is_owner ? "해제" : "관리자"}
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

            <div className="flex-1 overflow-auto p-4 space-y-4">

              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* 강사 상세 */}
                  {selectedMember.role === "instructor" && (
                    <div className="space-y-6">
                      {/* 통계 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-lg border bg-card">
                          <Users className="h-5 w-5 text-muted-foreground mb-2" />
                          <p className="text-2xl font-bold">{assignedStudents.length}</p>
                          <p className="text-xs text-muted-foreground">담당 학생</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-card">
                          <BookOpen className="h-5 w-5 text-muted-foreground mb-2" />
                          <p className="text-2xl font-bold">-</p>
                          <p className="text-xs text-muted-foreground">이번 달 수업</p>
                        </div>
                      </div>

                      {/* 담당 학생 목록 */}
                      <div>
                        <h4 className="font-semibold mb-2">담당 학생</h4>
                        {assignedStudents.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr className="text-left text-muted-foreground text-xs">
                                  <th className="py-2 px-3 font-medium">이름</th>
                                  <th className="py-2 px-3 font-medium">수업 시간</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {assignedStudents.map((student) => (
                                  <tr
                                    key={student.id}
                                    className="hover:bg-muted/30 cursor-pointer"
                                    onClick={() => setSelectedMember(student)}
                                  >
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs shrink-0">
                                          {student.user?.avatar_url ? (
                                            <img src={student.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                          ) : (
                                            (student.nickname || student.user?.name || "?")[0]
                                          )}
                                        </div>
                                        <span className="font-medium">
                                          {student.nickname || student.user?.name}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-muted-foreground">
                                      {student.lesson_schedule && (student.lesson_schedule as LessonSchedule[]).length > 0 ? (
                                        (student.lesson_schedule as LessonSchedule[]).map((s, i) => (
                                          <span key={i}>
                                            {i > 0 && ", "}
                                            {WEEKDAYS_KO[s.day_of_week]} {s.start_time}{s.subject ? ` (${s.subject})` : ""}
                                          </span>
                                        ))
                                      ) : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg">
                            담당 학생이 없습니다
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 학생 상세 */}
                  {selectedMember.role === "student" && (
                    <div className="space-y-6">
                      {!isEditingSchedule ? (
                        // 보기 모드
                        <>
                          {/* 기본 정보 테이블 */}
                          <table className="w-full text-sm">
                            <tbody className="divide-y">
                              <tr>
                                <td className="py-2.5 text-muted-foreground w-24">담당 강사</td>
                                <td className="py-2.5 font-medium">{instructorInfo?.nickname || instructorInfo?.user?.name || "-"}</td>
                              </tr>
                              <tr>
                                <td className="py-2.5 text-muted-foreground">총 수업</td>
                                <td className="py-2.5 font-medium">{attendanceStats.total}회</td>
                              </tr>
                              <tr>
                                <td className="py-2.5 text-muted-foreground">출석률</td>
                                <td className="py-2.5 font-medium">
                                  {attendanceStats.total > 0
                                    ? `${Math.round((attendanceStats.present / attendanceStats.total) * 100)}%`
                                    : "-"}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* 출결 현황 */}
                          <div>
                            <h4 className="font-semibold mb-2">출결 현황</h4>
                            <div className="grid grid-cols-5 gap-2 text-center">
                              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <p className="text-lg font-bold text-green-700 dark:text-green-400">{attendanceStats.present}</p>
                                <p className="text-[11px] text-green-600 dark:text-green-500">출석</p>
                              </div>
                              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{attendanceStats.late}</p>
                                <p className="text-[11px] text-yellow-600 dark:text-yellow-500">지각</p>
                              </div>
                              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{attendanceStats.early_leave}</p>
                                <p className="text-[11px] text-orange-600 dark:text-orange-500">조퇴</p>
                              </div>
                              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                                <p className="text-lg font-bold text-red-700 dark:text-red-400">{attendanceStats.absent}</p>
                                <p className="text-[11px] text-red-600 dark:text-red-500">결석</p>
                              </div>
                              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{attendanceStats.excused}</p>
                                <p className="text-[11px] text-purple-600 dark:text-purple-500">사유</p>
                              </div>
                            </div>
                          </div>

                          {/* 정규 수업 시간 */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">정규 수업</h4>
                              {canManageMember(selectedMember) && (
                                <button
                                  onClick={() => startEditSchedule(selectedMember)}
                                  className="text-sm text-primary hover:underline"
                                >
                                  수정
                                </button>
                              )}
                            </div>
                            {(selectedMember.lesson_schedule as LessonSchedule[])?.length > 0 ? (
                              <table className="w-full text-sm">
                                <tbody className="divide-y">
                                  {(selectedMember.lesson_schedule as LessonSchedule[]).map((schedule, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2.5 font-medium">{WEEKDAYS_KO[schedule.day_of_week]}요일</td>
                                      <td className="py-2.5 text-muted-foreground">{schedule.start_time} ~ {schedule.end_time}</td>
                                      <td className="py-2.5 text-right text-muted-foreground">{schedule.subject || ""}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                                등록된 수업 시간이 없습니다
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        // 편집 모드 - 카드 형태
                        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">수업 정보 수정</h4>
                            <button
                              onClick={cancelEditSchedule}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* 담당 강사 선택 */}
                          <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">담당 강사</label>
                            <Select value={editingInstructorId} onValueChange={setEditingInstructorId}>
                              <SelectTrigger>
                                <SelectValue placeholder="강사 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {members.filter(m => m.role === "instructor").map((instructor) => (
                                  <SelectItem key={instructor.id} value={instructor.user_id || ""}>
                                    {instructor.nickname || instructor.user?.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 수업 시간 */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-muted-foreground">수업 시간</label>
                              <button
                                type="button"
                                onClick={addScheduleItem}
                                className="text-xs text-primary hover:underline"
                              >
                                + 추가
                              </button>
                            </div>

                            <div className="space-y-2">
                              {editingSchedule.map((schedule, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-background border space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Select
                                      value={schedule.day_of_week.toString()}
                                      onValueChange={(v) => updateScheduleItem(idx, "day_of_week", parseInt(v))}
                                    >
                                      <SelectTrigger className="w-[70px] h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {WEEKDAYS_KO.map((day, i) => (
                                          <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-1 flex-1 min-w-[180px]">
                                      <Input
                                        type="time"
                                        value={schedule.start_time}
                                        onChange={(e) => updateScheduleItem(idx, "start_time", e.target.value)}
                                        className="h-9 flex-1"
                                      />
                                      <span className="text-muted-foreground text-sm">~</span>
                                      <Input
                                        type="time"
                                        value={schedule.end_time}
                                        onChange={(e) => updateScheduleItem(idx, "end_time", e.target.value)}
                                        className="h-9 flex-1"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeScheduleItem(idx)}
                                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <div>
                                    <Input
                                      type="text"
                                      placeholder="과목/비고 (예: 국어, 수학, 음악)"
                                      value={schedule.subject || ""}
                                      onChange={(e) => updateScheduleItem(idx, "subject", e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                              ))}
                              {editingSchedule.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  수업 시간을 추가해주세요
                                </p>
                              )}
                            </div>
                          </div>

                          {/* 저장 버튼 */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              onClick={cancelEditSchedule}
                              disabled={isSavingSchedule}
                              className="flex-1"
                            >
                              취소
                            </Button>
                            <Button
                              onClick={saveSchedule}
                              disabled={isSavingSchedule}
                              className="flex-1"
                            >
                              {isSavingSchedule ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "저장"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 수업 이력 */}
                      <div>
                        <h4 className="font-semibold mb-2">최근 수업</h4>
                        {lessonHistory.length > 0 ? (
                          <div className="flex gap-3">
                            {/* 수업 목록 (왼쪽) */}
                            <div className="w-28 shrink-0 border rounded-lg overflow-hidden">
                              <div className="divide-y max-h-[200px] overflow-y-auto">
                                {lessonHistory.slice(0, 10).map((lesson, idx) => {
                                  const lessonDate = new Date(lesson.scheduled_at);
                                  const isSelected = selectedLessonId ? selectedLessonId === lesson.id : idx === 0;
                                  const getAttendanceDot = (status?: string) => {
                                    switch (status) {
                                      case "present": return "bg-green-500";
                                      case "late": return "bg-yellow-500";
                                      case "early_leave": return "bg-orange-500";
                                      case "absent": case "excused": return "bg-red-500";
                                      default: return "bg-gray-300";
                                    }
                                  };
                                  return (
                                    <button
                                      key={lesson.id}
                                      onClick={() => setSelectedLessonId(lesson.id)}
                                      className={cn(
                                        "w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors",
                                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                                      )}
                                    >
                                      <span className={cn("w-2 h-2 rounded-full shrink-0", getAttendanceDot(lesson.attendance?.status))} />
                                      <span>
                                        {lessonDate.getMonth() + 1}/{lessonDate.getDate()}
                                        <span className="text-muted-foreground ml-1">
                                          ({["일", "월", "화", "수", "목", "금", "토"][lessonDate.getDay()]})
                                        </span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 선택된 수업 상세 (오른쪽) */}
                            {(() => {
                              const detailLesson = selectedLessonId
                                ? lessonHistory.find(l => l.id === selectedLessonId)
                                : lessonHistory[0];
                              if (!detailLesson) return null;
                              return (
                                <div className="flex-1 border rounded-lg p-3 text-sm space-y-4 min-h-[200px]">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">수업 내용</p>
                                    <p className="whitespace-pre-wrap min-h-[40px]">{detailLesson.content || <span className="text-muted-foreground">-</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">과제</p>
                                    <p className="whitespace-pre-wrap min-h-[40px]">{detailLesson.homework || <span className="text-muted-foreground">-</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">비고</p>
                                    <p className="whitespace-pre-wrap min-h-[20px]">{detailLesson.notes || <span className="text-muted-foreground">-</span>}</p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg">
                            수업 이력이 없습니다
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 보호자/기타 역할 */}
                  {selectedMember.role !== "instructor" && selectedMember.role !== "student" && (
                    <div className="space-y-6">
                      <table className="w-full text-sm">
                        <tbody className="divide-y">
                          <tr>
                            <td className="py-2.5 text-muted-foreground w-20">이메일</td>
                            <td className="py-2.5">{selectedMember.user?.email || "-"}</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-muted-foreground">가입일</td>
                            <td className="py-2.5">{formatDateShort(selectedMember.created_at)}</td>
                          </tr>
                        </tbody>
                      </table>
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
