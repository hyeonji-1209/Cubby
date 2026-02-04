"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Save,
  Trash2,
  Copy,
  RefreshCw,
  AlertTriangle,
  Plus,
  X,
  ChevronRight,
  Info,
  Link2,
  GraduationCap,
  Building2,
  Check,
  Smile,
  Upload,
  Users,
  Settings,
} from "lucide-react";
import { Group, GroupSettings, ClassRoom, GroupMember } from "@/types";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/contexts/user-context";

interface SettingsPageProps {
  params: { id: string };
}

type SettingsSection = "basic" | "invite" | "education" | "practice" | "classes" | "instructors" | "danger";

export default function SettingsPage({ params }: SettingsPageProps) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const toast = useToast();
  const { refreshGroups } = useUser();

  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("basic");
  const [hasChanges, setHasChanges] = useState(false);

  // 기본 정보
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [iconType, setIconType] = useState<"emoji" | "image">("emoji");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // 교육 타입 설정
  const [attendanceCheck, setAttendanceCheck] = useState(false);
  const [multiInstructor, setMultiInstructor] = useState(false);
  const [allowGuardian, setAllowGuardian] = useState(false);
  const [hasPracticeRoom, setHasPracticeRoom] = useState(false);
  const [practiceRoomStart, setPracticeRoomStart] = useState("09:00");
  const [practiceRoomEnd, setPracticeRoomEnd] = useState("22:00");
  const [practiceRoomSlotUnit, setPracticeRoomSlotUnit] = useState<30 | 60>(60);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [excludedPracticeClasses, setExcludedPracticeClasses] = useState<string[]>([]);

  // 새 클래스 추가
  const [newClassName, setNewClassName] = useState("");

  // 멤버 관리 (강사-학생 배정용)
  const [members, setMembers] = useState<(GroupMember & { profile?: { name: string } })[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);

  // 초대 코드 설정
  const [inviteCodeType, setInviteCodeType] = useState<'one_time' | 'expiry'>('one_time');
  const [inviteCodeExpiry, setInviteCodeExpiry] = useState("");

  // 심플한 아이콘/심볼 목록 (단색/심플 스타일)
  const simpleIcons = [
    // 기본 심볼
    "◉", "◎", "○", "●", "◐", "◑", "◒", "◓",
    "□", "■", "▢", "▣", "◇", "◆", "△", "▲",
    "▽", "▼", "☆", "★", "✦", "✧", "✩", "✪",
    // 교육/학습
    "✎", "✏", "✐", "✑", "✒", "✍", "✄", "✁",
    // 음악
    "♩", "♪", "♫", "♬", "♭", "♮", "♯", "🎵",
    // 특수 문자
    "※", "†", "‡", "§", "¶", "⁂", "⁑", "⁕",
    // 화살표/방향
    "→", "←", "↑", "↓", "↔", "↕", "⇒", "⇐",
    // 체크/표시
    "✓", "✗", "✔", "✘", "⊕", "⊖", "⊗", "⊙",
  ];

  useEffect(() => {
    loadData();
  }, [params.id]);

  // 이모지 피커 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const loadData = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      router.push("/dashboard");
      return;
    }

    const groupData = data as Group;
    setGroup(groupData);
    setName(groupData.name);
    setDescription(groupData.description || "");
    setIcon(groupData.icon || "");
    // 아이콘이 URL이면 이미지, 아니면 이모지
    setIconType(groupData.icon?.startsWith("http") ? "image" : "emoji");

    const settings = groupData.settings || {};
    setAttendanceCheck(settings.attendance_check || false);
    setMultiInstructor(settings.multi_instructor || false);
    setAllowGuardian(settings.allow_guardian || false);
    setHasPracticeRoom(settings.has_practice_room || false);
    setPracticeRoomStart(settings.practice_room_hours?.start || "09:00");
    setPracticeRoomEnd(settings.practice_room_hours?.end || "22:00");
    setPracticeRoomSlotUnit(settings.practice_room_slot_unit || 60);
    setClasses(settings.classes || []);
    setExcludedPracticeClasses(settings.excluded_practice_classes || []);
    setInviteCodeType(settings.invite_code_type || 'one_time');
    setInviteCodeExpiry(settings.invite_code_expiry || "");

    setIsLoading(false);
    setHasChanges(false);

    // 멤버 목록 로드
    loadMembers();
  };

  const loadMembers = async () => {
    const supabase = createClient();
    const { data: membersData } = await supabase
      .from("group_members")
      .select(`
        *,
        profile:profiles(name)
      `)
      .eq("group_id", params.id)
      .in("role", ["instructor", "student"]);

    if (membersData) {
      setMembers(membersData as any);
    }
  };

  const markChanged = () => setHasChanges(true);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    const supabase = createClient();

    const settings: GroupSettings = {
      ...group?.settings,
      attendance_check: attendanceCheck,
      multi_instructor: multiInstructor,
      allow_guardian: allowGuardian,
      has_practice_room: hasPracticeRoom,
      practice_room_hours: {
        start: practiceRoomStart,
        end: practiceRoomEnd,
      },
      practice_room_slot_unit: practiceRoomSlotUnit,
      classes,
      excluded_practice_classes: excludedPracticeClasses,
      invite_code_type: inviteCodeType,
      invite_code_expiry: inviteCodeExpiry || undefined,
    };

    await supabase
      .from("groups")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
        settings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    setIsSaving(false);
    setHasChanges(false);
    toast.success("설정이 저장되었습니다.");

    // 사이드바 그룹 목록 갱신
    await refreshGroups();
    // 서버 컴포넌트 갱신 (헤더 등)
    router.refresh();

    loadData();
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) return;

    const newClass: ClassRoom = {
      id: `class-${Date.now()}`,
      name: newClassName.trim(),
    };

    setClasses([...classes, newClass]);
    setNewClassName("");
    markChanged();
  };

  const handleRemoveClass = (classId: string) => {
    setClasses(classes.filter((c) => c.id !== classId));
    setExcludedPracticeClasses(excludedPracticeClasses.filter((name) => {
      const cls = classes.find((c) => c.id === classId);
      return cls?.name !== name;
    }));
    markChanged();
  };

  const toggleExcludedClass = (className: string) => {
    if (excludedPracticeClasses.includes(className)) {
      setExcludedPracticeClasses(excludedPracticeClasses.filter((n) => n !== className));
    } else {
      setExcludedPracticeClasses([...excludedPracticeClasses, className]);
    }
    markChanged();
  };

  const regenerateInviteCode = async () => {
    const confirmed = await confirm({
      title: "초대 코드 재생성",
      message: "초대 코드를 새로 생성하시겠습니까?\n기존 코드는 더 이상 사용할 수 없습니다.",
      confirmText: "재생성",
    });
    if (!confirmed) return;

    const supabase = createClient();
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    await supabase
      .from("groups")
      .update({ invite_code: newCode })
      .eq("id", params.id);

    toast.success("초대 코드가 재생성되었습니다.");
    loadData();
  };

  const handleDelete = async () => {
    const firstConfirm = await confirm({
      title: "모임 삭제",
      message: "정말 모임을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
      confirmText: "삭제",
      variant: "destructive",
    });
    if (!firstConfirm) return;

    const secondConfirm = await confirm({
      title: "최종 확인",
      message: "모든 데이터가 삭제됩니다.\n정말 삭제하시겠습니까?",
      confirmText: "삭제",
      variant: "destructive",
    });
    if (!secondConfirm) return;

    const supabase = createClient();
    await supabase.from("groups").delete().eq("id", params.id);
    router.push("/dashboard");
  };

  const copyInviteCode = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      toast.success("초대 코드가 복사되었습니다.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 유효성 검사
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("파일 크기는 2MB 이하여야 합니다.");
      return;
    }

    setIsUploadingImage(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `group-${params.id}-${Date.now()}.${fileExt}`;
      const filePath = `group-icons/${fileName}`;

      // 기존 이미지 삭제 (있다면)
      if (icon && icon.startsWith("http")) {
        const oldPath = icon.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("public").remove([`group-icons/${oldPath}`]);
        }
      }

      // 새 이미지 업로드
      const { error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from("public")
        .getPublicUrl(filePath);

      setIcon(publicUrl);
      setIconType("image");
      markChanged();
      toast.success("아이콘 이미지가 업로드되었습니다.");
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setIcon(emoji);
    setIconType("emoji");
    setShowEmojiPicker(false);
    markChanged();
  };

  const handleRemoveIcon = () => {
    setIcon("");
    setIconType("emoji");
    markChanged();
  };

  // 학생에게 담당 강사 배정
  const assignStudentToInstructor = async (studentId: string, instructorId: string | null) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("group_members")
      .update({ instructor_id: instructorId })
      .eq("id", studentId);

    if (error) {
      toast.error("담당 강사 배정에 실패했습니다.");
      return;
    }

    // 로컬 상태 업데이트
    setMembers(members.map(m =>
      m.id === studentId ? { ...m, instructor_id: instructorId ?? undefined } : m
    ));
    toast.success("담당 강사가 배정되었습니다.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!group) return null;

  const isEducationType = group.type === "education";

  // 메뉴 아이템
  const instructors = members.filter(m => m.role === "instructor");
  const students = members.filter(m => m.role === "student");

  const menuItems = [
    { id: "basic" as SettingsSection, label: "기본 정보", icon: Info },
    { id: "invite" as SettingsSection, label: "초대 코드", icon: Link2 },
    { id: "education" as SettingsSection, label: "교육 설정", icon: GraduationCap, show: isEducationType },
    { id: "practice" as SettingsSection, label: "연습실 설정", icon: Building2, show: isEducationType },
    { id: "classes" as SettingsSection, label: "클래스 관리", icon: Settings, show: isEducationType },
    { id: "instructors" as SettingsSection, label: "강사 관리", icon: Users, show: isEducationType && instructors.length > 0 },
    { id: "danger" as SettingsSection, label: "모임 관리", icon: AlertTriangle },
  ].filter(item => item.show !== false);

  // Toggle 컴포넌트
  const Toggle = ({ checked, onChange, label, description }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <label className="flex items-center justify-between py-3 cursor-pointer group">
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => { onChange(!checked); markChanged(); }}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </label>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          모임 설정
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className="w-56 border-r bg-muted/30 shrink-0 hidden md:block overflow-auto">
          <nav className="p-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <ChevronRight className={cn(
                    "h-4 w-4 ml-auto transition-transform",
                    isActive && "rotate-90"
                  )} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Menu - Tab Style */}
        <div className="flex flex-col flex-1 md:hidden">
          <div className="flex overflow-x-auto border-b px-2 scrollbar-hide shrink-0">
            {menuItems.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-auto p-4">
            {renderContent()}
          </div>
        </div>

        {/* Desktop Content */}
        <div className="flex-1 overflow-auto hidden md:block">
          <div className="max-w-xl p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );

  // 콘텐츠 렌더링 함수
  function renderContent() {
    return (
      <div className="space-y-6">
        {/* 기본 정보 */}
        {activeSection === "basic" && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-1">기본 정보</h3>
              <p className="text-sm text-muted-foreground">모임의 기본 정보를 설정합니다.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">모임 이름</label>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); markChanged(); }}
                  placeholder="모임 이름"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">설명</label>
                <Textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markChanged(); }}
                  placeholder="모임에 대한 설명"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">아이콘</label>
                <div className="flex items-start gap-3">
                  {/* 현재 아이콘 미리보기 */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30 overflow-hidden">
                      {icon ? (
                        iconType === "image" ? (
                          <img
                            src={icon}
                            alt="Group icon"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">{icon}</span>
                        )
                      ) : (
                        <Smile className="h-6 w-6 text-muted-foreground/50" />
                      )}
                    </div>
                    {icon && (
                      <button
                        type="button"
                        onClick={handleRemoveIcon}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* 선택 버튼들 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      {/* 아이콘 선택 버튼 */}
                      <div className="relative" ref={emojiPickerRef}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="gap-1.5"
                        >
                          <Smile className="h-4 w-4" />
                          아이콘
                        </Button>

                        {/* 아이콘 피커 팝업 */}
                        {showEmojiPicker && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-background border rounded-lg shadow-lg p-3 w-64">
                            <p className="text-xs text-muted-foreground mb-2">아이콘 선택</p>
                            <div className="grid grid-cols-8 gap-1">
                              {simpleIcons.map((emoji, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className={cn(
                                    "w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-muted transition-colors",
                                    icon === emoji && "bg-primary/10 ring-1 ring-primary"
                                  )}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-muted-foreground mb-2">직접 입력</p>
                              <Input
                                value={iconType === "emoji" ? icon : ""}
                                onChange={(e) => {
                                  setIcon(e.target.value);
                                  setIconType("emoji");
                                  markChanged();
                                }}
                                placeholder="아이콘 입력..."
                                maxLength={4}
                                className="text-center text-lg"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 이미지 업로드 버튼 */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="gap-1.5"
                      >
                        {isUploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        이미지
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      아이콘이나 이미지를 선택하세요 (최대 2MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 초대 코드 */}
        {activeSection === "invite" && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-1">초대 코드</h3>
              <p className="text-sm text-muted-foreground">새 멤버를 초대하기 위한 코드를 관리합니다.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 p-4 bg-muted rounded-lg font-mono text-xl tracking-[0.3em] text-center font-bold">
                  {group?.invite_code}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="icon" onClick={copyInviteCode} title="복사">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={regenerateInviteCode} title="재생성">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <label className="text-sm font-medium">코드 유형</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setInviteCodeType('one_time'); markChanged(); }}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors",
                      inviteCodeType === 'one_time'
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">단발성</span>
                      {inviteCodeType === 'one_time' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      한 명이 사용하면 자동 만료
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInviteCodeType('expiry'); markChanged(); }}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-colors",
                      inviteCodeType === 'expiry'
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">유효기간</span>
                      {inviteCodeType === 'expiry' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      기간 내 여러 명 사용 가능
                    </p>
                  </button>
                </div>

                {inviteCodeType === 'expiry' && (
                  <div className="space-y-2 pt-2">
                    <label className="text-sm text-muted-foreground">만료일</label>
                    <Input
                      type="date"
                      value={inviteCodeExpiry}
                      onChange={(e) => { setInviteCodeExpiry(e.target.value); markChanged(); }}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 교육 설정 */}
        {activeSection === "education" && isEducationType && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-1">교육 설정</h3>
              <p className="text-sm text-muted-foreground">교육 관련 기능을 설정합니다.</p>
            </div>

            <div className="divide-y">
              <Toggle
                checked={attendanceCheck}
                onChange={setAttendanceCheck}
                label="출석 체크"
                description="QR 코드를 통한 출석 체크 기능을 사용합니다."
              />
              <Toggle
                checked={multiInstructor}
                onChange={setMultiInstructor}
                label="다중 강사"
                description="여러 명의 강사가 수업을 진행할 수 있습니다."
              />
              <Toggle
                checked={allowGuardian}
                onChange={setAllowGuardian}
                label="보호자 계정"
                description="학생의 보호자가 별도로 가입할 수 있습니다."
              />
            </div>
          </>
        )}

        {/* 연습실 설정 */}
        {activeSection === "practice" && isEducationType && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-1">연습실 설정</h3>
              <p className="text-sm text-muted-foreground">연습실 예약 기능을 설정합니다.</p>
            </div>

            <div className="space-y-4">
              <Toggle
                checked={hasPracticeRoom}
                onChange={setHasPracticeRoom}
                label="연습실 사용"
                description="학생들이 연습실을 예약할 수 있습니다."
              />

              {hasPracticeRoom && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">시작 시간</label>
                      <Input
                        type="time"
                        value={practiceRoomStart}
                        onChange={(e) => { setPracticeRoomStart(e.target.value); markChanged(); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">종료 시간</label>
                      <Input
                        type="time"
                        value={practiceRoomEnd}
                        onChange={(e) => { setPracticeRoomEnd(e.target.value); markChanged(); }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">예약 단위</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[30, 60].map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => { setPracticeRoomSlotUnit(min as 30 | 60); markChanged(); }}
                          className={cn(
                            "py-2.5 rounded-lg text-sm font-medium transition-colors border-2",
                            practiceRoomSlotUnit === min
                              ? "border-primary bg-primary/5"
                              : "border-transparent bg-muted hover:bg-muted/80"
                          )}
                        >
                          {min}분
                        </button>
                      ))}
                    </div>
                  </div>

                  {classes.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">연습실 제외 클래스</label>
                      <p className="text-xs text-muted-foreground mb-2">
                        선택한 클래스는 연습실로 사용하지 않습니다.
                      </p>
                      <div className="space-y-1">
                        {classes.map((cls) => (
                          <label
                            key={cls.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={excludedPracticeClasses.includes(cls.name)}
                              onChange={() => toggleExcludedClass(cls.name)}
                              className="rounded"
                            />
                            <span className="text-sm">{cls.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* 클래스 관리 */}
        {activeSection === "classes" && isEducationType && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-1">클래스 관리</h3>
              <p className="text-sm text-muted-foreground">수업에 사용할 클래스(교실)를 관리합니다.</p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="새 클래스 이름"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddClass();
                    }
                  }}
                />
                <Button onClick={handleAddClass} disabled={!newClassName.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>

              {classes.length > 0 ? (
                <div className="space-y-2">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
                    >
                      <span className="text-sm font-medium flex-1">{cls.name}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={cls.capacity || ""}
                          onChange={(e) => {
                            const capacity = parseInt(e.target.value) || undefined;
                            setClasses(classes.map(c =>
                              c.id === cls.id ? { ...c, capacity } : c
                            ));
                            markChanged();
                          }}
                          placeholder="인원"
                          className="w-20 h-8 text-sm text-center"
                          min={1}
                        />
                        <span className="text-xs text-muted-foreground">명</span>
                      </div>
                      <button
                        onClick={() => handleRemoveClass(cls.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive rounded transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">등록된 클래스가 없습니다</p>
                  <p className="text-xs mt-1">클래스를 추가하면 수업 및 예약에 사용됩니다.</p>
                </div>
              )}

              {hasPracticeRoom && classes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  * 인원을 설정하면 해당 클래스에 설정된 인원까지 예약이 가능합니다.
                </p>
              )}
            </div>
          </>
        )}

        {/* 강사 관리 */}
        {activeSection === "instructors" && isEducationType && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-1">강사 관리</h3>
              <p className="text-sm text-muted-foreground">각 강사에게 담당 학생을 배정합니다.</p>
            </div>

            <div className="space-y-4">
              {instructors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">등록된 강사가 없습니다</p>
                </div>
              ) : (
                <>
                  {/* 강사 선택 탭 */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {instructors.map((instructor) => (
                      <button
                        key={instructor.id}
                        onClick={() => setSelectedInstructor(
                          selectedInstructor === instructor.id ? null : instructor.id
                        )}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                          selectedInstructor === instructor.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {instructor.profile?.name || "이름 없음"}
                        <span className="ml-2 text-xs opacity-70">
                          ({students.filter(s => s.instructor_id === instructor.user_id).length}명)
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* 담당 학생 목록 */}
                  {selectedInstructor && (
                    <div className="space-y-3 border rounded-lg p-4">
                      <h4 className="font-medium text-sm">담당 학생 선택</h4>
                      <p className="text-xs text-muted-foreground">
                        선택한 학생들이 이 강사에게 배정됩니다.
                      </p>

                      {students.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          등록된 학생이 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {students.map((student) => {
                            const selectedInstructorData = instructors.find(i => i.id === selectedInstructor);
                            const isAssigned = student.instructor_id === selectedInstructorData?.user_id;
                            const currentInstructor = instructors.find(i => i.user_id === student.instructor_id);

                            return (
                              <label
                                key={student.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                  isAssigned ? "bg-primary/10" : "hover:bg-muted/50"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => {
                                    const selectedInstructorData = instructors.find(i => i.id === selectedInstructor);
                                    assignStudentToInstructor(
                                      student.id,
                                      isAssigned ? null : selectedInstructorData?.user_id || null
                                    );
                                  }}
                                  className="rounded"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium">
                                    {student.profile?.name || "이름 없음"}
                                  </span>
                                  {currentInstructor && !isAssigned && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (현재: {currentInstructor.profile?.name})
                                    </span>
                                  )}
                                </div>
                                {isAssigned && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedInstructor && (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <p className="text-sm">위에서 강사를 선택하세요</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* 모임 관리 */}
        {activeSection === "danger" && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-1">모임 관리</h3>
              <p className="text-sm text-muted-foreground">모임 삭제 등 주요 설정을 관리합니다.</p>
            </div>

            <div className="rounded-lg border border-destructive/30 p-4 space-y-4">
              <div>
                <h4 className="font-medium">모임 삭제</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  모임을 삭제하면 모든 멤버, 수업, 공지사항 등 모든 데이터가 영구적으로 삭제됩니다.
                </p>
              </div>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                모임 삭제
              </Button>
            </div>
          </>
        )}

        {/* Save Button */}
        {activeSection !== "danger" && (
          <div className="pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="w-full"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {hasChanges ? "변경사항 저장" : "저장됨"}
            </Button>
          </div>
        )}
      </div>
    );
  }
}
