import { useState, useEffect, useCallback } from 'react';
import { Modal, useToast } from '@/components';
import { holidayApi, HOLIDAY_TYPES } from '@/api';
import type { Holiday, CreateHolidayRequest, HolidayType } from '@/api';

interface HolidaySectionProps {
  groupId: string;
  isAdmin?: boolean;
}

const HOLIDAY_TYPE_LABELS: Record<Exclude<HolidayType, 'regular'>, string> = {
  specific: '특정 날짜',
  range: '기간',
};

export const HolidaySection: React.FC<HolidaySectionProps> = ({ groupId, isAdmin = false }) => {
  const toast = useToast();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState<CreateHolidayRequest>({
    type: HOLIDAY_TYPES.SPECIFIC,
    name: '',
    description: '',
    date: '',
    startDate: '',
    endDate: '',
    recurringDays: [],
    notifyMembers: true,
    requiresMakeup: false,
  });

  // Load holidays
  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const response = await holidayApi.getByGroup(groupId);
      if (response.success) {
        setHolidays(response.data);
      }
    } catch (error) {
      console.error('Failed to load holidays:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  // Reset form
  const resetForm = () => {
    setForm({
      type: HOLIDAY_TYPES.SPECIFIC,
      name: '',
      description: '',
      date: '',
      startDate: '',
      endDate: '',
      recurringDays: [],
      notifyMembers: true,
      requiresMakeup: false,
    });
  };

  // Handle form changes
  const updateForm = (field: keyof CreateHolidayRequest, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Create holiday
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('휴일 이름을 입력해주세요');
      return;
    }

    if (form.type === 'specific' && !form.date) {
      toast.error('날짜를 선택해주세요');
      return;
    }

    if (form.type === 'range' && (!form.startDate || !form.endDate)) {
      toast.error('시작일과 종료일을 선택해주세요');
      return;
    }

    setSaving(true);
    try {
      const response = await holidayApi.create(groupId, form);
      if (response.success) {
        toast.success('휴일이 등록되었습니다');
        setShowModal(false);
        resetForm();
        loadHolidays();
      }
    } catch {
      toast.error('휴일 등록에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // Delete holiday
  const handleDelete = async (holidayId: string) => {
    if (!window.confirm('이 휴일을 삭제하시겠습니까?')) return;

    try {
      const response = await holidayApi.delete(groupId, holidayId);
      if (response.success) {
        toast.success('휴일이 삭제되었습니다');
        loadHolidays();
      }
    } catch {
      toast.error('휴일 삭제에 실패했습니다');
    }
  };

  // Format date display
  const formatHolidayDate = (holiday: Holiday): string => {
    if (holiday.type === 'specific' && holiday.date) {
      const [, m, d] = holiday.date.split('-');
      return `${m}월 ${d}일`;
    }
    if (holiday.type === 'range' && holiday.startDate && holiday.endDate) {
      const [, sm, sd] = holiday.startDate.split('-');
      const [, em, ed] = holiday.endDate.split('-');
      return `${sm}/${sd} ~ ${em}/${ed}`;
    }
    return '';
  };

  return (
    <div className="group-detail__setting-section">
      <div className="group-detail__setting-header">
        <h3>휴일 관리</h3>
        {isAdmin && (
          <button
            type="button"
            className="group-detail__setting-add-btn"
            onClick={() => setShowModal(true)}
          >
            + 휴일 추가
          </button>
        )}
      </div>
      {isAdmin && (
        <p className="group-detail__setting-description">
          학원 휴일을 등록하면 1주일 전 해당 날짜에 수업이 있는 학생/강사에게 알림이 발송됩니다.
        </p>
      )}

      {loading ? (
        <p className="group-detail__loading-text">로딩 중...</p>
      ) : holidays.length === 0 ? (
        <p className="group-detail__empty-text">등록된 휴일이 없습니다.</p>
      ) : (
        <div className="group-detail__holiday-list">
          {holidays.map((holiday) => (
            <div key={holiday.id} className="group-detail__holiday-item">
              <div className="group-detail__holiday-info">
                <span className="group-detail__holiday-name">{holiday.name}</span>
                <span className="group-detail__holiday-date">{formatHolidayDate(holiday)}</span>
                <span className={`group-detail__holiday-type group-detail__holiday-type--${holiday.type}`}>
                  {HOLIDAY_TYPE_LABELS[holiday.type as Exclude<HolidayType, 'regular'>]}
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  className="group-detail__holiday-delete"
                  onClick={() => handleDelete(holiday.id)}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 휴일 추가 모달 */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="휴일 추가"
        size="sm"
      >
        <div className="holiday-form">
          <div className="holiday-form__field">
            <label>휴일 타입</label>
            <div className="holiday-form__type-options">
              {Object.entries(HOLIDAY_TYPE_LABELS).map(([type, label]) => (
                <label key={type} className="holiday-form__type-option">
                  <input
                    type="radio"
                    name="holidayType"
                    checked={form.type === type}
                    onChange={() => updateForm('type', type as HolidayType)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="holiday-form__field">
            <label>휴일 이름 *</label>
            <input
              type="text"
              className="holiday-form__input"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="예: 설날, 여름방학"
              maxLength={100}
            />
          </div>

          {form.type === 'specific' && (
            <div className="holiday-form__field">
              <label>날짜 *</label>
              <input
                type="date"
                className="holiday-form__input"
                value={form.date || ''}
                onChange={(e) => updateForm('date', e.target.value)}
              />
            </div>
          )}

          {form.type === 'range' && (
            <div className="holiday-form__field holiday-form__field--row">
              <div>
                <label>시작일 *</label>
                <input
                  type="date"
                  className="holiday-form__input"
                  value={form.startDate || ''}
                  onChange={(e) => updateForm('startDate', e.target.value)}
                />
              </div>
              <span className="holiday-form__separator">~</span>
              <div>
                <label>종료일 *</label>
                <input
                  type="date"
                  className="holiday-form__input"
                  value={form.endDate || ''}
                  onChange={(e) => updateForm('endDate', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="holiday-form__field">
            <label>설명 (선택)</label>
            <textarea
              className="holiday-form__textarea"
              value={form.description || ''}
              onChange={(e) => updateForm('description', e.target.value)}
              placeholder="휴일에 대한 설명"
              rows={2}
            />
          </div>

          <div className="holiday-form__toggles">
            <label className="holiday-form__toggle">
              <input
                type="checkbox"
                checked={form.notifyMembers ?? true}
                onChange={(e) => updateForm('notifyMembers', e.target.checked)}
              />
              <span>1주일 전 알림 발송</span>
            </label>
            <label className="holiday-form__toggle">
              <input
                type="checkbox"
                checked={form.requiresMakeup ?? false}
                onChange={(e) => updateForm('requiresMakeup', e.target.checked)}
              />
              <span>보강 필요 (그룹 수업)</span>
            </label>
          </div>

          <div className="holiday-form__actions">
            <button
              type="button"
              className="holiday-form__cancel"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              disabled={saving}
            >
              취소
            </button>
            <button
              type="button"
              className="holiday-form__submit"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HolidaySection;
