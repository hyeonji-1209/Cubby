import { useState, useEffect, useCallback } from 'react';
import { announcementApi } from '@/api';
import { useToast } from '@/components';
import { useAuthStore } from '@/store';
import type { Comment } from '@/types';
import './CommentSection.scss';

interface CommentSectionProps {
  announcementId: string;
  isAdmin: boolean;
}

const CommentSection = ({ announcementId, isAdmin }: CommentSectionProps) => {
  const toast = useToast();
  const { user } = useAuthStore();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 댓글 목록 조회
  const fetchComments = useCallback(async () => {
    try {
      const response = await announcementApi.getComments(announcementId);
      setComments(response.data);
    } catch (error) {
      console.error('댓글 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 댓글 작성
  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await announcementApi.createComment(announcementId, newComment.trim());
      await fetchComments();
      setNewComment('');
      toast.success('댓글이 작성되었습니다.');
    } catch {
      toast.error('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 대댓글 작성
  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      await announcementApi.createComment(announcementId, replyContent.trim(), parentId);
      await fetchComments();
      setReplyingTo(null);
      setReplyContent('');
      toast.success('답글이 작성되었습니다.');
    } catch {
      toast.error('답글 작성에 실패했습니다.');
    }
  };

  // 댓글 수정 시작
  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  // 댓글 수정 취소
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // 댓글 수정 저장
  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await announcementApi.updateComment(announcementId, commentId, editContent.trim());
      await fetchComments();
      setEditingId(null);
      setEditContent('');
      toast.success('댓글이 수정되었습니다.');
    } catch {
      toast.error('댓글 수정에 실패했습니다.');
    }
  };

  // 댓글 삭제
  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await announcementApi.deleteComment(announcementId, commentId);
      await fetchComments();
      toast.success('댓글이 삭제되었습니다.');
    } catch {
      toast.error('댓글 삭제에 실패했습니다.');
    }
  };

  // 좋아요 토글
  const handleLike = async (commentId: string) => {
    try {
      const response = await announcementApi.toggleCommentLike(announcementId, commentId);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, isLiked: response.data.isLiked, likeCount: response.data.likeCount };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, isLiked: response.data.isLiked, likeCount: response.data.likeCount }
                  : r
              ),
            };
          }
          return c;
        })
      );
    } catch {
      toast.error('좋아요 처리에 실패했습니다.');
    }
  };

  // 수정/삭제 권한 체크
  const canModify = (comment: Comment) => {
    return comment.author.id === user?.id || isAdmin;
  };

  // 시간 포맷
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // 총 댓글 수 (대댓글 포함)
  const totalCount = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  // 댓글 아이템 렌더링
  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`comment-item ${isReply ? 'comment-item--reply' : ''}`}>
      <div className="comment-item__avatar">
        {comment.author.profileImage ? (
          <img src={comment.author.profileImage} alt={comment.author.name} />
        ) : (
          comment.author.name.charAt(0)
        )}
      </div>
      <div className="comment-item__content">
        <div className="comment-item__header">
          <span className="comment-item__author">
            {comment.author.name}
            {comment.author.title && ` ${comment.author.title}`}님
          </span>
          <span className="comment-item__time">{formatTime(comment.createdAt)}</span>
        </div>
        {editingId === comment.id ? (
          <div className="comment-item__edit">
            <textarea
              className="comment-item__edit-input"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              maxLength={1000}
            />
            <div className="comment-item__edit-actions">
              <button
                className="comment-item__edit-btn comment-item__edit-btn--cancel"
                onClick={cancelEdit}
              >
                취소
              </button>
              <button
                className="comment-item__edit-btn comment-item__edit-btn--save"
                onClick={() => handleUpdate(comment.id)}
                disabled={!editContent.trim()}
              >
                저장
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="comment-item__text">{comment.content}</p>
            <div className="comment-item__footer">
              <button
                className={`comment-item__like ${comment.isLiked ? 'comment-item__like--active' : ''}`}
                onClick={() => handleLike(comment.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
              </button>
              {!isReply && (
                <button
                  className="comment-item__reply-btn"
                  onClick={() => {
                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                    setReplyContent('');
                  }}
                >
                  답글
                </button>
              )}
              {canModify(comment) && (
                <>
                  <button className="comment-item__action" onClick={() => startEdit(comment)}>
                    수정
                  </button>
                  <button
                    className="comment-item__action comment-item__action--delete"
                    onClick={() => handleDelete(comment.id)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* 대댓글 작성 폼 */}
        {replyingTo === comment.id && (
          <div className="comment-item__reply-form">
            <textarea
              className="comment-item__reply-input"
              placeholder="답글을 입력하세요..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              maxLength={1000}
            />
            <div className="comment-item__reply-actions">
              <button
                className="comment-item__reply-cancel"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                취소
              </button>
              <button
                className="comment-item__reply-submit"
                onClick={() => handleReply(comment.id)}
                disabled={!replyContent.trim()}
              >
                등록
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="comment-section">
      <h3 className="comment-section__title">
        댓글 <span className="comment-section__count">{totalCount}</span>
      </h3>

      {/* 댓글 작성 */}
      <div className="comment-section__form">
        <div className="comment-section__input-wrap">
          <textarea
            className="comment-section__input"
            placeholder="댓글을 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            maxLength={1000}
          />
          <button
            className="comment-section__submit"
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? '작성 중...' : '등록'}
          </button>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="comment-section__list">
        {loading ? (
          <p className="comment-section__loading">로딩 중...</p>
        ) : comments.length === 0 ? (
          <p className="comment-section__empty">첫 댓글을 작성해보세요!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-thread">
              {renderComment(comment)}
              {/* 대댓글 */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="comment-replies">
                  {comment.replies.map((reply) => renderComment(reply, true))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;
