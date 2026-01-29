import { useState } from 'react';
import Modal from './Modal';
import { scheduleChangeRequestApi } from '@/api/scheduleChangeRequest.api';
import type { Schedule } from '@/types';

interface ScheduleChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  schedule: Schedule | null;
  onSuccess?: () => void;
}

export const ScheduleChangeRequestModal = ({
  isOpen,
  onClose,
  groupId,
  schedule,
  onSuccess,
}: ScheduleChangeRequestModalProps) => {
  const [loading, setLoading] = useState(false);
  const [requestedStartDate, setRequestedStartDate] = useState('');
  const [requestedStartTime, setRequestedStartTime] = useState('');
  const [requestedEndDate, setRequestedEndDate] = useState('');
  const [requestedEndTime, setRequestedEndTime] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!schedule || !reason.trim()) return;

    setLoading(true);
    try {
      // 날짜와 시간 조합
      let requestedStartAt: string | undefined;
      let requestedEndAt: string | undefined;

      if (requestedStartDate && requestedStartTime) {
        requestedStartAt = `${requestedStartDate}T${requestedStartTime}:00`;
      }
      if (requestedEndDate && requestedEndTime) {
        requestedEndAt = `${requestedEndDate}T${requestedEndTime}:00`;
      }

      await scheduleChangeRequestApi.create(groupId, schedule.id, {
        requestedStartAt,
        requestedEndAt,
        reason: reason.trim(),
      });

      alert('일정 변경 요청이 제출되었습니다.');
      onClose();
      resetForm();
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRequestedStartDate('');
    setRequestedStartTime('');
    setRequestedEndDate('');
    setRequestedEndTime('');
    setReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 현재 일정의 날짜/시간 추출
  const currentStartDate = schedule?.startAt ? new Date(schedule.startAt).toISOString().split('T')[0] : '';
  const currentStartTime = schedule?.startAt
    ? new Date(schedule.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  const currentEndDate = schedule?.endAt ? new Date(schedule.endAt).toISOString().split('T')[0] : '';
  const currentEndTime = schedule?.endAt
    ? new Date(schedule.endAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="일정 변경 요청"
      size="md"
      actions={
        <>
          <button className="modal__cancel" onClick={handleClose} disabled={loading}>
            취소
          </button>
          <button
            className="modal__submit"
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
          >
            {loading ? '요청 중...' : '변경 요청'}
          </button>
        </>
      }
    >
      <div className="schedule-change-form">
        {/* 현재 일정 정보 */}
        <div className="schedule-change-form__current">
          <h4>현재 일정</h4>
          <p className="schedule-change-form__schedule-title">{schedule?.title}</p>
          <p className="schedule-change-form__schedule-time">
            {currentStartDate} {currentStartTime} ~ {currentEndDate} {currentEndTime}
          </p>
        </div>

        {/* 변경 희망 일시 */}
        <div className="modal__field">
          <label className="modal__label">변경 희망 시작일시</label>
          <div className="schedule-change-form__datetime">
            <input
              type="date"
              className="modal__input"
              value={requestedStartDate}
              onChange={(e) => setRequestedStartDate(e.target.value)}
            />
            <input
              type="time"
              className="modal__input"
              value={requestedStartTime}
              onChange={(e) => setRequestedStartTime(e.target.value)}
            />
          </div>
        </div>

        <div className="modal__field">
          <label className="modal__label">변경 희망 종료일시</label>
          <div className="schedule-change-form__datetime">
            <input
              type="date"
              className="modal__input"
              value={requestedEndDate}
              onChange={(e) => setRequestedEndDate(e.target.value)}
            />
            <input
              type="time"
              className="modal__input"
              value={requestedEndTime}
              onChange={(e) => setRequestedEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* 사유 */}
        <div className="modal__field">
          <label className="modal__label">변경 사유 *</label>
          <textarea
            className="modal__textarea"
            placeholder="일정 변경 사유를 입력해주세요"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ScheduleChangeRequestModal;
