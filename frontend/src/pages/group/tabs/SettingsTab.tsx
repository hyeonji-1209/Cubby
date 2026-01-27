import { useEffect, useState } from 'react';
import { GROUP_TYPE_LABELS } from '@/constants/labels';
import { Modal, LocationPicker, useToast } from '@/components';
import { useGroupDetailStore } from '@/store';
import { practiceRoomApi, groupApi } from '@/api';
import PositionsTab from '../PositionsTab';
import type { SettingsTabProps } from './types';
import type { PracticeRoom } from '@/types';

const SettingsTab: React.FC<SettingsTabProps> = ({
  groupId,
  currentGroup,
  isOwner,
  isAdmin,
  members,
  memberCount,
  onShowLeaveModal,
  onShowDeleteModal,
}) => {
  const { showToast } = useToast();

  const {
    practiceRooms,
    practiceRoomsLoading,
    favoriteLocations,
    showLocationModal,
    editingLocation,
    locationForm,
    locationSaving,
    fetchPracticeRooms,
    fetchFavoriteLocations,
    openLocationModal,
    closeLocationModal,
    setLocationForm,
    saveLocation,
    deleteLocation,
  } = useGroupDetailStore();

  // 연습실 설정 로컬 상태
  const [practiceRoomSettings, setPracticeRoomSettings] = useState({
    openTime: currentGroup?.practiceRoomSettings?.openTime || '09:00',
    closeTime: currentGroup?.practiceRoomSettings?.closeTime || '22:00',
    slotMinutes: (currentGroup?.practiceRoomSettings?.slotMinutes || 30) as 30 | 60,
    maxHoursPerDay: currentGroup?.practiceRoomSettings?.maxHoursPerDay || 2,
  });
  const [practiceRoomSettingsChanged, setPracticeRoomSettingsChanged] = useState(false);
  const [practiceRoomSaving, setPracticeRoomSaving] = useState(false);
  const [newPracticeRoomName, setNewPracticeRoomName] = useState('');
  const [newPracticeRoomCapacity, setNewPracticeRoomCapacity] = useState(1);

  useEffect(() => {
    if (groupId) {
      fetchFavoriteLocations(groupId);
      if (currentGroup?.type === 'education' && currentGroup?.hasPracticeRooms) {
        fetchPracticeRooms(groupId);
      }
    }
  }, [groupId, currentGroup?.type, currentGroup?.hasPracticeRooms, fetchFavoriteLocations, fetchPracticeRooms]);

  const handleSavePracticeRoomSettings = async () => {
    setPracticeRoomSaving(true);
    try {
      await groupApi.update(groupId, { practiceRoomSettings });
      setPracticeRoomSettingsChanged(false);
      showToast('success', '연습실 설정이 저장되었습니다.');
    } catch {
      showToast('error', '설정 저장에 실패했습니다.');
    } finally {
      setPracticeRoomSaving(false);
    }
  };

  const handleAddPracticeRoom = async () => {
    if (!newPracticeRoomName.trim()) return;
    try {
      await practiceRoomApi.create(groupId, {
        name: newPracticeRoomName.trim(),
        capacity: newPracticeRoomCapacity,
      });
      setNewPracticeRoomName('');
      setNewPracticeRoomCapacity(1);
      fetchPracticeRooms(groupId);
      showToast('success', '연습실이 추가되었습니다.');
    } catch {
      showToast('error', '연습실 추가에 실패했습니다.');
    }
  };

  const handleUpdateRoomCapacity = async (roomId: string, capacity: number) => {
    try {
      await practiceRoomApi.update(groupId, roomId, { capacity });
      fetchPracticeRooms(groupId);
    } catch {
      showToast('error', '수용 인원 변경에 실패했습니다.');
    }
  };

  const handleDeletePracticeRoom = async (room: PracticeRoom) => {
    if (window.confirm(`"${room.name}"을(를) 삭제하시겠습니까?`)) {
      try {
        await practiceRoomApi.delete(groupId, room.id);
        fetchPracticeRooms(groupId);
        showToast('success', '연습실이 삭제되었습니다.');
      } catch {
        showToast('error', '연습실 삭제에 실패했습니다.');
      }
    }
  };

  const handleSaveLocation = async () => {
    await saveLocation(groupId);
    showToast('success', editingLocation ? '장소가 수정되었습니다.' : '장소가 추가되었습니다.');
  };

  const handleDeleteLocation = async (location: typeof favoriteLocations[number]) => {
    if (window.confirm(`"${location.name}"을(를) 삭제하시겠습니까?`)) {
      const success = await deleteLocation(groupId, location);
      if (success) {
        showToast('success', '장소가 삭제되었습니다.');
      } else {
        showToast('error', '장소 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <div className="group-detail__settings">
      {isAdmin ? (
        <>
          {/* 모임 정보 섹션 */}
          <div className="group-detail__setting-section">
            <h3>모임 정보</h3>
            <div className="group-detail__setting-item">
              <span className="label">모임 이름</span>
              <span className="value">{currentGroup.name}</span>
            </div>
            <div className="group-detail__setting-item">
              <span className="label">타입</span>
              <span className="value">{GROUP_TYPE_LABELS[currentGroup.type]}</span>
            </div>
            {isOwner && (
              <div className="group-detail__setting-item">
                <span className="label">초대 코드</span>
                <span className="value code">{currentGroup.inviteCode}</span>
              </div>
            )}
          </div>

          {/* 직책 관리 섹션 */}
          {groupId && (
            <div className="group-detail__setting-section">
              <PositionsTab groupId={groupId} members={members} isAdmin={isAdmin} groupType={currentGroup.type} />
            </div>
          )}

          {/* 연습실 관리 섹션 (학원 타입 + 연습실 ON) */}
          {currentGroup.type === 'education' && currentGroup.hasPracticeRooms && (
            <div className="group-detail__setting-section">
              <div className="group-detail__setting-header">
                <h3>🚪 연습실 관리</h3>
                {practiceRoomSettingsChanged && (
                  <button
                    className="group-detail__setting-save-btn"
                    disabled={practiceRoomSaving}
                    onClick={handleSavePracticeRoomSettings}
                  >
                    {practiceRoomSaving ? '저장 중...' : '저장'}
                  </button>
                )}
              </div>

              {/* 운영 시간 */}
              <div className="group-detail__setting-item">
                <span className="label">운영 시간</span>
                <div className="group-detail__practice-room-time">
                  <input
                    type="time"
                    value={practiceRoomSettings.openTime}
                    onChange={(e) => {
                      setPracticeRoomSettings((prev) => ({ ...prev, openTime: e.target.value }));
                      setPracticeRoomSettingsChanged(true);
                    }}
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={practiceRoomSettings.closeTime}
                    onChange={(e) => {
                      setPracticeRoomSettings((prev) => ({ ...prev, closeTime: e.target.value }));
                      setPracticeRoomSettingsChanged(true);
                    }}
                  />
                </div>
              </div>

              {/* 예약 단위 */}
              <div className="group-detail__setting-item">
                <span className="label">예약 단위</span>
                <div className="group-detail__practice-room-toggle">
                  <button
                    type="button"
                    className={`group-detail__toggle-btn ${practiceRoomSettings.slotMinutes === 30 ? 'active' : ''}`}
                    onClick={() => {
                      setPracticeRoomSettings((prev) => ({ ...prev, slotMinutes: 30 }));
                      setPracticeRoomSettingsChanged(true);
                    }}
                  >
                    30분
                  </button>
                  <button
                    type="button"
                    className={`group-detail__toggle-btn ${practiceRoomSettings.slotMinutes === 60 ? 'active' : ''}`}
                    onClick={() => {
                      setPracticeRoomSettings((prev) => ({ ...prev, slotMinutes: 60 }));
                      setPracticeRoomSettingsChanged(true);
                    }}
                  >
                    1시간
                  </button>
                </div>
              </div>

              {/* 1일 최대 예약 */}
              <div className="group-detail__setting-item">
                <span className="label">1인 1일 최대</span>
                <div className="group-detail__practice-room-max">
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeRoomSettings((prev) => ({
                        ...prev,
                        maxHoursPerDay: Math.max(1, prev.maxHoursPerDay - 1),
                      }));
                      setPracticeRoomSettingsChanged(true);
                    }}
                  >
                    -
                  </button>
                  <span>{practiceRoomSettings.maxHoursPerDay}시간</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPracticeRoomSettings((prev) => ({
                        ...prev,
                        maxHoursPerDay: Math.min(8, prev.maxHoursPerDay + 1),
                      }));
                      setPracticeRoomSettingsChanged(true);
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 연습실 목록 */}
              <div className="group-detail__practice-room-list-section">
                <h4>연습실 목록</h4>
                <div className="group-detail__practice-room-add">
                  <input
                    type="text"
                    placeholder="연습실 이름 (예: A실, 1번 연습실)"
                    value={newPracticeRoomName}
                    onChange={(e) => setNewPracticeRoomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        handleAddPracticeRoom();
                      }
                    }}
                  />
                  <div className="group-detail__practice-room-capacity-input">
                    <span>수용</span>
                    <button type="button" onClick={() => setNewPracticeRoomCapacity(c => Math.max(1, c - 1))}>-</button>
                    <span>{newPracticeRoomCapacity}명</span>
                    <button type="button" onClick={() => setNewPracticeRoomCapacity(c => Math.min(20, c + 1))}>+</button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPracticeRoom}
                    disabled={!newPracticeRoomName.trim()}
                  >
                    추가
                  </button>
                </div>
                {practiceRoomsLoading ? (
                  <p className="group-detail__setting-hint">불러오는 중...</p>
                ) : practiceRooms.length === 0 ? (
                  <p className="group-detail__setting-empty">등록된 연습실이 없습니다</p>
                ) : (
                  <div className="group-detail__practice-room-items">
                    {practiceRooms.map((room) => (
                      <div key={room.id} className="group-detail__practice-room-item">
                        <span className="group-detail__practice-room-name">{room.name}</span>
                        <div className="group-detail__practice-room-capacity">
                          <button
                            type="button"
                            onClick={() => handleUpdateRoomCapacity(room.id, Math.max(1, room.capacity - 1))}
                          >
                            -
                          </button>
                          <span>{room.capacity}명</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateRoomCapacity(room.id, Math.min(20, room.capacity + 1))}
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="group-detail__practice-room-delete"
                          onClick={() => handleDeletePracticeRoom(room)}
                          title="삭제"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 모임 장소 설정 섹션 */}
          <div className="group-detail__setting-section">
            <div className="group-detail__setting-header">
              <h3>모임 장소</h3>
              <button
                className="group-detail__setting-add-btn"
                onClick={() => openLocationModal()}
              >
                + 장소 추가
              </button>
            </div>
            {favoriteLocations.length === 0 ? (
              <p className="group-detail__setting-empty">등록된 장소가 없습니다</p>
            ) : (
              <div className="group-detail__location-list">
                {favoriteLocations.map((location) => (
                  <div key={location.id} className="group-detail__location-item">
                    <div className="group-detail__location-info">
                      <span className="group-detail__location-name">{location.name}</span>
                      <span className="group-detail__location-address">
                        {location.address}
                        {location.detail && ` (${location.detail})`}
                      </span>
                    </div>
                    <div className="group-detail__location-actions">
                      <button
                        className="group-detail__location-btn"
                        onClick={() => openLocationModal(location)}
                        title="수정"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="group-detail__location-btn group-detail__location-btn--danger"
                        onClick={() => handleDeleteLocation(location)}
                        title="삭제"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 모임 삭제/나가기 */}
          {isOwner && (
            <div className="group-detail__setting-section group-detail__setting-section--danger">
              <h3>모임 삭제</h3>
              {memberCount === 1 ? (
                <button
                  className="group-detail__danger-btn"
                  onClick={onShowDeleteModal}
                >
                  모임 삭제
                </button>
              ) : (
                <p className="group-detail__warning">
                  운영자는 모임을 나갈 수 없습니다. 다른 멤버에게 운영자 권한을 넘긴 후 나가세요.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="group-detail__setting-section">
            <h3>모임 나가기</h3>
            <p className="group-detail__leave-desc">
              모임을 나가면 더 이상 이 모임의 공지사항, 일정 등을 확인할 수 없습니다.
            </p>
            <button
              className="group-detail__leave-btn"
              onClick={onShowLeaveModal}
            >
              모임 나가기
            </button>
          </div>
        </>
      )}

      {/* 장소 추가/수정 모달 */}
      <Modal
        isOpen={showLocationModal}
        onClose={closeLocationModal}
        title={editingLocation ? '장소 수정' : '장소 추가'}
        size="md"
      >
        <div className="location-form">
          <LocationPicker
            value={locationForm}
            onChange={setLocationForm}
            placeholder="장소 이름을 입력하세요"
          />
          <div className="location-form__actions">
            <button
              type="button"
              className="location-form__cancel"
              onClick={closeLocationModal}
              disabled={locationSaving}
            >
              취소
            </button>
            <button
              type="button"
              className="location-form__submit"
              onClick={handleSaveLocation}
              disabled={!locationForm?.name || !locationForm?.address || locationSaving}
            >
              {locationSaving ? '저장 중...' : editingLocation ? '수정하기' : '추가하기'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsTab;
