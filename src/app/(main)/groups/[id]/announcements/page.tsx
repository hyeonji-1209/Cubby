"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CommentSection } from "@/components/announcements/comment-section";
import {
  Bell,
  Plus,
  Pin,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Heart,
  MessageCircle,
  X,
} from "lucide-react";
import { Announcement } from "@/types";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDateShort, formatDateTimeFull } from "@/lib/date-utils";
import { useUser } from "@/lib/contexts/user-context";
import { useGroup } from "@/lib/contexts/group-context";

interface AnnouncementsPageProps {
  params: { id: string };
}

export default function AnnouncementsPage({ params }: AnnouncementsPageProps) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { user } = useUser();
  const { membership, isOwner, canManage } = useGroup();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [likedAnnouncements, setLikedAnnouncements] = useState<Set<string>>(new Set());
  const [likingId, setLikingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [params.id, user?.id]);

  const loadData = async () => {
    if (!user) return;
    const supabase = createClient();

    // 공지사항 로드 (membership 정보는 context에서 가져옴)
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("group_id", params.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // 강사 전용 공지 필터링
    const filteredData = (data as Announcement[] || []).filter(ann => {
      if (!ann.is_instructor_only) return true;
      return isOwner || membership.role === "instructor";
    });

    setAnnouncements(filteredData);

    // 사용자가 좋아요한 공지 확인
    const { data: likes } = await supabase
      .from("announcement_likes")
      .select("announcement_id")
      .eq("user_id", user.id);

    if (likes) {
      setLikedAnnouncements(new Set(likes.map(l => l.announcement_id)));
    }

    setIsLoading(false);
  };

  const handleRowClick = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);

    // 조회수 증가
    const supabase = createClient();
    await supabase.rpc("increment_view_count", {
      announcement_id: announcement.id,
    });

    // 로컬 상태 업데이트
    setAnnouncements(prev =>
      prev.map(a =>
        a.id === announcement.id ? { ...a, view_count: (a.view_count || 0) + 1 } : a
      )
    );
  };

  const handleLike = async (announcementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (likingId || !user?.id) return;

    setLikingId(announcementId);
    const supabase = createClient();
    const isLiked = likedAnnouncements.has(announcementId);

    if (isLiked) {
      await supabase
        .from("announcement_likes")
        .delete()
        .eq("announcement_id", announcementId)
        .eq("user_id", user?.id);

      setLikedAnnouncements(prev => {
        const next = new Set(prev);
        next.delete(announcementId);
        return next;
      });

      setAnnouncements(prev =>
        prev.map(a =>
          a.id === announcementId ? { ...a, like_count: Math.max(0, (a.like_count || 0) - 1) } : a
        )
      );

      if (selectedAnnouncement?.id === announcementId) {
        setSelectedAnnouncement(prev => prev ? { ...prev, like_count: Math.max(0, (prev.like_count || 0) - 1) } : null);
      }
    } else {
      await supabase.from("announcement_likes").insert({
        announcement_id: announcementId,
        user_id: user?.id,
      });

      setLikedAnnouncements(prev => {
        const next = new Set(prev);
        next.add(announcementId);
        return next;
      });

      setAnnouncements(prev =>
        prev.map(a =>
          a.id === announcementId ? { ...a, like_count: (a.like_count || 0) + 1 } : a
        )
      );

      if (selectedAnnouncement?.id === announcementId) {
        setSelectedAnnouncement(prev => prev ? { ...prev, like_count: (prev.like_count || 0) + 1 } : null);
      }
    }

    setLikingId(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "공지사항 삭제",
      message: "정말 삭제하시겠습니까?",
      confirmText: "삭제",
      variant: "destructive",
    });
    if (!confirmed) return;

    const supabase = createClient();

    const announcement = announcements.find(a => a.id === id);
    if (announcement?.attachments?.length) {
      const paths = announcement.attachments.map(a => {
        const urlParts = a.url.split("/announcements/");
        return urlParts[1];
      }).filter(Boolean);

      if (paths.length > 0) {
        await supabase.storage.from("announcements").remove(paths);
      }
    }

    await supabase.from("announcement_comments").delete().eq("announcement_id", id);
    await supabase.from("announcement_likes").delete().eq("announcement_id", id);
    await supabase.from("announcements").delete().eq("id", id);

    loadData();
    setOpenMenuId(null);
    if (selectedAnnouncement?.id === id) {
      setSelectedAnnouncement(null);
    }
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

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

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
        <h2 className="text-lg font-semibold">공지사항</h2>
        {canManage && (
          <Button
            size="sm"
            onClick={() => router.push(`/groups/${params.id}/announcements/write`)}
          >
            <Plus className="h-4 w-4 mr-1" />
            작성
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* List */}
        <div className={`overflow-auto ${selectedAnnouncement ? "hidden md:block md:w-80 lg:w-96 border-r" : "flex-1"}`}>
          {announcements.length > 0 ? (
            selectedAnnouncement ? (
              // 심플 리스트 (메일 스타일)
              <div className="divide-y">
                {announcements.map((announcement) => {
                  const isSelected = selectedAnnouncement?.id === announcement.id;

                  return (
                    <div
                      key={announcement.id}
                      className={`p-3 cursor-pointer transition-colors ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"
                        } ${announcement.is_pinned ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}`}
                      onClick={() => handleRowClick(announcement)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.is_pinned && (
                          <Pin className="h-3 w-3 text-blue-500 shrink-0" />
                        )}
                        {announcement.is_instructor_only && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                            강사
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDateShort(announcement.created_at)}
                        </span>
                        {announcement.attachments && announcement.attachments.length > 0 && (
                          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
                        )}
                      </div>
                      <p className={`text-sm truncate ${announcement.is_pinned || isSelected ? "font-medium" : ""}`}>
                        {announcement.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              // 풀 테이블 (패널 닫혔을 때)
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-3 px-4 font-medium w-12 text-center">No</th>
                    <th className="py-3 px-4 font-medium">제목</th>
                    <th className="py-3 px-4 font-medium w-20 text-center hidden sm:table-cell">
                      <Eye className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="py-3 px-4 font-medium w-20 text-center hidden sm:table-cell">
                      <Heart className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="py-3 px-4 font-medium w-20 text-center hidden sm:table-cell">
                      <MessageCircle className="h-4 w-4 mx-auto" />
                    </th>
                    <th className="py-3 px-4 font-medium w-28 text-center hidden md:table-cell">작성일</th>
                    {canManage && <th className="py-3 px-4 font-medium w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {announcements.map((announcement) => {
                    const isLiked = likedAnnouncements.has(announcement.id);
                    const displayNumber = announcement.is_pinned
                      ? null
                      : announcements.filter(a => !a.is_pinned).indexOf(announcement) + 1;

                    return (
                      <tr
                        key={announcement.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${announcement.is_pinned ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                          }`}
                        onClick={() => handleRowClick(announcement)}
                      >
                        <td className="py-3 px-4 text-center">
                          {announcement.is_pinned ? (
                            <Pin className="h-4 w-4 text-blue-500 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">{displayNumber}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {announcement.is_instructor_only && (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                                강사
                              </span>
                            )}
                            <span className={`truncate ${announcement.is_pinned ? "font-medium" : ""}`}>
                              {announcement.title}
                            </span>
                            {announcement.attachments && announcement.attachments.length > 0 && (
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground hidden sm:table-cell">
                          {announcement.view_count || 0}
                        </td>
                        <td className="py-3 px-4 text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleLike(announcement.id, e)}
                            className={`inline-flex items-center justify-center gap-1 transition-colors ${isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                              }`}
                            disabled={likingId === announcement.id}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
                            <span className="text-xs">{announcement.like_count || 0}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground hidden sm:table-cell">
                          {announcement.comment_count || 0}
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground hidden md:table-cell whitespace-nowrap">
                          {formatDateShort(announcement.created_at)}
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenMenuId(openMenuId === announcement.id ? null : announcement.id)
                                }
                                className="p-1 hover:bg-muted rounded"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {openMenuId === announcement.id && (
                                <div className="absolute right-0 top-8 w-28 bg-background border rounded-lg shadow-lg py-1 z-20">
                                  <button
                                    onClick={() => togglePin(announcement)}
                                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                  >
                                    <Pin className="h-3.5 w-3.5" />
                                    {announcement.is_pinned ? "고정해제" : "고정"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      router.push(`/groups/${params.id}/announcements/write?edit=${announcement.id}`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDelete(announcement.id)}
                                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    삭제
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
              <Bell className="h-12 w-12 mb-3 opacity-50" />
              <p>공지사항이 없습니다</p>
              {canManage && (
                <Button
                  variant="link"
                  onClick={() => router.push(`/groups/${params.id}/announcements/write`)}
                  className="mt-2"
                >
                  첫 공지를 작성해보세요
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedAnnouncement && (
          <div className="flex-1 flex flex-col bg-background overflow-hidden">
            {/* Detail Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                {selectedAnnouncement.is_pinned && (
                  <Pin className="h-4 w-4 text-blue-500" />
                )}
                {selectedAnnouncement.is_instructor_only && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    강사전용
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Edit/Delete for owner or author */}
                {(isOwner || user?.id === selectedAnnouncement.author_id) && (
                  <>
                    <button
                      onClick={() => {
                        router.push(`/groups/${params.id}/announcements/write?edit=${selectedAnnouncement.id}`);
                      }}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      title="수정"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedAnnouncement.id)}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="w-px h-4 bg-border mx-1" />
                  </>
                )}
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-1.5 hover:bg-muted rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{selectedAnnouncement.title}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span>{formatDateTimeFull(selectedAnnouncement.created_at)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {selectedAnnouncement.view_count || 0}
                  </span>
                </div>

                <div
                  className="prose prose-sm dark:prose-invert max-w-none mb-6 [&_p]:min-h-[1.5em] [&_p:empty]:min-h-[1.5em] [&_p:empty]:before:content-['\00a0']"
                  dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                />

                {/* Attachments */}
                {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                  <div className="border-t pt-4 mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      첨부파일 ({selectedAnnouncement.attachments.length})
                    </p>
                    <div className="space-y-1.5">
                      {selectedAnnouncement.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          {getFileIcon(attachment.type)}
                          <span className="flex-1 text-sm truncate">{attachment.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </span>
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Like Button */}
                <div className="border-t pt-4 mb-4">
                  <button
                    onClick={(e) => handleLike(selectedAnnouncement.id, e)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${likedAnnouncements.has(selectedAnnouncement.id)
                      ? "bg-red-50 border-red-200 text-red-500 dark:bg-red-950/30 dark:border-red-800"
                      : "hover:bg-muted"
                      }`}
                    disabled={likingId === selectedAnnouncement.id}
                  >
                    <Heart
                      className={`h-4 w-4 ${likedAnnouncements.has(selectedAnnouncement.id) ? "fill-current" : ""
                        }`}
                    />
                    <span className="text-sm">공감 {selectedAnnouncement.like_count || 0}</span>
                  </button>
                </div>

                {/* Comments */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    댓글 {selectedAnnouncement.comment_count || 0}
                  </h4>
                  <CommentSection
                    announcementId={selectedAnnouncement.id}
                    groupId={params.id}
                    onCommentCountChange={(count) => {
                      setAnnouncements(prev =>
                        prev.map(a =>
                          a.id === selectedAnnouncement.id ? { ...a, comment_count: count } : a
                        )
                      );
                      setSelectedAnnouncement(prev =>
                        prev ? { ...prev, comment_count: count } : null
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
