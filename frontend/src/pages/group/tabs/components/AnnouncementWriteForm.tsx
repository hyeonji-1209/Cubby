import { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { Announcement, AnnouncementFormData } from '@/types';

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

interface AttachmentItem {
  id: string;
  file?: File;
  name?: string;
  type?: string;
  preview?: string;
  url?: string;
}

interface AnnouncementWriteFormProps {
  editing: Announcement | null;
  form: AnnouncementFormData;
  attachments: AttachmentItem[];
  saving: boolean;
  recentAnnouncements: Announcement[];
  onFormChange: (updates: Partial<AnnouncementFormData>) => void;
  onAddAttachment: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const AnnouncementWriteForm: React.FC<AnnouncementWriteFormProps> = ({
  editing,
  form,
  attachments,
  saving,
  recentAnnouncements,
  onFormChange,
  onAddAttachment,
  onRemoveAttachment,
  onSave,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAddAttachment(Array.from(files));
    }
    e.target.value = '';
  };

  return (
    <div className="announcement-write">
      <div className="announcement-write__header">
        <h2>{editing ? '공지사항 수정' : '공지사항 작성'}</h2>
        <button className="announcement-write__close" onClick={onClose}>
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
            value={form.title}
            onChange={(e) => onFormChange({ title: e.target.value })}
            maxLength={200}
          />
        </div>

        <div className="announcement-write__field">
          <label className="announcement-write__label">내용 *</label>
          <div className="announcement-write__editor">
            <ReactQuill
              theme="snow"
              value={form.content}
              onChange={(value) => onFormChange({ content: value })}
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
                      onClick={() => onRemoveAttachment(attachment.id)}
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
                checked={form.isPinned ?? false}
                onChange={(e) => onFormChange({ isPinned: e.target.checked })}
              />
              <span>상단에 고정</span>
            </label>
            <label className="announcement-write__checkbox">
              <input
                type="checkbox"
                checked={form.isAdminOnly ?? false}
                onChange={(e) => onFormChange({ isAdminOnly: e.target.checked })}
              />
              <span>관리자 전용</span>
            </label>
          </div>

          <div className="announcement-write__actions">
            <button
              className="announcement-write__cancel"
              onClick={onClose}
              disabled={saving}
            >
              취소
            </button>
            <button
              className="announcement-write__submit"
              onClick={onSave}
              disabled={!form.title.trim() || !form.content.trim() || saving}
            >
              {saving ? '저장 중...' : editing ? '수정하기' : '등록하기'}
            </button>
          </div>
        </div>
      </div>

      {/* 최근 공지사항 미리보기 */}
      {recentAnnouncements.length > 0 && (
        <div className="announcement-write__preview">
          <h4>최근 공지사항</h4>
          <div className="announcement-write__preview-list">
            {recentAnnouncements.slice(0, 2).map((announcement) => (
              <div key={announcement.id} className={`announcement-write__preview-item ${announcement.isPinned ? 'pinned' : ''}`}>
                {announcement.isPinned && <span className="pin-badge">고정</span>}
                <span className="title">{announcement.title}</span>
                <span className="date">{new Date(announcement.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementWriteForm;
