"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnnouncementComment } from "@/types";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Send,
  CornerDownRight,
  X,
  Loader2,
} from "lucide-react";

interface CommentSectionProps {
  announcementId: string;
  groupId: string;
  onCommentCountChange?: (count: number) => void;
}

// 역할을 한글로 변환
const getRoleLabel = (role: string): string => {
  const roleMap: Record<string, string> = {
    owner: "원장",
    admin: "관리자",
    instructor: "강사",
    guardian: "보호자",
    member: "회원",
  };
  return roleMap[role] || role;
};

export function CommentSection({ announcementId, groupId, onCommentCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<AnnouncementComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadComments();
    getCurrentUser();
  }, [announcementId]);

  const getCurrentUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadComments = async () => {
    const supabase = createClient();

    // 댓글 조회
    const { data: commentsData, error } = await supabase
      .from("announcement_comments")
      .select("*")
      .eq("announcement_id", announcementId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load comments:", error);
      setIsLoading(false);
      return;
    }

    if (commentsData && commentsData.length > 0) {
      // 작성자 정보 조회 (profiles 테이블에서)
      const authorIds = Array.from(new Set(commentsData.map(c => c.author_id)));
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", authorIds);

      // 그룹 멤버 정보 조회 (직책/역할)
      const { data: membersData } = await supabase
        .from("group_members")
        .select("user_id, role, nickname")
        .eq("group_id", groupId)
        .in("user_id", authorIds);

      const usersMap: Record<string, { id: string; name: string; avatar_url?: string; role?: string }> = {};
      profilesData?.forEach(u => {
        usersMap[u.id] = { ...u };
      });

      // 멤버 역할 정보 병합
      membersData?.forEach(m => {
        if (usersMap[m.user_id]) {
          usersMap[m.user_id].role = m.nickname || getRoleLabel(m.role);
        }
      });

      // 댓글에 작성자 정보 추가
      const commentsWithAuthor = commentsData.map(c => ({
        ...c,
        author: usersMap[c.author_id] || { id: c.author_id, name: "알 수 없음", role: "" },
      }));

      // 댓글을 부모-자식 구조로 정리
      const parentComments: AnnouncementComment[] = [];
      const repliesMap: Record<string, AnnouncementComment[]> = {};

      commentsWithAuthor.forEach((comment: AnnouncementComment) => {
        if (comment.parent_id) {
          if (!repliesMap[comment.parent_id]) {
            repliesMap[comment.parent_id] = [];
          }
          repliesMap[comment.parent_id].push(comment);
        } else {
          parentComments.push(comment);
        }
      });

      // 부모 댓글에 대댓글 연결
      const structuredComments = parentComments.map(parent => ({
        ...parent,
        replies: repliesMap[parent.id] || [],
      }));

      setComments(structuredComments);
      onCommentCountChange?.(commentsData.length);
    } else {
      setComments([]);
      onCommentCountChange?.(0);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    // 답글이면 ref에서, 일반 댓글이면 state에서 값 가져오기
    const content = replyTo
      ? replyTextareaRef.current?.value?.trim()
      : newComment.trim();

    if (!content || isSubmitting) return;

    // 상태 저장 후 UI 즉시 업데이트
    const parentId = replyTo?.id || null;
    const isReplyMode = !!replyTo;

    setIsSubmitting(true);
    if (isReplyMode) {
      setReplyTo(null); // 인라인 입력창 즉시 숨김
    } else {
      setNewComment(""); // 하단 입력창 비우기
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("announcement_comments").insert({
      announcement_id: announcementId,
      author_id: user.id,
      parent_id: parentId,
      content,
    });

    if (!error) {
      // 댓글 목록 새로고침
      await loadComments();

      // 새 댓글로 스크롤
      setTimeout(() => scrollToBottom(), 100);

      // 댓글 수 업데이트 (RPC가 없어도 동작하도록)
      try {
        await supabase.rpc("increment_comment_count", {
          announcement_id: announcementId,
        });
      } catch {
        // RPC가 없으면 무시
      }
    } else {
      console.error("Failed to add comment:", error);
      alert("댓글 작성에 실패했습니다.");
    }

    setIsSubmitting(false);
  };

  const handleEdit = async (commentId: string) => {
    const content = editTextareaRef.current?.value?.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("announcement_comments")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", commentId);

    if (!error) {
      setEditingId(null);
      await loadComments();
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    const supabase = createClient();

    // 대댓글도 함께 삭제
    await supabase.from("announcement_comments").delete().eq("parent_id", commentId);
    const { error } = await supabase.from("announcement_comments").delete().eq("id", commentId);

    if (!error) {
      await loadComments();

      // 댓글 수 감소 (RPC가 없어도 동작하도록)
      try {
        await supabase.rpc("decrement_comment_count", {
          announcement_id: announcementId,
        });
      } catch {
        // RPC가 없으면 무시
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  const CommentItem = ({ comment, isReply = false }: { comment: AnnouncementComment; isReply?: boolean }) => {
    const isOwner = currentUserId === comment.author_id;
    const isEditing = editingId === comment.id;

    return (
      <div className={`${isReply ? "ml-6 pl-3 border-l-2 border-muted/50" : ""}`}>
        <div className="flex gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors">
          {/* Avatar */}
          <div className="shrink-0">
            {comment.author?.avatar_url ? (
              <img
                src={comment.author.avatar_url}
                alt={comment.author.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {comment.author?.name?.[0] || "?"}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.author?.name || "알 수 없음"}</span>
              {comment.author?.role && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {comment.author.role}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-muted-foreground">(수정됨)</span>
              )}
            </div>

            {isEditing ? (
              <div className="flex gap-2 items-end">
                <textarea
                  ref={editTextareaRef}
                  defaultValue={comment.content}
                  className="flex-1 min-h-[60px] p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                  onFocus={(e) => {
                    // 커서를 텍스트 끝으로 이동
                    const len = e.target.value.length;
                    e.target.setSelectionRange(len, len);
                  }}
                  onKeyDown={(e) => {
                    // 한글 IME 조합 중에는 무시
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleEdit(comment.id);
                    }
                  }}
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEdit(comment.id)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {!isReply && (
                    <button
                      onClick={() => setReplyTo({ id: comment.id, authorName: comment.author?.name || "" })}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      답글
                    </button>
                  )}
                  {isOwner && (
                    <>
                      {!isReply && <span className="text-muted-foreground/30">·</span>}
                      <button
                        onClick={() => setEditingId(comment.id)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        수정
                      </button>
                      <span className="text-muted-foreground/30">·</span>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-0">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}

        {/* Inline Reply Input */}
        {!isReply && replyTo?.id === comment.id && (
          <div className="ml-6 pl-3 border-l-2 border-primary/30 mt-2">
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <CornerDownRight className="h-3 w-3" />
              <span className="font-medium text-foreground">{replyTo.authorName}</span>님에게 답글
              <button
                onClick={() => {
                  setReplyTo(null);
                  if (replyTextareaRef.current) {
                    replyTextareaRef.current.value = "";
                  }
                }}
                className="ml-auto p-0.5 hover:bg-muted rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                ref={replyTextareaRef}
                placeholder="답글을 입력하세요..."
                className="flex-1 min-h-[40px] max-h-24 p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                onKeyDown={(e) => {
                  // 한글 IME 조합 중에는 Enter 무시
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                  if (e.key === "Escape") {
                    setReplyTo(null);
                    if (replyTextareaRef.current) {
                      replyTextareaRef.current.value = "";
                    }
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-9 w-9 shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment List */}
      {comments.length > 0 ? (
        <div className="space-y-1">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              <CommentItem comment={comment} />
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          첫 댓글을 남겨보세요
        </div>
      )}

      {/* Comment Input - hidden when replying (reply input is inline) */}
      {!replyTo && (
        <div className="flex gap-2 items-end">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="flex-1 min-h-[44px] max-h-32 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={(e) => {
              // 한글 IME 조합 중에는 무시
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            className="h-11 w-11 shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
