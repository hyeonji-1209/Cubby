import { useState } from 'react';
import Modal from './Modal';
import { absenceRequestApi, AbsenceType } from '@/api/absenceRequest.api';

interface AbsenceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  subGroupId?: string;
  scheduleId?: string;
  scheduleTitle?: string;
  studentId?: string; // 보호자가 대신 신청하는 경우
  onSuccess?: () => void;
}

const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  personal: '개인 사유',
  sick: '병결',
  family: '가정 사정',
  travel: '여행/출장',
  exam: '시험',
  other: '기타',
};

export const AbsenceRequestModal = ({
  isOpen,
  onClose,
  groupId,
  subGroupId,
  scheduleId,
  scheduleTitle,
  studentId,
  onSuccess,
}: AbsenceRequestModalProps) => {
  const [loading, setLoading] = useState(false);
  const [absenceDate, setAbsenceDate] = useState('');
  const [absenceType, setAbsenceType] = useState<AbsenceType>('personal');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!absenceDate) {
      alert('결석 날짜를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await absenceRequestApi.create(groupId, {
        absenceDate,
        absenceType,
        reason: reason.trim() || undefined,
        subGroupId,
        scheduleId,
        studentId,
      });

      alert('결석 신청이 제출되었습니다.');
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
    setAbsenceDate('');
    setAbsenceType('personal');
    setReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 오늘 이후의 날짜만 선택 가능
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="결석 신청"
      description={scheduleTitle ? `"${scheduleTitle}" 일정에 대한 결석 신청` : '결석 신청을 작성해주세요.'}
      size="md"
      actions={
        <>
          <button className="modal__cancel" onClick={handleClose} disabled={loading}>
            취소
          </button>
          <button
            className="modal__submit"
            onClick={handleSubmit}
            disabled={loading || !absenceDate}
          >
            {loading ? '제출 중...' : '결석 신청'}
          </button>
        </>
      }
    >
      <div className="absence-form">
        {/* 결석 날짜 */}
        <div className="modal__field">
          <label className="modal__label">결석 날짜 *</label>
          <input
            type="date"
            className="modal__input"
            value={absenceDate}
            onChange={(e) => setAbsenceDate(e.target.value)}
            min={today}
          />
        </div>

        {/* 결석 유형 */}
        <div className="modal__field">
          <label className="modal__label">결석 유형</label>
          <select
            className="modal__select"
            value={absenceType}
            onChange={(e) => setAbsenceType(e.target.value as AbsenceType)}
          >
            {Object.entries(ABSENCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 사유 */}
        <div className="modal__field">
          <label className="modal__label">결석 사유</label>
          <textarea
            className="modal__textarea"
            placeholder="결석 사유를 입력해주세요 (선택)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        {studentId && (
          <p className="absence-form__guardian-note">
            * 보호자로서 대신 신청하는 결석입니다.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default AbsenceRequestModal;
