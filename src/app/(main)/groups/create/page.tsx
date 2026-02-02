"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  GraduationCap,
  Heart,
  Users,
  Building2,
  Gamepad2,
  MoreHorizontal,
  LucideIcon,
  X,
  Plus,
  Shield,
  Info,
} from "lucide-react";
import { GroupType, GroupSettings } from "@/types";
import { cn } from "@/lib/utils";

const groupTypes: {
  type: string;
  title: string;
  icon: LucideIcon;
  desc: string;
}[] = [
  {
    type: "education",
    title: "교육/학원",
    icon: GraduationCap,
    desc: "수업, 출석, 수강료 관리",
  },
  { type: "couple", title: "연인", icon: Heart, desc: "커플 일정, 기념일" },
  { type: "family", title: "가족", icon: Users, desc: "가족 일정, 생일" },
  { type: "religion", title: "종교", icon: Building2, desc: "모임 일정, 공지" },
  { type: "hobby", title: "동호회", icon: Gamepad2, desc: "취미 모임 관리" },
  { type: "other", title: "기타", icon: MoreHorizontal, desc: "자유로운 모임" },
];

const stepTitles: Record<number, { title: string; desc: string }> = {
  1: { title: "모임 유형", desc: "어떤 모임을 만들까요?" },
  2: { title: "기본 정보", desc: "모임 이름을 정해주세요" },
  3: { title: "상세 설정", desc: "추가 설정을 해주세요" },
  4: { title: "공간 설정", desc: "수업 공간을 설정하세요" },
};

