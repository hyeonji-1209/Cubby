"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";
import { GroupMember, User, Group, LessonSchedule, MemberRole } from "@/types";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLE_ICONS, ROLE_BG_COLORS, ROLE_ICON_COLORS } from "@/lib/role-utils";
import { WEEKDAYS_KO } from "@/lib/date-utils";

interface MemberApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member: (GroupMember & { user: User }) | null;
  group: Group;
  instructors: (GroupMember & { user: User })[];
}


export function MemberApprovalModal({
  isOpen,
  onClose,
  onSuccess,
  member,
  group,
  instructors,
}: MemberApprovalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 강사 승인용 상태
  const [paymentDay, setPaymentDay] = useState<number>(25);

  // 학생 승인용 상태
  const [selectedInstructor, setSelectedInstructor] = useState<string>("");
  const [lessonSchedule, setLessonSchedule] = useState<LessonSchedule[]>([
    { day_of_week: 1, start_time: "14:00", end_time: "15:00" },
  ]);
  const [studentPaymentDay, setStudentPaymentDay] = useState<number>(1);

  // 보호자 승인용 상태
  const [children, setChildren] = useState<{
    name: string;
    instructor_id: string;
    schedule: LessonSchedule[];
    payment_day: number;
  }[]>([
    {
      name: "",
      instructor_id: "",
      schedule: [{ day_of_week: 1, start_time: "14:00", end_time: "15:00" }],
      payment_day: 1,
    },
  ]);

  // 초기화
  useEffect(() => {
    if (isOpen) {
      setPaymentDay(25);
      setSelectedInstructor(instructors[0]?.id || "");
      setLessonSchedule([{ day_of_week: 1, start_time: "14:00", end_time: "15:00" }]);
      setStudentPaymentDay(1);
      setChildren([{
        name: "",
        instructor_id: instructors[0]?.id || "",
        schedule: [{ day_of_week: 1, start_time: "14:00", end_time: "15:00" }],
        payment_day: 1,
      }]);
    }
  }, [isOpen, instructors]);

  if (!isOpen || !member) return null;

  const isEducationType = group.type === "education";
  const role = member.role;

  const handleApprove = async () => {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      if (role === "instructor") {
        // 강사 승인: 상태 업데이트 + 소그룹 자동 생성
        await supabase
          .from("group_members")
          .update({
            status: "approved",
            payment_date: paymentDay,
          })
          .eq("id", member.id);

        // 강사 소그룹 자동 생성
        await supabase.from("sub_groups").insert({
          group_id: group.id,
          name: `${member.nickname || member.user?.name}반`,
          instructor_id: member.id,
          lesson_schedule: [],
          member_ids: [],
        });
      } else if (role === "member") {
        // 학생 승인: 담당강사, 수업시간, 납부일 설정
        await supabase
          .from("group_members")
          .update({
            status: "approved",
            instructor_id: selectedInstructor,
            lesson_schedule: lessonSchedule,
            payment_date: studentPaymentDay,
          })
          .eq("id", member.id);
      } else if (role === "guardian") {
        // 보호자 승인: 보호자 + 자녀들 등록
        await supabase
          .from("group_members")
          .update({
            status: "approved",
          })
          .eq("id", member.id);

        // 자녀들을 멤버로 추가
        for (const child of children) {
          if (child.name.trim()) {
            await supabase.from("group_members").insert({
              group_id: group.id,
              user_id: null, // 자녀는 별도 계정 없이 등록
              role: "member",
              status: "approved",
              nickname: child.name.trim(),
              instructor_id: child.instructor_id,
              lesson_schedule: child.schedule,
              payment_date: child.payment_day,
            });
          }
        }
      } else {
        // 기타 역할: 단순 승인
        await supabase
          .from("group_members")
          .update({ status: "approved" })
          .eq("id", member.id);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Approval failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSchedule = () => {
    setLessonSchedule([
      ...lessonSchedule,
      { day_of_week: 1, start_time: "14:00", end_time: "15:00" },
    ]);
  };

  const removeSchedule = (index: number) => {
    setLessonSchedule(lessonSchedule.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: keyof LessonSchedule, value: string | number) => {
    const updated = [...lessonSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setLessonSchedule(updated);
  };

  const addChild = () => {
    setChildren([
      ...children,
      {
        name: "",
        instructor_id: instructors[0]?.id || "",
        schedule: [{ day_of_week: 1, start_time: "14:00", end_time: "15:00" }],
        payment_day: 1,
      },
    ]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: string, value: unknown) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const getRoleIconComponent = () => {
    const Icon = ROLE_ICONS[role as MemberRole] || ROLE_ICONS.member;
    const iconColor = ROLE_ICON_COLORS[role as MemberRole] || ROLE_ICON_COLORS.member;
    return <Icon className={cn("h-5 w-5", iconColor)} />;
  };

  const getRoleLabel = () => {
    if (role === "member") return "학생/수강생";
    return ROLE_LABELS[role as MemberRole] || ROLE_LABELS.member;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              ROLE_BG_COLORS[role as MemberRole] || ROLE_BG_COLORS.member
            )}>
              {getRoleIconComponent()}
            </div>
            <div>
              <h2 className="text-lg font-semibold">가입 승인</h2>
              <p className="text-sm text-muted-foreground">
                {getRoleLabel()} - {member.nickname || member.user?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 강사 승인 폼 */}
          {isEducationType && role === "instructor" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                <p className="text-sm text-green-700 dark:text-green-300">
                  승인 시 자동으로 <strong>{member.nickname || member.user?.name}반</strong> 소그룹이 생성됩니다.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">급여일</label>
                <select
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      매월 {day}일
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  강사에게 급여가 지급되는 날짜입니다
                </p>
              </div>
            </div>
          )}

          {/* 학생 승인 폼 */}
          {isEducationType && role === "member" && (
            <div className="space-y-4">
              {/* 담당 강사 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">담당 강사</label>
                {instructors.length > 0 ? (
                  <select
                    value={selectedInstructor}
                    onChange={(e) => setSelectedInstructor(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.nickname || instructor.user?.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted">
                    등록된 강사가 없습니다
                  </p>
                )}
              </div>

              {/* 수업 시간 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">수업 시간</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSchedule}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    추가
                  </Button>
                </div>
                <div className="space-y-2">
                  {lessonSchedule.map((schedule, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <select
                        value={schedule.day_of_week}
                        onChange={(e) =>
                          updateSchedule(index, "day_of_week", Number(e.target.value))
                        }
                        className="h-9 px-2 rounded border bg-background text-sm"
                      >
                        {WEEKDAYS_KO.map((day, i) => (
                          <option key={i} value={i}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 flex-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) =>
                            updateSchedule(index, "start_time", e.target.value)
                          }
                          className="h-9"
                        />
                        <span className="text-muted-foreground">~</span>
                        <Input
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) =>
                            updateSchedule(index, "end_time", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      {lessonSchedule.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSchedule(index)}
                          className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 수업료 납부일 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">수업료 납부일</label>
                <select
                  value={studentPaymentDay}
                  onChange={(e) => setStudentPaymentDay(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      매월 {day}일
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 보호자 승인 폼 */}
          {isEducationType && role === "guardian" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">자녀 정보</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChild}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  자녀 추가
                </Button>
              </div>

              {children.map((child, childIndex) => (
                <div
                  key={childIndex}
                  className="p-4 rounded-lg border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      자녀 {childIndex + 1}
                    </span>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(childIndex)}
                        className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* 자녀 이름 */}
                  <Input
                    placeholder="자녀 이름"
                    value={child.name}
                    onChange={(e) =>
                      updateChild(childIndex, "name", e.target.value)
                    }
                  />

                  {/* 담당 강사 */}
                  {instructors.length > 0 && (
                    <select
                      value={child.instructor_id}
                      onChange={(e) =>
                        updateChild(childIndex, "instructor_id", e.target.value)
                      }
                      className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                    >
                      <option value="">담당 강사 선택</option>
                      {instructors.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.nickname || instructor.user?.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* 수업 시간 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">수업 시간</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateChild(childIndex, "schedule", [
                            ...child.schedule,
                            { day_of_week: 1, start_time: "14:00", end_time: "15:00" },
                          ])
                        }
                        className="text-xs text-primary hover:underline"
                      >
                        + 추가
                      </button>
                    </div>
                    {child.schedule.map((schedule, scheduleIndex) => (
                      <div
                        key={scheduleIndex}
                        className="flex items-center gap-2"
                      >
                        <select
                          value={schedule.day_of_week}
                          onChange={(e) => {
                            const updated = [...child.schedule];
                            updated[scheduleIndex] = {
                              ...updated[scheduleIndex],
                              day_of_week: Number(e.target.value),
                            };
                            updateChild(childIndex, "schedule", updated);
                          }}
                          className="h-8 px-2 rounded border bg-background text-xs"
                        >
                          {WEEKDAYS_KO.map((day, i) => (
                            <option key={i} value={i}>
                              {day}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) => {
                            const updated = [...child.schedule];
                            updated[scheduleIndex] = {
                              ...updated[scheduleIndex],
                              start_time: e.target.value,
                            };
                            updateChild(childIndex, "schedule", updated);
                          }}
                          className="h-8 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">~</span>
                        <Input
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) => {
                            const updated = [...child.schedule];
                            updated[scheduleIndex] = {
                              ...updated[scheduleIndex],
                              end_time: e.target.value,
                            };
                            updateChild(childIndex, "schedule", updated);
                          }}
                          className="h-8 text-xs"
                        />
                        {child.schedule.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = child.schedule.filter(
                                (_, i) => i !== scheduleIndex
                              );
                              updateChild(childIndex, "schedule", updated);
                            }}
                            className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 납부일 */}
                  <select
                    value={child.payment_day}
                    onChange={(e) =>
                      updateChild(childIndex, "payment_day", Number(e.target.value))
                    }
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        매월 {day}일 납부
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <p className="text-xs text-muted-foreground">
                자녀는 별도 계정 없이 보호자가 관리합니다
              </p>
            </div>
          )}

          {/* 일반 승인 (교육 타입이 아닐 때) */}
          {!isEducationType && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                <strong>{member.nickname || member.user?.name}</strong>님의 가입을 승인하시겠습니까?
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handleApprove}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "승인"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
