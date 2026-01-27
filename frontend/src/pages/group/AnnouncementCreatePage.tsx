import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { announcementApi } from '@/api';
import { useToast } from '@/components';
import { useGroupStore } from '@/store/groupStore';
import './AnnouncementCreatePage.scss';

interface Attachment {
  name: string;
  url: string;
  type: string;
  file?: File;
}

const AnnouncementCreatePage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentGroup } = useGroupStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);

  // Quill 에디터 모듈 설정
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean'],
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image',
  ];

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    Array.from(files).forEach((file) => {
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}의 크기가 10MB를 초과합니다.`);
        return;
      }

      const isImage = file.type.startsWith('image/');
      newAttachments.push({
        name: file.name,
        url: URL.createObjectURL(file),
        type: isImage ? 'image' : 'file',
        file,
      });
    });

    setAttachments((prev) => [...prev, ...newAttachments]);

    // 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 파일 삭제 핸들러
  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      // 메모리 해제
      URL.revokeObjectURL(newAttachments[index].url);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  // 저장 핸들러
  const handleSubmit = async () => {
    if (!groupId) return;

    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }

    if (!content.trim() || content === '<p><br></p>') {
      toast.error('내용을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      // TODO: 실제 구현 시 파일 업로드 API 호출 후 URL 받아오기
      const attachmentData = attachments.map(({ name, url, type }) => ({
        name,
        url, // 실제로는 서버에서 받은 URL
        type,
      }));

      await announcementApi.create(groupId, {
        title,
        content,
        isPinned,
        attachments: attachmentData,
      });

      toast.success('공지사항이 등록되었습니다.');
      navigate(`/groups/${groupId}?tab=announcements`);
    } catch (error) {
      console.error('Failed to create announcement:', error);
      toast.error('공지사항 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 취소 핸들러
  const handleCancel = () => {
    if (title || content || attachments.length > 0) {
      if (!confirm('작성 중인 내용이 있습니다. 취소하시겠습니까?')) {
        return;
      }
    }
    navigate(`/groups/${groupId}?tab=announcements`);
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="announcement-create">
      <div className="announcement-create__header">
        <button className="announcement-create__back" onClick={handleCancel}>
          ← 뒤로
        </button>
        <h1>공지사항 작성</h1>
        {currentGroup && (
          <span className="announcement-create__group-name">{currentGroup.name}</span>
        )}
      </div>

      <div className="announcement-create__form">
        <div className="announcement-create__field">
          <label className="announcement-create__label">제목 *</label>
          <input
            type="text"
            className="announcement-create__input"
            placeholder="공지사항 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="announcement-create__field">
          <label className="announcement-create__label">내용 *</label>
          <div className="announcement-create__editor">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              formats={formats}
              placeholder="공지사항 내용을 입력하세요"
            />
          </div>
        </div>

        <div className="announcement-create__field">
          <label className="announcement-create__label">첨부파일</label>
          <div className="announcement-create__attachments">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="announcement-create__file-input"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.hwp"
            />
            <button
              type="button"
              className="announcement-create__file-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              + 파일 추가
            </button>
            <span className="announcement-create__file-hint">
              이미지, 문서, 압축파일 등 (최대 10MB)
            </span>
          </div>

          {attachments.length > 0 && (
            <div className="announcement-create__attachment-list">
              {attachments.map((attachment, index) => (
                <div key={index} className="attachment-item">
                  {attachment.type === 'image' ? (
                    <div className="attachment-item__preview">
                      <img src={attachment.url} alt={attachment.name} />
                    </div>
                  ) : (
                    <div className="attachment-item__icon">
                      {attachment.name.endsWith('.pdf') ? '📄' :
                       attachment.name.endsWith('.zip') ? '📦' :
                       attachment.name.endsWith('.hwp') ? '📝' : '📎'}
                    </div>
                  )}
                  <div className="attachment-item__info">
                    <span className="attachment-item__name">{attachment.name}</span>
                    {attachment.file && (
                      <span className="attachment-item__size">
                        {formatFileSize(attachment.file.size)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="attachment-item__remove"
                    onClick={() => handleRemoveAttachment(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="announcement-create__field announcement-create__field--inline">
          <label className="announcement-create__checkbox">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            <span>상단 고정</span>
          </label>
        </div>
      </div>

      <div className="announcement-create__actions">
        <button
          className="announcement-create__cancel"
          onClick={handleCancel}
          disabled={saving}
        >
          취소
        </button>
        <button
          className="announcement-create__submit"
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
        >
          {saving ? '등록 중...' : '등록하기'}
        </button>
      </div>
    </div>
  );
};

export default AnnouncementCreatePage;
