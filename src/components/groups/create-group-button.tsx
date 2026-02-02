"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const groupTypes = [
  {
    type: "education",
    title: "교육/학원",
    icon: "📚",
    description: "수업 관리, 출석, 수강료",
    color: "bg-blue-500/10 border-blue-500/30 hover:border-blue-500",
  },
  {
    type: "couple",
    title: "연인",
    icon: "❤️",
    description: "커플 일정, 기념일, 메시지",
    color: "bg-pink-500/10 border-pink-500/30 hover:border-pink-500",
  },
  {
    type: "family",
    title: "가족",
    icon: "👨‍👩‍👧‍👦",
    description: "가족 일정, 생일, 공유",
    color: "bg-green-500/10 border-green-500/30 hover:border-green-500",
  },
  {
    type: "religion",
    title: "종교",
    icon: "🙏",
    description: "모임 일정, 공지, 멤버",
    color: "bg-purple-500/10 border-purple-500/30 hover:border-purple-500",
  },
  {
    type: "hobby",
    title: "동호회",
    icon: "🎯",
    description: "취미 모임, 정기 모임",
    color: "bg-orange-500/10 border-orange-500/30 hover:border-orange-500",
  },
  {
    type: "other",
    title: "기타",
    icon: "📌",
    description: "자유로운 모임 관리",
    color: "bg-gray-500/10 border-gray-500/30 hover:border-gray-500",
  },
];

export function CreateGroupButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (type: string) => {
    setIsOpen(false);
    router.push(`/groups/create?type=${type}`);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        새 모임
      </Button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-background rounded-2xl w-full max-w-md max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">모임 타입 선택</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type Grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {groupTypes.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleSelect(item.type)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${item.color}`}
                >
                  <span className="text-3xl">{item.icon}</span>
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
