import { QRCodeSVG } from 'qrcode.react';
import { Modal, LocationPicker } from '@/components';
import { useSettingsTab } from './hooks';
import { GroupInfoSection, PracticeRoomSection, OperatingHoursSection, LessonRoomSection, LocationSection, DangerSection, LeaveSection, HolidaySection } from './components';
import { InstructorManagement } from '../components';
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
    // QR Code
    showQRModal,
    selectedRoomForQR,
    handleShowQRCode,
    handleCloseQRModal,
    // Feature toggle
    handleFeatureToggle,
    // Basic info
    basicInfoSaving,
    handleUpdateBasicInfo,
    // Operating hours
    operatingHours,
    operatingHoursChanged,
    operatingHoursSaving,
    updateOperatingHoursSetting,
    handleSaveOperatingHours,
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
    // Lesson rooms (1:1 수업용)
    lessonRooms,
    lessonRoomsLoading,
    newLessonRoomName,
    setNewLessonRoomName,
    newLessonRoomCapacity,
    setNewLessonRoomCapacity,
    handleAddLessonRoom,
    handleUpdateLessonRoomCapacity,
    handleDeleteLessonRoom,
  } = useSettingsTab({ groupId, currentGroup });

  return (
    <div className="group-detail__settings">
      {isAdmin ? (
        <>
          {/* 모임 정보 섹션 */}
          <GroupInfoSection
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            onFeatureToggle={handleFeatureToggle}
            onUpdateBasicInfo={handleUpdateBasicInfo}
            basicInfoSaving={basicInfoSaving}
          />

          {/* 학원 운영시간 설정 (학원 타입 전용) */}
          {currentGroup.type === 'education' && (
            <OperatingHoursSection
              operatingHours={operatingHours}
              operatingHoursChanged={operatingHoursChanged}
              operatingHoursSaving={operatingHoursSaving}
              onSettingChange={updateOperatingHoursSetting}
              onSaveSettings={handleSaveOperatingHours}
            />
          )}

          {/* 휴일 관리 섹션 (학원 타입 전용) */}
          {currentGroup.type === 'education' && (
            <HolidaySection groupId={groupId} />
          )}

          {/* 강사 관리 섹션 (1:1 교육 + 다중 강사 모드) */}
          {currentGroup.type === 'education' && !currentGroup.hasClasses && currentGroup.hasMultipleInstructors && (
            <div className="group-detail__setting-section">
              <InstructorManagement
                groupId={groupId}
                members={members}
              />
            </div>
          )}

          {/* 직책 관리 섹션 */}
          {groupId && (
            <div className="group-detail__setting-section">
              <PositionsTab groupId={groupId} members={members} isAdmin={isAdmin} groupType={currentGroup.type} />
            </div>
          )}

          {/* 수업실 관리 섹션 (1:1 수업 전용) */}
          {currentGroup.type === 'education' && !currentGroup.hasClasses && (
            <LessonRoomSection
              lessonRooms={lessonRooms}
              lessonRoomsLoading={lessonRoomsLoading}
              newLessonRoomName={newLessonRoomName}
              setNewLessonRoomName={setNewLessonRoomName}
              newLessonRoomCapacity={newLessonRoomCapacity}
              setNewLessonRoomCapacity={setNewLessonRoomCapacity}
              onAddRoom={handleAddLessonRoom}
              onUpdateCapacity={handleUpdateLessonRoomCapacity}
              onDeleteRoom={handleDeleteLessonRoom}
            />
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
              onShowQRCode={handleShowQRCode}
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

      {/* 연습실 QR 코드 모달 */}
      <Modal
        isOpen={showQRModal}
        onClose={handleCloseQRModal}
        title={`${selectedRoomForQR?.name || '연습실'} QR 코드`}
        size="sm"
      >
        <div className="qr-modal">
          <div className="qr-modal__code">
            <QRCodeSVG
              value={`${window.location.origin}/groups/${groupId}/practice-rooms/${selectedRoomForQR?.id}`}
              size={200}
              level="M"
              marginSize={2}
            />
          </div>
          <p className="qr-modal__hint">
            이 QR 코드를 스캔하면 연습실 예약 페이지로 이동합니다.
          </p>
          <p className="qr-modal__room-info">
            수용 인원: {selectedRoomForQR?.capacity}명
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsTab;
