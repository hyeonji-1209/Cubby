import { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { EmptyState, CommentSection } from '@/components';
import { useGroupDetailStore } from '@/store';
import { formatDate } from '@/utils/dateFormat';
import type { SubGroupRequest } from '@/types';

interface AnnouncementsTabProps {
  groupId: string;
  isAdmin: boolean;
  canWriteAnnouncement: boolean;
  subGroupRequests: SubGroupRequest[];
  onApproveRequest: (request: SubGroupRequest) => void;
  onRejectRequest: (request: SubGroupRequest) => void;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['link'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'color', 'background',
  'link',
];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  groupId,
  isAdmin,
  canWriteAnnouncement,
  subGroupRequests,
  onApproveRequest,
  onRejectRequest,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    announcements,
    announcementsLoading,
    announcementWriteMode,
    selectedAnnouncement,
    editingAnnouncement,
    announcementForm,
    attachments,
    announcementSaving,
    announcementLikeState,
    fetchAnnouncements,
    openAnnouncementWriteMode,
    closeAnnouncementWriteMode,
    selectAnnouncement,
    closeAnnouncementDetail,
    setAnnouncementForm,
    addAttachment,
    removeAttachment,
    saveAnnouncement,
    deleteAnnouncement,
    togglePin,
    toggleLike,
    editAnnouncement,
  } = useGroupDetailStore();

  useEffect(() => {
    if (groupId && announcements.length === 0) {
      fetchAnnouncements(groupId);
    }
  }, [groupId, announcements.length, fetchAnnouncements]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addAttachment(Array.from(files));
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    await saveAnnouncement(groupId);
  };

  const handleDelete = async (announcement: { id: string }) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteAnnouncement(announcement.id);
    }
  };

  const handleTogglePin = async (announcement: { id: string }) => {
    await togglePin(announcement.id);
  };

  const pendingRequestsCount = subGroupRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="group-detail__announcements">
      {/* 미처리 승인 요청 알림 (관리자 전용) */}
      {isAdmin && pendingRequestsCount > 0 && (
        <div className="group-detail__pending-alerts">
          <div className="pending-alert">
            <div className="pending-alert__icon">🔔</div>
            <div className="pending-alert__content">
              <span className="pending-alert__title">
                승인 대기 중인 소모임 요청이 {pendingRequestsCount}건 있습니다
              </span>
              <div className="pending-alert__list">
                {subGroupRequests.filter(r => r.status === 'pending').map((request) => (
                  <div key={request.id} className="pending-alert__item">
                    <span className="pending-alert__name">
                      "{request.name}" - {request.requester?.name || '알 수 없음'}
                    </span>
                    <div className="pending-alert__actions">
                      <button
                        className="pending-alert__btn pending-alert__btn--approve"
                        onClick={() => onApproveRequest(request)}
                      >
                        승인
                      </button>
                      <button
                        className="pending-alert__btn pending-alert__btn--reject"
                        onClick={() => onRejectRequest(request)}
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 작성 모드 */}
      {announcementWriteMode ? (
        <div className="announcement-write">
          <div className="announcement-write__header">
            <h2>{editingAnnouncement ? '공지사항 수정' : '공지사항 작성'}</h2>
            <button
              className="announcement-write__close"
              onClick={closeAnnouncementWriteMode}
            >
              ✕
            </button>
          </div>

          <div className="announcement-write__form">
            <div className="announcement-write__field">
              <label className="announcement-write__label">제목 *</label>
              <input
                type="text"
                className="announcement-write__input"
                placeholder="공지사항 제목을 입력하세요"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ title: e.target.value })}
                maxLength={200}
              />
            </div>

            <div className="announcement-write__field">
              <label className="announcement-write__label">내용 *</label>
              <div className="announcement-write__editor">
                <ReactQuill
                  theme="snow"
                  value={announcementForm.content}
                  onChange={(value) => setAnnouncementForm({ content: value })}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="공지사항 내용을 입력하세요"
                />
              </div>
            </div>

            {/* 파일 첨부 */}
            <div className="announcement-write__field">
              <label className="announcement-write__label">첨부파일</label>
              <div className="announcement-write__attachments">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  className="announcement-write__file-input"
                />
                <button
                  type="button"
                  className="announcement-write__file-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎 파일 첨부
                </button>
                <span className="announcement-write__file-hint">
                  이미지, PDF, 문서 파일 첨부 가능 (최대 10MB)
                </span>
              </div>

              {/* 첨부파일 목록 */}
              {attachments.length > 0 && (
                <div className="announcement-write__attachment-list">
                  {attachments.map((attachment) => {
                    const fileName = attachment.file?.name || attachment.name || '';
                    const isImage = attachment.type === 'image' || attachment.type?.startsWith('image/');
                    return (
                      <div key={attachment.id} className="attachment-item">
                        {isImage && (attachment.preview || attachment.url) ? (
                          <div className="attachment-item__preview">
                            <img src={attachment.preview || attachment.url} alt={fileName} />
                          </div>
                        ) : (
                          <div className="attachment-item__icon">
                            {fileName.endsWith('.pdf') ? '📄' :
                              fileName.match(/\.(doc|docx)$/) ? '📝' :
                                fileName.match(/\.(xls|xlsx)$/) ? '📊' :
                                  fileName.match(/\.(ppt|pptx)$/) ? '📽️' : '📁'}
                          </div>
                        )}
                        <div className="attachment-item__info">
                          <span className="attachment-item__name">{fileName}</span>
                          {attachment.file && (
                            <span className="attachment-item__size">{formatFileSize(attachment.file.size)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="attachment-item__remove"
                          onClick={() => removeAttachment(attachment.id)}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="announcement-write__footer">
              <div className="announcement-write__options">
                <label className="announcement-write__checkbox">
                  <input
                    type="checkbox"
                    checked={announcementForm.isPinned}
                    onChange={(e) => setAnnouncementForm({ isPinned: e.target.checked })}
                  />
                  <span>상단에 고정</span>
                </label>
                <label className="announcement-write__checkbox">
                  <input
                    type="checkbox"
                    checked={announcementForm.isAdminOnly}
                    onChange={(e) => setAnnouncementForm({ isAdminOnly: e.target.checked })}
                  />
                  <span>관리자 전용</span>
                </label>
              </div>

              <div className="announcement-write__actions">
                <button
                  className="announcement-write__cancel"
                  onClick={closeAnnouncementWriteMode}
                  disabled={announcementSaving}
                >
                  취소
                </button>
                <button
                  className="announcement-write__submit"
                  onClick={handleSave}
                  disabled={!announcementForm.title.trim() || !announcementForm.content.trim() || announcementSaving}
                >
                  {announcementSaving ? '저장 중...' : editingAnnouncement ? '수정하기' : '등록하기'}
                </button>
              </div>
            </div>
          </div>

          {/* 최근 공지사항 미리보기 */}
          {announcements.length > 0 && (
            <div className="announcement-write__preview">
              <h4>최근 공지사항</h4>
              <div className="announcement-write__preview-list">
                {announcements.slice(0, 2).map((announcement) => (
                  <div key={announcement.id} className={`announcement-write__preview-item ${announcement.isPinned ? 'pinned' : ''}`}>
                    {announcement.isPinned && <span className="pin-badge">고정</span>}
                    <span className="title">{announcement.title}</span>
                    <span className="date">{formatDate(announcement.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : selectedAnnouncement ? (
        /* 상세보기 모드 */
        <div className="announcement-view">
          <div className="announcement-view__toolbar">
            <button className="announcement-view__back" onClick={closeAnnouncementDetail}>
              ← 목록
            </button>
            {isAdmin && (
              <div className="announcement-view__actions">
                <button
                  className="announcement-view__btn"
                  onClick={() => {
                    editAnnouncement(selectedAnnouncement);
                    closeAnnouncementDetail();
                  }}
                >
                  수정
                </button>
                <button
                  className="announcement-view__btn announcement-view__btn--delete"
                  onClick={() => {
                    handleDelete(selectedAnnouncement);
                    closeAnnouncementDetail();
                  }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>

          <article className="announcement-view__article">
            <header className="announcement-view__header">
              <div className="announcement-view__tags">
                {selectedAnnouncement.isPinned && <span className="announcement-view__tag announcement-view__tag--pin">고정</span>}
                {selectedAnnouncement.isAdminOnly && <span className="announcement-view__tag announcement-view__tag--admin">관리자</span>}
              </div>
              <h1 className="announcement-view__title">{selectedAnnouncement.title}</h1>
              <div className="announcement-view__info">
                <span>{selectedAnnouncement.author?.name || '알 수 없음'}{selectedAnnouncement.author?.title && ` ${selectedAnnouncement.author.title}`}</span>
                <span>·</span>
                <span>{formatDate(selectedAnnouncement.createdAt)}</span>
                <span>·</span>
                <span>조회 {selectedAnnouncement.viewCount ?? 0}</span>
              </div>
            </header>

            <div
              className="announcement-view__body"
              dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content || '' }}
            />

            {/* 좋아요 버튼 */}
            <div className="announcement-view__footer">
              <button
                className={`announcement-view__like-btn ${announcementLikeState?.isLiked ? 'announcement-view__like-btn--active' : ''}`}
                onClick={toggleLike}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={announcementLikeState?.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {(announcementLikeState?.likeCount || 0) > 0 && (
                  <span>{announcementLikeState?.likeCount}</span>
                )}
              </button>
            </div>

            {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
              <footer className="announcement-view__files">
                <span className="announcement-view__files-label">첨부파일</span>
                <div className="announcement-view__files-grid">
                  {selectedAnnouncement.attachments.map((file, index) => (
                    <a
                      key={index}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="announcement-view__attachment"
                      title={file.name}
                    >
                      {file.type.includes('image') ? (
                        <img src={file.url} alt={file.name} className="announcement-view__attachment-img" />
                      ) : (
                        <div className="announcement-view__attachment-icon">
                          {file.type.includes('pdf') ? '📄' : file.name.match(/\.(doc|docx)$/) ? '📝' : file.name.match(/\.(xls|xlsx)$/) ? '📊' : '📎'}
                        </div>
                      )}
                      <span className="announcement-view__attachment-name">{file.name}</span>
                    </a>
                  ))}
                </div>
              </footer>
            )}

            {/* 댓글 섹션 */}
            <CommentSection
              announcementId={selectedAnnouncement.id}
              isAdmin={isAdmin}
            />
          </article>
        </div>
      ) : (
        <>
          <div className="group-detail__section-header">
            <h2>공지사항</h2>
            {canWriteAnnouncement && (
              <button
                className="group-detail__add-btn"
                onClick={openAnnouncementWriteMode}
              >
                + 공지사항 작성
              </button>
            )}
          </div>

          {announcementsLoading ? (
            <p className="group-detail__loading-text">로딩 중...</p>
          ) : announcements.length === 0 ? (
            <EmptyState
              description="아직 공지사항이 없습니다"
              action={
                canWriteAnnouncement
                  ? { label: '첫 공지사항 작성', onClick: openAnnouncementWriteMode }
                  : undefined
              }
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
                    onClick={() => selectAnnouncement(announcement)}
                  >
                    <td>
                      <div className="data-table__title-cell">
                        <div className="data-table__title-row">
                          {announcement.isPinned && (
                            <span className="data-table__pin-badge">고정</span>
                          )}
                          {announcement.isAdminOnly && (
                            <span className="data-table__admin-badge">관리자</span>
                          )}
                          <span className="data-table__title">{announcement.title}</span>
                        </div>
                        <span className="data-table__meta">조회 {announcement.viewCount ?? 0}</span>
                      </div>
                    </td>
                    <td>
                      <span className="data-table__text">{announcement.author?.name || '알 수 없음'}{announcement.author?.title && ` ${announcement.author.title}`}</span>
                    </td>
                    <td>
                      <span className="data-table__date">{formatDate(announcement.createdAt)}</span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="data-table__actions">
                          <button
                            className="data-table__icon-btn"
                            onClick={(e) => { e.stopPropagation(); handleTogglePin(announcement); }}
                            title={announcement.isPinned ? '고정 해제' : '고정'}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={announcement.isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 17v5" />
                              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z" />
                              <path d="M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1" />
                            </svg>
                          </button>
                          <button
                            className="data-table__icon-btn"
                            onClick={(e) => { e.stopPropagation(); editAnnouncement(announcement); }}
                            title="수정"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="data-table__icon-btn data-table__icon-btn--danger"
                            onClick={(e) => { e.stopPropagation(); handleDelete(announcement); }}
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
      )}
    </div>
  );
};

export default AnnouncementsTab;
