import { EmptyState } from '@/components';
import { formatDate } from '@/utils/dateFormat';
import type { Announcement } from '@/types';

interface AnnouncementListProps {
  announcements: Announcement[];
  loading: boolean;
  isAdmin: boolean;
  canWrite: boolean;
  onSelect: (announcement: Announcement) => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
  onTogglePin: (announcement: Announcement) => void;
  onOpenWriteMode: () => void;
}

const AnnouncementList: React.FC<AnnouncementListProps> = ({
  announcements,
  loading,
  isAdmin,
  canWrite,
  onSelect,
  onEdit,
  onDelete,
  onTogglePin,
  onOpenWriteMode,
}) => {
  return (
    <>
      <div className="group-detail__section-header">
        <h2>공지사항</h2>
        {canWrite && (
          <button className="group-detail__add-btn" onClick={onOpenWriteMode}>
            + 공지사항 작성
          </button>
        )}
      </div>

      {loading ? (
        <p className="group-detail__loading-text">로딩 중...</p>
      ) : announcements.length === 0 ? (
        <EmptyState
          description="아직 공지사항이 없습니다"
          action={canWrite ? { label: '첫 공지사항 작성', onClick: onOpenWriteMode } : undefined}
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>제목</th>
              <th>작성자</th>
              <th>작성일</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {announcements.map((announcement) => (
              <tr
                key={announcement.id}
                className={`data-table__row--clickable ${announcement.isPinned ? 'data-table__row--pinned' : ''}`}
                onClick={() => onSelect(announcement)}
              >
                <td>
                  <div className="data-table__title-cell">
                    <div className="data-table__title-row">
                      {announcement.isPinned && <span className="data-table__pin-badge">고정</span>}
                      {announcement.isAdminOnly && <span className="data-table__admin-badge">관리자</span>}
                      <span className="data-table__title">{announcement.title}</span>
                    </div>
                    <span className="data-table__meta">조회 {announcement.viewCount ?? 0}</span>
                  </div>
                </td>
                <td>
                  <span className="data-table__text">
                    {announcement.author?.name || '알 수 없음'}
                    {announcement.author?.title && ` ${announcement.author.title}`}
                  </span>
                </td>
                <td>
                  <span className="data-table__date">{formatDate(announcement.createdAt)}</span>
                </td>
                {isAdmin && (
                  <td>
                    <div className="data-table__actions">
                      <button
                        className="data-table__icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(announcement);
                        }}
                        title={announcement.isPinned ? '고정 해제' : '고정'}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={announcement.isPinned ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 17v5" />
                          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                          <path d="M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1" />
                        </svg>
                      </button>
                      <button
                        className="data-table__icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(announcement);
                        }}
                        title="수정"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="data-table__icon-btn data-table__icon-btn--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(announcement);
                        }}
                        title="삭제"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

export default AnnouncementList;
