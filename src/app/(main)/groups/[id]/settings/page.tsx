"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Loader2,
  Save,
  Trash2,
  Copy,
  RefreshCw,
  AlertTriangle,
  Plus,
  X,
} from "lucide-react";
import { Group, GroupSettings, ClassRoom } from "@/types";

interface SettingsPageProps {
  params: { id: string };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 기본 정보
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");

  // 교육 타입 설정
  const [attendanceCheck, setAttendanceCheck] = useState(false);
  const [multiInstructor, setMultiInstructor] = useState(false);
  const [allowGuardian, setAllowGuardian] = useState(false);
  const [hasPracticeRoom, setHasPracticeRoom] = useState(false);
  const [practiceRoomStart, setPracticeRoomStart] = useState("09:00");
  const [practiceRoomEnd, setPracticeRoomEnd] = useState("22:00");
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [excludedPracticeClasses, setExcludedPracticeClasses] = useState<string[]>([]);

  // 새 클래스 추가
  const [newClassName, setNewClassName] = useState("");

  // 초대 코드 설정
  const [inviteCodeType, setInviteCodeType] = useState<'one_time' | 'expiry'>('one_time');
  const [inviteCodeExpiry, setInviteCodeExpiry] = useState("");

  useEffect(() => {
    loadData();
  }, [params.id]);

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

    const settings = groupData.settings || {};
    setAttendanceCheck(settings.attendance_check || false);
    setMultiInstructor(settings.multi_instructor || false);
    setAllowGuardian(settings.allow_guardian || false);
    setHasPracticeRoom(settings.has_practice_room || false);
    setPracticeRoomStart(settings.practice_room_hours?.start || "09:00");
    setPracticeRoomEnd(settings.practice_room_hours?.end || "22:00");
    setClasses(settings.classes || []);
    setExcludedPracticeClasses(settings.excluded_practice_classes || []);
    setInviteCodeType(settings.invite_code_type || 'one_time');
    setInviteCodeExpiry(settings.invite_code_expiry || "");

    setIsLoading(false);
  };

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
  };

  const handleRemoveClass = (classId: string) => {
    setClasses(classes.filter((c) => c.id !== classId));
    setExcludedPracticeClasses(excludedPracticeClasses.filter((name) => {
      const cls = classes.find((c) => c.id === classId);
      return cls?.name !== name;
    }));
  };

  const toggleExcludedClass = (className: string) => {
    if (excludedPracticeClasses.includes(className)) {
      setExcludedPracticeClasses(excludedPracticeClasses.filter((n) => n !== className));
    } else {
      setExcludedPracticeClasses([...excludedPracticeClasses, className]);
    }
  };

  const regenerateInviteCode = async () => {
    if (!confirm("초대 코드를 새로 생성하시겠습니까? 기존 코드는 더 이상 사용할 수 없습니다.")) return;

    const supabase = createClient();
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    await supabase
      .from("groups")
      .update({ invite_code: newCode })
      .eq("id", params.id);

    loadData();
  };

  const handleDelete = async () => {
    if (!confirm("정말 모임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    if (!confirm("모든 데이터가 삭제됩니다. 정말 삭제하시겠습니까?")) return;

    const supabase = createClient();
    await supabase.from("groups").delete().eq("id", params.id);
    router.push("/dashboard");
  };

  const copyInviteCode = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
    }
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="h-5 w-5" />
        모임 설정
      </h2>

      {/* Basic Info */}
      <div className="rounded-xl border p-4 space-y-4">
        <h3 className="font-medium">기본 정보</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">모임 이름</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="모임 이름"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">설명</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="모임에 대한 설명"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">아이콘 (이모지)</label>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="예: 📚"
            maxLength={4}
            className="w-20 text-center text-2xl"
          />
        </div>
      </div>

      {/* Invite Code */}
      <div className="rounded-xl border p-4 space-y-4">
        <h3 className="font-medium">초대 코드</h3>

        <div className="flex items-center gap-2">
          <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-lg tracking-wider text-center">
            {group.invite_code}
          </div>
          <Button variant="outline" size="icon" onClick={copyInviteCode}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={regenerateInviteCode}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Code Type */}
        <div className="space-y-3">
          <label className="text-sm text-muted-foreground">코드 유형</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInviteCodeType('one_time')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                inviteCodeType === 'one_time'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              단발성
            </button>
            <button
              type="button"
              onClick={() => setInviteCodeType('expiry')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                inviteCodeType === 'expiry'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              유효기간
            </button>
          </div>

          {inviteCodeType === 'one_time' ? (
            <p className="text-xs text-muted-foreground">
              한 명이 사용하면 자동으로 만료됩니다.
            </p>
          ) : (
            <div className="space-y-2">
              <Input
                type="date"
                value={inviteCodeExpiry}
                onChange={(e) => setInviteCodeExpiry(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">
                설정한 날짜까지 여러 명이 사용할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Education Settings */}
      {isEducationType && (
        <>
          <div className="rounded-xl border p-4 space-y-4">
            <h3 className="font-medium">교육 설정</h3>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">출석 체크 사용</span>
              <input
                type="checkbox"
                checked={attendanceCheck}
                onChange={(e) => setAttendanceCheck(e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">다중 강사 허용</span>
              <input
                type="checkbox"
                checked={multiInstructor}
                onChange={(e) => setMultiInstructor(e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">보호자 계정 허용</span>
              <input
                type="checkbox"
                checked={allowGuardian}
                onChange={(e) => setAllowGuardian(e.target.checked)}
                className="rounded"
              />
            </label>
          </div>

          {/* Practice Room Settings */}
          <div className="rounded-xl border p-4 space-y-4">
            <h3 className="font-medium">연습실 설정</h3>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">연습실 사용</span>
              <input
                type="checkbox"
                checked={hasPracticeRoom}
                onChange={(e) => setHasPracticeRoom(e.target.checked)}
                className="rounded"
              />
            </label>

            {hasPracticeRoom && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">시작 시간</label>
                    <Input
                      type="time"
                      value={practiceRoomStart}
                      onChange={(e) => setPracticeRoomStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">종료 시간</label>
                    <Input
                      type="time"
                      value={practiceRoomEnd}
                      onChange={(e) => setPracticeRoomEnd(e.target.value)}
                    />
                  </div>
                </div>

                {classes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      연습실로 사용하지 않을 클래스
                    </label>
                    <div className="space-y-1">
                      {classes.map((cls) => (
                        <label
                          key={cls.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={excludedPracticeClasses.includes(cls.name)}
                            onChange={() => toggleExcludedClass(cls.name)}
                            className="rounded"
                          />
                          {cls.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Class Management */}
          <div className="rounded-xl border p-4 space-y-4">
            <h3 className="font-medium">클래스 관리</h3>

            <div className="flex gap-2">
              <Input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="클래스 이름"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddClass();
                  }
                }}
              />
              <Button variant="outline" onClick={handleAddClass}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {classes.length > 0 ? (
              <div className="space-y-2">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{cls.name}</span>
                    <button
                      onClick={() => handleRemoveClass(cls.id)}
                      className="p-1 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                등록된 클래스가 없습니다
              </p>
            )}
          </div>
        </>
      )}

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        저장
      </Button>

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/50 p-4 space-y-4">
        <h3 className="font-medium text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          위험 구역
        </h3>
        <p className="text-sm text-muted-foreground">
          모임을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
        </p>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          모임 삭제
        </Button>
      </div>
    </div>
  );
}
