import { CommentSection } from '@/components';
import { formatDate } from '@/utils/dateFormat';
import type { Announcement } from '@/types';

interface AnnouncementDetailProps {
  announcement: Announcement;
  isAdmin: boolean;
  likeState: { isLiked: boolean; likeCount: number } | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleLike: () => void;
}

const AnnouncementDetail: React.FC<AnnouncementDetailProps> = ({
  announcement,
  isAdmin,
  likeState,
  onBack,
  onEdit,
  onDelete,
  onToggleLike,
}) => {
  return (
    <div className="announcement-view">
      <div className="announcement-view__toolbar">
        <button className="announcement-view__back" onClick={onBack}>
          ← 목록
        </button>
        {isAdmin && (
          <div className="announcement-view__actions">
            <button className="announcement-view__btn" onClick={onEdit}>
              수정
            </button>
            <button
              className="announcement-view__btn announcement-view__btn--delete"
              onClick={onDelete}
            >
              삭제
            </button>
          </div>
        )}
      </div>

      <article className="announcement-view__article">
        <header className="announcement-view__header">
          <div className="announcement-view__tags">
            {announcement.isPinned && (
              <span className="announcement-view__tag announcement-view__tag--pin">고정</span>
            )}
            {announcement.isAdminOnly && (
              <span className="announcement-view__tag announcement-view__tag--admin">관리자</span>
            )}
          </div>
          <h1 className="announcement-view__title">{announcement.title}</h1>
          <div className="announcement-view__info">
            <span>
              {announcement.author?.name || '알 수 없음'}
              {announcement.author?.title && ` ${announcement.author.title}`}
            </span>
            <span>·</span>
            <span>{formatDate(announcement.createdAt)}</span>
            <span>·</span>
            <span>조회 {announcement.viewCount ?? 0}</span>
          </div>
        </header>

        <div
          className="announcement-view__body"
          dangerouslySetInnerHTML={{ __html: announcement.content || '' }}
        />

        {/* 좋아요 버튼 */}
        <div className="announcement-view__footer">
          <button
            className={`announcement-view__like-btn ${likeState?.isLiked ? 'announcement-view__like-btn--active' : ''}`}
            onClick={onToggleLike}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={likeState?.isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {(likeState?.likeCount || 0) > 0 && <span>{likeState?.likeCount}</span>}
          </button>
        </div>

        {/* 첨부파일 */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <footer className="announcement-view__files">
            <span className="announcement-view__files-label">첨부파일</span>
            <div className="announcement-view__files-grid">
              {announcement.attachments.map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="announcement-view__attachment"
                  title={file.name}
                >
                  {file.type.includes('image') ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="announcement-view__attachment-img"
                    />
                  ) : (
                    <div className="announcement-view__attachment-icon">
                      {file.type.includes('pdf')
                        ? '📄'
                        : file.name.match(/\.(doc|docx)$/)
                        ? '📝'
                        : file.name.match(/\.(xls|xlsx)$/)
                        ? '📊'
                        : '📎'}
                    </div>
                  )}
                  <span className="announcement-view__attachment-name">{file.name}</span>
                </a>
              ))}
            </div>
          </footer>
        )}

        {/* 댓글 섹션 */}
        <CommentSection announcementId={announcement.id} isAdmin={isAdmin} />
      </article>
    </div>
  );
};

export default AnnouncementDetail;
