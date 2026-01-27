import { useState, useEffect, useCallback } from 'react';
import { positionApi } from '@/api';
import { useToast, Modal, EmptyState } from '@/components';
import { useLoading } from '@/hooks';
import { getPositionLabel } from '@/constants/labels';
import type { Position, PositionFormData, GroupMember, PositionMember } from '@/types';

interface PositionsTabProps {
  groupId: string;
  members: GroupMember[];
  isAdmin: boolean;
  groupType?: string;
}

const PositionsTab = ({ groupId, members, isAdmin, groupType }: PositionsTabProps) => {
  const positionLabel = getPositionLabel(groupType);
  const toast = useToast();

  // 직책 목록
  const [positions, setPositions] = useState<Position[]>([]);
  const { loading, withLoading } = useLoading(true);

  // 직책/직분 생성/수정 모달
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [form, setForm] = useState<PositionFormData>({ name: '' });
  const { loading: saving, withLoading: withSaving } = useLoading();

  // 멤버 배정 모달
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [positionMembers, setPositionMembers] = useState<PositionMember[]>([]);
  const { loading: assignLoading, withLoading: withAssignLoading } = useLoading();

  // 직책 목록 조회
  const fetchPositions = useCallback(async () => {
    await withLoading(async () => {
      const response = await positionApi.getList(groupId);
      setPositions(response.data);
    }).catch((error) => console.error('Failed to fetch positions:', error));
  }, [groupId, withLoading]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // 직책/직분 생성/수정
  const handleSave = async () => {
    if (!form.name.trim()) return;

    await withSaving(async () => {
      if (editingPosition) {
        await positionApi.update(groupId, editingPosition.id, form);
        toast.success(`${positionLabel}이 수정되었습니다.`);
      } else {
        await positionApi.create(groupId, form);
        toast.success(`${positionLabel}이 생성되었습니다.`);
      }
      await fetchPositions();
      closeModal();
    }).catch(() => toast.error(`${positionLabel} 저장에 실패했습니다.`));
  };

  // 직책/직분 삭제
  const handleDelete = async (position: Position) => {
    if (!confirm(`"${position.name}" ${positionLabel}을 삭제하시겠습니까?`)) return;

    try {
      await positionApi.delete(groupId, position.id);
      toast.success(`${positionLabel}이 삭제되었습니다.`);
      await fetchPositions();
    } catch {
      toast.error(`${positionLabel} 삭제에 실패했습니다.`);
    }
  };

  // 수정 모달 열기
  const openEditModal = (position: Position) => {
    setEditingPosition(position);
    setForm({
      name: position.name,
    });
    setShowModal(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false);
    setEditingPosition(null);
    setForm({ name: '' });
  };

  // 멤버 배정 모달 열기
  const openAssignModal = async (position: Position) => {
    setSelectedPosition(position);
    setShowAssignModal(true);

    await withAssignLoading(async () => {
      const response = await positionApi.getPositionMembers(groupId, position.id);
      setPositionMembers(response.data);
    }).catch((error) => console.error('Failed to fetch position members:', error));
  };

  // 멤버 배정 모달 닫기
  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedPosition(null);
    setPositionMembers([]);
  };

  // 멤버에게 직책/직분 부여
  const handleAssignMember = async (memberId: string) => {
    if (!selectedPosition) return;

    try {
      await positionApi.assignPosition(groupId, memberId, {
        positionId: selectedPosition.id,
      });
      toast.success(`${positionLabel}이 부여되었습니다.`);

      // 목록 갱신
      const response = await positionApi.getPositionMembers(groupId, selectedPosition.id);
      setPositionMembers(response.data);
    } catch {
      toast.error(`${positionLabel} 부여에 실패했습니다.`);
    }
  };

  // 멤버 직책/직분 해제
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedPosition) return;

    try {
      await positionApi.removePosition(groupId, memberId, selectedPosition.id);
      toast.success(`${positionLabel}이 해제되었습니다.`);

      // 목록 갱신
      const response = await positionApi.getPositionMembers(groupId, selectedPosition.id);
      setPositionMembers(response.data);
    } catch {
      toast.error(`${positionLabel} 해제에 실패했습니다.`);
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
        <h2>{positionLabel} 관리</h2>
        {isAdmin && (
          <button
            className="group-detail__add-btn"
            onClick={() => setShowModal(true)}
          >
            + {positionLabel} 추가
          </button>
        )}
      </div>

      {positions.length === 0 ? (
        <EmptyState
          description={`등록된 ${positionLabel}이 없습니다`}
          action={
            isAdmin
              ? { label: `첫 ${positionLabel} 만들기`, onClick: () => setShowModal(true) }
              : undefined
          }
        />
      ) : (
        <div className="positions-grid">
          {positions.map((position) => (
            <div
              key={position.id}
              className="position-card"
              onClick={() => openAssignModal(position)}
            >
              <div className="position-card__header">
                <h3 className="position-card__name">{position.name}</h3>
                {isAdmin && (
                  <div className="position-card__actions">
                    <button
                      className="position-card__action"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(position);
                      }}
                      title="수정"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="position-card__action position-card__action--delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(position);
                      }}
                      title="삭제"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="position-card__count">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{position.memberCount || 0}명</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 직책/직분 생성/수정 모달 */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingPosition ? `${positionLabel} 수정` : `${positionLabel} 추가`}
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
          <label className="modal__label">{positionLabel}명 *</label>
          <input
            type="text"
            className="modal__input"
            placeholder={groupType === 'religious' ? '예: 목사, 전도사, 장로' : '예: 총무, 회계, 팀장'}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={50}
          />
        </div>
      </Modal>

      {/* 멤버 배정 모달 */}
      <Modal
        isOpen={showAssignModal}
        onClose={closeAssignModal}
        title={`"${selectedPosition?.name}" 멤버 관리`}
        description={`이 ${positionLabel}에 멤버를 배정하세요`}
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
