"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Plus,
  Pin,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { Announcement } from "@/types";

interface AnnouncementsPageProps {
  params: { id: string };
}

export default function AnnouncementsPage({ params }: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
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

    // 공지사항 로드
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("group_id", params.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    setAnnouncements((data as Announcement[]) || []);
    setIsLoading(false);
  };

  const canManage = userRole === "owner" || userRole === "admin" || userRole === "instructor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (editingId) {
      // 수정
      await supabase
        .from("announcements")
        .update({
          title: title.trim(),
          content: content.trim(),
          is_pinned: isPinned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);
    } else {
      // 새로 생성
      await supabase.from("announcements").insert({
        group_id: params.id,
        author_id: user?.id,
        title: title.trim(),
        content: content.trim(),
        is_pinned: isPinned,
      });
    }

    resetForm();
    loadData();
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsPinned(announcement.is_pinned);
    setShowForm(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const supabase = createClient();
    await supabase.from("announcements").delete().eq("id", id);
    loadData();
    setOpenMenuId(null);
  };

  const togglePin = async (announcement: Announcement) => {
    const supabase = createClient();
    await supabase
      .from("announcements")
      .update({ is_pinned: !announcement.is_pinned })
      .eq("id", announcement.id);
    loadData();
    setOpenMenuId(null);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setIsPinned(false);
    setIsSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
        <h2 className="text-lg font-semibold">공지사항</h2>
        {canManage && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            작성
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              {editingId ? "공지 수정" : "새 공지 작성"}
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
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            required
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded"
              />
              <Pin className="h-4 w-4" />
              상단 고정
            </label>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "수정"
                ) : (
                  "등록"
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Announcements List */}
      {announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-xl border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {announcement.is_pinned && (
                      <Pin className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <h3 className="font-medium truncate">{announcement.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(announcement.created_at)}
                  </p>
                </div>

                {canManage && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === announcement.id ? null : announcement.id
                        )
                      }
                      className="p-1 hover:bg-muted rounded"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {openMenuId === announcement.id && (
                      <div className="absolute right-0 top-8 w-32 bg-background border rounded-lg shadow-lg py-1 z-10">
                        <button
                          onClick={() => togglePin(announcement)}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                        >
                          <Pin className="h-4 w-4" />
                          {announcement.is_pinned ? "고정 해제" : "고정"}
                        </button>
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
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
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">공지사항이 없습니다</p>
          {canManage && (
            <Button
              variant="link"
              onClick={() => setShowForm(true)}
              className="mt-2"
            >
              첫 공지를 작성해보세요
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