export default function CreateGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as GroupType) || null;

  const [step, setStep] = useState(initialType ? 2 : 1);
  const [isLoading, setIsLoading] = useState(false);

  const [groupType, setGroupType] = useState<GroupType | null>(initialType);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [maxOwners, setMaxOwners] = useState(1);

  const [lessonType, setLessonType] = useState<"individual" | "group">("individual");
  const [attendanceCheck, setAttendanceCheck] = useState(true);
  const [multiInstructor, setMultiInstructor] = useState(false);
  const [allowGuardian, setAllowGuardian] = useState(false);

  const [classes, setClasses] = useState<string[]>([""]);
  const [hasPracticeRoom, setHasPracticeRoom] = useState(false);
  const [practiceRoomStartTime, setPracticeRoomStartTime] = useState("09:00");
  const [practiceRoomEndTime, setPracticeRoomEndTime] = useState("22:00");
  const [excludedClasses, setExcludedClasses] = useState<string[]>([]);

  const [isMarried, setIsMarried] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [myNickname, setMyNickname] = useState("");
  const [myRole, setMyRole] = useState("");
  const [myBirthday, setMyBirthday] = useState("");

  const getSteps = () => {
    if (!groupType) return 1;
    if (groupType === "education") return 4;
    if (groupType === "couple") return 3;
    if (groupType === "family") return 3;
    return 2;
  };

  const totalSteps = getSteps();

  const handleTypeSelect = (type: GroupType) => {
    setGroupType(type);
    setIcon(type);
    setStep(2);
  };

  const handleCreate = async () => {
    if (!groupType) return;
    setIsLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const settings: GroupSettings = {
      max_owners: groupType === "couple" ? 2 : maxOwners,
    };

    if (groupType === "education") {
      settings.lesson_type = lessonType;
      settings.attendance_check = attendanceCheck;
      settings.multi_instructor = multiInstructor;
      settings.allow_guardian = allowGuardian;

      if (classes.filter(Boolean).length > 0) {
        settings.classes = classes.filter(Boolean).map((className, i) => ({
          id: `class-${i + 1}`,
          name: className,
        }));
      }

      settings.has_practice_room = hasPracticeRoom;
      if (hasPracticeRoom) {
        settings.practice_room_hours = {
          start: practiceRoomStartTime,
          end: practiceRoomEndTime,
        };
        settings.excluded_practice_classes = excludedClasses;
      }
    } else if (groupType === "couple" || groupType === "family") {
      settings.is_married = isMarried;
      if (anniversaryDate) settings.anniversary_date = anniversaryDate;
    }

    const inviteCode = generateInviteCode();

    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: name || (groupType === "couple" ? "우리" : "새 모임"),
        description,
        type: groupType,
        icon,
        settings,
        invite_code: inviteCode,
        owner_id: user.id,
      })
      .select()
      .single();

    if (groupError) {
      console.error("Error creating group:", groupError);
      setIsLoading(false);
      return;
    }

    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "owner",
      nickname: myNickname || undefined,
      family_role: myRole || undefined,
      birthday: myBirthday || undefined,
      status: "approved",
    });

    router.push(`/groups/${group.id}`);
  };

  const currentGroupType = groupTypes.find((g) => g.type === groupType);
  const IconComponent = currentGroupType?.icon;

  // Step Content Components
  const TypeSelectionContent = () => (
    <div className="grid grid-cols-2 gap-3">
      {groupTypes.map((item) => {
        const ItemIcon = item.icon;
        return (
          <button
            key={item.type}
            onClick={() => handleTypeSelect(item.type as GroupType)}
            className="flex flex-col items-center p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
              <ItemIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="font-medium text-sm">{item.title}</span>
            <span className="text-xs text-muted-foreground mt-0.5">{item.desc}</span>
          </button>
        );
      })}
    </div>
  );

  const BasicInfoContent = () => (
    <div className="space-y-5">
      {groupType !== "couple" && (
        <Input
          label="모임 이름"
          placeholder="예: 우리 동호회"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <Input
        label="설명 (선택)"
        placeholder="모임에 대한 간단한 소개"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Owner Count - Not for couple type */}
      {groupType !== "couple" && (
        <div>
          <label className="text-sm font-medium mb-2 block">오너 수</label>
          <p className="text-xs text-muted-foreground mb-3">
            모임을 함께 관리할 오너의 최대 인원을 설정하세요
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setMaxOwners(num)}
                className={cn(
                  "w-10 h-10 rounded-lg border font-medium transition-all",
                  maxOwners === num
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:border-muted-foreground"
                )}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Owner Permission Info */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-foreground mb-1">오너 권한 안내</p>
                <p className="text-muted-foreground">
                  오너는 모임의 모든 설정, 멤버 관리, 데이터 삭제 등 전체 기능에 대한 권한을 갖습니다.
                </p>
                {groupType === "education" && (
                  <p className="text-muted-foreground mt-1">
                    <Info className="h-3 w-3 inline mr-1" />
                    교육 모임에서 오너는 <span className="font-medium text-foreground">원장</span> 또는 <span className="font-medium text-foreground">강사</span> 직책에만 부여할 수 있습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {groupType === "couple" && (
        <div>
          <label className="text-sm font-medium mb-3 block">결혼 여부</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsMarried(false)}
              className={cn(
                "p-4 rounded-xl border text-center transition-all",
                !isMarried ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground"
              )}
            >
              <span className="font-medium">연인</span>
              <p className="text-xs text-muted-foreground mt-1">아직 미혼</p>
            </button>
            <button
              type="button"
              onClick={() => setIsMarried(true)}
              className={cn(
                "p-4 rounded-xl border text-center transition-all",
                isMarried ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground"
              )}
            >
              <span className="font-medium">부부</span>
              <p className="text-xs text-muted-foreground mt-1">기혼</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const AdditionalSettingsContent = () => (
    <div className="space-y-4">
      {groupType === "education" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLessonType("individual")}
              className={cn(
                "p-4 rounded-xl border text-center transition-all",
                lessonType === "individual" ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
              )}
            >
              <span className="font-medium">1:1 수업</span>
              <p className="text-xs text-muted-foreground mt-1">개인 레슨</p>
            </button>
            <button
              type="button"
              onClick={() => setLessonType("group")}
              className={cn(
                "p-4 rounded-xl border text-center transition-all",
                lessonType === "group" ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
              )}
            >
              <span className="font-medium">그룹 수업</span>
              <p className="text-xs text-muted-foreground mt-1">여러 명 함께</p>
            </button>
          </div>
          <div className="space-y-2">
            {[
              { key: "attendance", label: "QR 출석 체크", desc: "QR로 출석 관리", checked: attendanceCheck, onChange: setAttendanceCheck },
              { key: "multi", label: "다중 강사", desc: "여러 강사가 수업", checked: multiInstructor, onChange: setMultiInstructor },
              { key: "guardian", label: "학부모 가입", desc: "보호자 계정 허용", checked: allowGuardian, onChange: setAllowGuardian },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                <div>
                  <span className="font-medium text-sm">{item.label}</span>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.onChange(e.target.checked)}
                  className="w-5 h-5 rounded accent-primary"
                />
              </label>
            ))}
          </div>
        </>
      )}

      {(groupType === "couple" || groupType === "family") && (
        <div className="space-y-4">
          <Input
            label="닉네임"
            placeholder="모임에서 사용할 이름"
            value={myNickname}
            onChange={(e) => setMyNickname(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium mb-2">나의 역할</label>
            <div className="flex flex-wrap gap-2">
              {(groupType === "couple"
                ? isMarried ? ["남편", "아내"] : ["남자친구", "여자친구"]
                : ["아빠", "엄마", "아들", "딸", "할아버지", "할머니"]
              ).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setMyRole(role)}
                  className={cn(
                    "px-4 py-2 rounded-lg border transition-all",
                    myRole === role ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          {groupType === "couple" && (
            <Input
              type="date"
              label={isMarried ? "결혼기념일" : "사귄 날짜"}
              value={anniversaryDate}
              onChange={(e) => setAnniversaryDate(e.target.value)}
            />
          )}
          <Input
            type="date"
            label="내 생일"
            value={myBirthday}
            onChange={(e) => setMyBirthday(e.target.value)}
          />
        </div>
      )}

      {(groupType === "hobby" || groupType === "religion" || groupType === "other") && (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">준비 완료!</h3>
          <p className="text-sm text-muted-foreground">모임을 생성하면 초대코드가 발급됩니다</p>
        </div>
      )}
    </div>
  );

  const ClassRoomSettingsContent = () => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">클래스 목록</label>
        <p className="text-xs text-muted-foreground mb-3">수업이 진행되는 공간을 등록하세요</p>
        <div className="space-y-2">
          {classes.map((cls, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder={`클래스 ${i + 1} (예: A실, 1번방)`}
                value={cls}
                onChange={(e) => {
                  const newClasses = [...classes];
                  newClasses[i] = e.target.value;
                  setClasses(newClasses);
                }}
              />
              {classes.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setClasses(classes.filter((_, idx) => idx !== i));
                    setExcludedClasses(excludedClasses.filter((c) => c !== cls));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={() => setClasses([...classes, ""])}>
            + 클래스 추가
          </Button>
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
          <div>
            <span className="font-medium text-sm">연습실 운영</span>
            <p className="text-xs text-muted-foreground">학생들이 연습실을 예약할 수 있어요</p>
          </div>
          <input
            type="checkbox"
            checked={hasPracticeRoom}
            onChange={(e) => setHasPracticeRoom(e.target.checked)}
            className="w-5 h-5 rounded accent-primary"
          />
        </label>

        {hasPracticeRoom && (
          <div className="mt-3 space-y-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-2 block">운영 시간</label>
              <div className="flex items-center gap-2">
                <Input type="time" value={practiceRoomStartTime} onChange={(e) => setPracticeRoomStartTime(e.target.value)} className="flex-1" />
                <span className="text-muted-foreground text-sm">~</span>
                <Input type="time" value={practiceRoomEndTime} onChange={(e) => setPracticeRoomEndTime(e.target.value)} className="flex-1" />
              </div>
            </div>

            {classes.filter(Boolean).length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">제외할 클래스</label>
                <p className="text-xs text-muted-foreground mb-2">체크된 클래스는 연습실 예약에서 제외됩니다</p>
                <div className="space-y-1.5">
                  {classes.filter(Boolean).map((cls, i) => (
                    <label key={i} className="flex items-center gap-3 p-2.5 rounded-lg border bg-background cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={excludedClasses.includes(cls)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExcludedClasses([...excludedClasses, cls]);
                          } else {
                            setExcludedClasses(excludedClasses.filter((c) => c !== cls));
                          }
                        }}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-sm">{cls}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1: return TypeSelectionContent();
      case 2: return BasicInfoContent();
      case 3: return AdditionalSettingsContent();
      case 4: return ClassRoomSettingsContent();
      default: return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row">
      {/* Left: Illustration Panel (Desktop) */}
      <div className="hidden md:flex w-1/2 bg-muted/50 flex-col items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-primary/5 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-8">
          <div className="mb-8">
            {step === 1 ? (
              <div className="w-24 h-24 mx-auto rounded-2xl bg-background border shadow-sm flex items-center justify-center">
                <Plus className="h-12 w-12 text-primary/70" />
              </div>
            ) : IconComponent ? (
              <div className="w-24 h-24 mx-auto rounded-2xl bg-background border shadow-sm flex items-center justify-center">
                <IconComponent className="h-12 w-12 text-primary/70" />
              </div>
            ) : null}
          </div>

          {/* Step Progress */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i + 1 === step ? "bg-primary w-6" : i + 1 < step ? "bg-primary/40 w-2" : "bg-muted w-2"
                )}
              />
            ))}
          </div>

          <h2 className="text-lg font-semibold mb-1">
            {step === 1 && "새로운 모임을 시작해보세요"}
            {step === 2 && "멋진 이름을 지어주세요"}
            {step === 3 && "거의 다 왔어요!"}
            {step === 4 && "마지막 단계예요"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {step === 1 && "함께하는 모든 순간을 더 특별하게"}
            {step === 2 && currentGroupType?.desc}
            {step === 3 && "세부 설정을 마무리해주세요"}
            {step === 4 && "수업 공간을 설정하면 끝!"}
          </p>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex flex-col bg-background min-h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {step}/{totalSteps}
                </span>
                <h2 className="font-semibold">{stepTitles[step]?.title}</h2>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">
                {stepTitles[step]?.desc}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden px-4 py-2 bg-muted/20 shrink-0">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  i < step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-6 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full animate-fade-in animate-slide-in-from-right">
            {renderStepContent()}
          </div>
        </div>

        {/* Bottom Navigation */}
        {step > 1 && (
          <div className="px-4 py-5 border-t bg-background shrink-0">
            <div className="flex gap-3 max-w-sm mx-auto w-full">
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                이전
              </Button>
              {step < totalSteps ? (
                <Button className="flex-1" onClick={() => setStep(step + 1)}>
                  다음
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleCreate} isLoading={isLoading}>
                  <Check className="h-4 w-4 mr-1" />
                  모임 만들기
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
