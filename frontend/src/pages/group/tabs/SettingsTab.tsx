import { Modal, LocationPicker } from '@/components';
import { useSettingsTab } from './hooks';
import { GroupInfoSection, PracticeRoomSection, LocationSection, DangerSection, LeaveSection } from './components';
import PositionsTab from '../PositionsTab';
import type { SettingsTabProps } from './types';

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
  const {
    // Practice rooms
    practiceRooms,
    practiceRoomsLoading,
    practiceRoomSettings,
    practiceRoomSettingsChanged,
    practiceRoomSaving,
    newPracticeRoomName,
    setNewPracticeRoomName,
    newPracticeRoomCapacity,
    setNewPracticeRoomCapacity,
    updatePracticeRoomSetting,
    handleSavePracticeRoomSettings,
    handleAddPracticeRoom,
    handleUpdateRoomCapacity,
    handleDeletePracticeRoom,
    // Locations
    favoriteLocations,
    showLocationModal,
    editingLocation,
    locationForm,
    locationSaving,
    openLocationModal,
    closeLocationModal,
    setLocationForm,
    handleSaveLocation,
    handleDeleteLocation,
  } = useSettingsTab({ groupId, currentGroup });

  return (
    <div className="group-detail__settings">
      {isAdmin ? (
        <>
          {/* 모임 정보 섹션 */}
          <GroupInfoSection currentGroup={currentGroup} isOwner={isOwner} />

          {/* 직책 관리 섹션 */}
          {groupId && (
            <div className="group-detail__setting-section">
              <PositionsTab groupId={groupId} members={members} isAdmin={isAdmin} groupType={currentGroup.type} />
            </div>
          )}

          {/* 연습실 관리 섹션 (학원 타입 + 연습실 ON) */}
          {currentGroup.type === 'education' && currentGroup.hasPracticeRooms && (
            <PracticeRoomSection
              practiceRooms={practiceRooms}
              practiceRoomsLoading={practiceRoomsLoading}
              practiceRoomSettings={practiceRoomSettings}
              practiceRoomSettingsChanged={practiceRoomSettingsChanged}
              practiceRoomSaving={practiceRoomSaving}
              newPracticeRoomName={newPracticeRoomName}
              setNewPracticeRoomName={setNewPracticeRoomName}
              newPracticeRoomCapacity={newPracticeRoomCapacity}
              setNewPracticeRoomCapacity={setNewPracticeRoomCapacity}
              onSettingChange={updatePracticeRoomSetting}
              onSaveSettings={handleSavePracticeRoomSettings}
              onAddRoom={handleAddPracticeRoom}
              onUpdateCapacity={handleUpdateRoomCapacity}
              onDeleteRoom={handleDeletePracticeRoom}
            />
          )}

          {/* 모임 장소 설정 섹션 */}
          <LocationSection
            favoriteLocations={favoriteLocations}
            onOpenModal={openLocationModal}
            onDelete={handleDeleteLocation}
          />

          {/* 모임 삭제 (운영자만) */}
          {isOwner && (
            <DangerSection
              memberCount={memberCount}
              onShowDeleteModal={onShowDeleteModal}
            />
          )}
        </>
      ) : (
        <LeaveSection onShowLeaveModal={onShowLeaveModal} />
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
