import { useEffect } from 'react';
import { useGroupDetailStore } from '@/store';
import { AnnouncementWriteForm, AnnouncementDetail, AnnouncementList } from './components';
import type { SubGroupRequest, Announcement } from '@/types';

interface AnnouncementsTabProps {
  groupId: string;
  isAdmin: boolean;
  canWriteAnnouncement: boolean;
  subGroupRequests: SubGroupRequest[];
  onApproveRequest: (request: SubGroupRequest) => void;
  onRejectRequest: (request: SubGroupRequest) => void;
}

const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  groupId,
  isAdmin,
  canWriteAnnouncement,
  subGroupRequests,
  onApproveRequest,
  onRejectRequest,
}) => {
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

  const handleSave = async () => {
    await saveAnnouncement(groupId);
  };

  const handleDelete = async (announcement: Announcement) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await deleteAnnouncement(announcement.id);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    await togglePin(announcement.id);
  };

  const pendingRequestsCount = subGroupRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="group-detail__announcements">
      {/* 미처리 승인 요청 알림 (관리자 전용) */}
      {isAdmin && pendingRequestsCount > 0 && (
        <PendingRequestsAlert
          requests={subGroupRequests.filter((r) => r.status === 'pending')}
          onApprove={onApproveRequest}
          onReject={onRejectRequest}
        />
      )}

      {/* 작성 모드 */}
      {announcementWriteMode ? (
        <AnnouncementWriteForm
          editing={editingAnnouncement}
          form={announcementForm}
          attachments={attachments}
          saving={announcementSaving}
          recentAnnouncements={announcements}
          onFormChange={setAnnouncementForm}
          onAddAttachment={addAttachment}
          onRemoveAttachment={removeAttachment}
          onSave={handleSave}
          onClose={closeAnnouncementWriteMode}
        />
      ) : selectedAnnouncement ? (
        /* 상세보기 모드 */
        <AnnouncementDetail
          announcement={selectedAnnouncement}
          isAdmin={isAdmin}
          likeState={announcementLikeState}
          onBack={closeAnnouncementDetail}
          onEdit={() => {
            editAnnouncement(selectedAnnouncement);
            closeAnnouncementDetail();
          }}
          onDelete={() => {
            handleDelete(selectedAnnouncement);
            closeAnnouncementDetail();
          }}
          onToggleLike={toggleLike}
        />
      ) : (
        /* 목록 모드 */
        <AnnouncementList
          announcements={announcements}
          loading={announcementsLoading}
          isAdmin={isAdmin}
          canWrite={canWriteAnnouncement}
          onSelect={selectAnnouncement}
          onEdit={editAnnouncement}
          onDelete={handleDelete}
          onTogglePin={handleTogglePin}
          onOpenWriteMode={openAnnouncementWriteMode}
        />
      )}
    </div>
  );
};

// 승인 요청 알림 컴포넌트
interface PendingRequestsAlertProps {
  requests: SubGroupRequest[];
  onApprove: (request: SubGroupRequest) => void;
  onReject: (request: SubGroupRequest) => void;
}

const PendingRequestsAlert: React.FC<PendingRequestsAlertProps> = ({
  requests,
  onApprove,
  onReject,
}) => (
  <div className="group-detail__pending-alerts">
    <div className="pending-alert">
      <div className="pending-alert__icon">🔔</div>
      <div className="pending-alert__content">
        <span className="pending-alert__title">
          승인 대기 중인 소모임 요청이 {requests.length}건 있습니다
        </span>
        <div className="pending-alert__list">
          {requests.map((request) => (
            <div key={request.id} className="pending-alert__item">
              <span className="pending-alert__name">
                "{request.name}" - {request.requester?.name || '알 수 없음'}
              </span>
              <div className="pending-alert__actions">
                <button
                  className="pending-alert__btn pending-alert__btn--approve"
                  onClick={() => onApprove(request)}
                >
                  승인
                </button>
                <button
                  className="pending-alert__btn pending-alert__btn--reject"
                  onClick={() => onReject(request)}
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
);

export default AnnouncementsTab;
