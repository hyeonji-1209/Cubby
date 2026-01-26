import { useState, useEffect } from 'react';
import { positionApi } from '@/api';
import { useToast, Modal, EmptyState } from '@/components';
import type { Position, PositionFormData, GroupMember, PositionMember } from '@/types';

interface PositionsTabProps {
  groupId: string;
  members: GroupMember[];
  isAdmin: boolean;
}

// 직책 색상 옵션
const POSITION_COLORS = [
  { value: '#3b82f6', label: '파란색' },
  { value: '#10b981', label: '초록색' },
  { value: '#f59e0b', label: '노란색' },
  { value: '#ef4444', label: '빨간색' },
  { value: '#8b5cf6', label: '보라색' },
  { value: '#ec4899', label: '분홍색' },
  { value: '#6366f1', label: '남색' },
  { value: '#14b8a6', label: '청록색' },
];

const PositionsTab = ({ groupId, members, isAdmin }: PositionsTabProps) => {
  const toast = useToast();

  // 직책 목록
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // 직책 생성/수정 모달
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [form, setForm] = useState<PositionFormData>({
    name: '',
    description: '',
    color: '#3b82f6',
  });
  const [saving, setSaving] = useState(false);

  // 멤버 배정 모달
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [positionMembers, setPositionMembers] = useState<PositionMember[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // 직책 목록 조회
  useEffect(() => {
    fetchPositions();
  }, [groupId]);

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const response = await positionApi.getList(groupId);
      setPositions(response.data);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  // 직책 생성/수정
  const handleSave = async () => {
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      if (editingPosition) {
        await positionApi.update(groupId, editingPosition.id, form);
        toast.success('직책이 수정되었습니다.');
      } else {
        await positionApi.create(groupId, form);
        toast.success('직책이 생성되었습니다.');
      }
      await fetchPositions();
      closeModal();
    } catch {
      toast.error('직책 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 직책 삭제
  const handleDelete = async (position: Position) => {
    if (!confirm(`"${position.name}" 직책을 삭제하시겠습니까?`)) return;

    try {
      await positionApi.delete(groupId, position.id);
      toast.success('직책이 삭제되었습니다.');
      await fetchPositions();
    } catch {
      toast.error('직책 삭제에 실패했습니다.');
    }
  };

  // 수정 모달 열기
  const openEditModal = (position: Position) => {
    setEditingPosition(position);
    setForm({
      name: position.name,
      description: position.description || '',
      color: position.color || '#3b82f6',
    });
    setShowModal(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false);
    setEditingPosition(null);
    setForm({ name: '', description: '', color: '#3b82f6' });
  };

  // 멤버 배정 모달 열기
  const openAssignModal = async (position: Position) => {
    setSelectedPosition(position);
    setShowAssignModal(true);
    setAssignLoading(true);

    try {
      const response = await positionApi.getPositionMembers(groupId, position.id);
      setPositionMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch position members:', error);
    } finally {
      setAssignLoading(false);
    }
  };

  // 멤버 배정 모달 닫기
  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedPosition(null);
    setPositionMembers([]);
  };

  // 멤버에게 직책 부여
  const handleAssignMember = async (memberId: string) => {
    if (!selectedPosition) return;

    try {
      await positionApi.assignPosition(groupId, memberId, {
        positionId: selectedPosition.id,
      });
      toast.success('직책이 부여되었습니다.');

      // 목록 갱신
      const response = await positionApi.getPositionMembers(groupId, selectedPosition.id);
      setPositionMembers(response.data);
    } catch {
      toast.error('직책 부여에 실패했습니다.');
    }
  };

  // 멤버 직책 해제
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedPosition) return;

    try {
      await positionApi.removePosition(groupId, memberId, selectedPosition.id);
      toast.success('직책이 해제되었습니다.');

      // 목록 갱신
      const response = await positionApi.getPositionMembers(groupId, selectedPosition.id);
      setPositionMembers(response.data);
    } catch {
      toast.error('직책 해제에 실패했습니다.');
    }
  };

  // 이 직책에 배정되지 않은 멤버 목록
  const availableMembers = members.filter(
    (m) => !positionMembers.some((pm) => pm.memberId === m.id)
  );

  if (loading) {
    return <p className="group-detail__loading-text">로딩 중...</p>;
  }

  return (
    <div className="group-detail__positions">
      <div className="group-detail__positions-header">
        <h2>직책 관리</h2>
        {isAdmin && (
          <button
            className="group-detail__add-btn"
            onClick={() => setShowModal(true)}
          >
            + 직책 추가
          </button>
        )}
      </div>

      {positions.length === 0 ? (
        <EmptyState
          description="등록된 직책이 없습니다"
          action={
            isAdmin
              ? { label: '첫 직책 만들기', onClick: () => setShowModal(true) }
              : undefined
          }
        />
      ) : (
        <div className="positions-grid">
          {positions.map((position) => (
            <div
              key={position.id}
              className="position-card"
              style={{ borderLeftColor: position.color || '#3b82f6' }}
            >
              <div className="position-card__header">
                <div className="position-card__title">
                  <span
                    className="position-card__color"
                    style={{ backgroundColor: position.color || '#3b82f6' }}
                  />
                  <h3>{position.name}</h3>
                </div>
                {isAdmin && (
                  <div className="position-card__actions">
                    <button
                      className="position-card__action"
                      onClick={() => openAssignModal(position)}
                      title="멤버 관리"
                    >
                      👥
                    </button>
                    <button
                      className="position-card__action"
                      onClick={() => openEditModal(position)}
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      className="position-card__action position-card__action--delete"
                      onClick={() => handleDelete(position)}
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
              {position.description && (
                <p className="position-card__desc">{position.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 직책 생성/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingPosition ? '직책 수정' : '직책 추가'}
        description="모임 내 역할을 정의하세요"
        actions={
          <>
            <button className="modal__cancel" onClick={closeModal}>
              취소
            </button>
            <button
              className="modal__submit"
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
            >
              {saving ? '저장 중...' : editingPosition ? '수정하기' : '추가하기'}
            </button>
          </>
        }
      >
        <div className="modal__field">
          <label className="modal__label">직책명 *</label>
          <input
            type="text"
            className="modal__input"
            placeholder="예: 총무, 회계, 찬양리더"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={50}
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">설명</label>
          <textarea
            className="modal__textarea"
            placeholder="직책에 대한 설명"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
        </div>

        <div className="modal__field">
          <label className="modal__label">색상</label>
          <div className="modal__color-picker">
            {POSITION_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`modal__color-option ${form.color === color.value ? 'active' : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => setForm({ ...form, color: color.value })}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </Modal>

      {/* 멤버 배정 모달 */}
      <Modal
        isOpen={showAssignModal}
        onClose={closeAssignModal}
        title={`"${selectedPosition?.name}" 멤버 관리`}
        description="이 직책에 멤버를 배정하세요"
        size="lg"
        actions={
          <button className="modal__cancel" onClick={closeAssignModal}>
            닫기
          </button>
        }
      >
        {assignLoading ? (
          <p className="modal__loading">로딩 중...</p>
        ) : (
          <div className="position-members">
            <div className="position-members__section">
              <h4>배정된 멤버 ({positionMembers.length})</h4>
              {positionMembers.length === 0 ? (
                <p className="position-members__empty">배정된 멤버가 없습니다</p>
              ) : (
                <div className="position-members__list">
                  {positionMembers.map((pm) => (
                    <div key={pm.memberId} className="position-member-item">
                      <div className="position-member-item__avatar">
                        {pm.profileImage ? (
                          <img src={pm.profileImage} alt={pm.name} />
                        ) : (
                          pm.name.charAt(0)
                        )}
                      </div>
                      <span className="position-member-item__name">{pm.name}</span>
                      <button
                        className="position-member-item__remove"
                        onClick={() => handleRemoveMember(pm.memberId)}
                        title="해제"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="position-members__section">
              <h4>멤버 추가</h4>
              {availableMembers.length === 0 ? (
                <p className="position-members__empty">추가할 수 있는 멤버가 없습니다</p>
              ) : (
                <div className="position-members__list">
                  {availableMembers.map((member) => (
                    <div key={member.id} className="position-member-item">
                      <div className="position-member-item__avatar">
                        {member.user?.profileImage ? (
                          <img src={member.user.profileImage} alt={member.user.name} />
                        ) : (
                          member.user?.name?.charAt(0) || '?'
                        )}
                      </div>
                      <span className="position-member-item__name">{member.user?.name}</span>
                      <button
                        className="position-member-item__add"
                        onClick={() => handleAssignMember(member.id)}
                        title="추가"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PositionsTab;
