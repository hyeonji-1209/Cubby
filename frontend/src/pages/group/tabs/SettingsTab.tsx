import { useState } from 'react';
import { Modal, LocationPicker } from '@/components';
import { useSettingsTab } from './hooks';
import { GroupInfoSection, OperatingHoursSection, LessonRoomSection, LocationSection, DangerSection, LeaveSection } from './components';
import { InstructorManagement } from '../components';
import PositionsTab from '../PositionsTab';
import type { SettingsTabProps } from './types';

type SettingsSubTab = 'basic' | 'members' | 'facilities' | 'danger';

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
    // Lesson rooms (1:1 수업용) - 클래스 예약 통합
    lessonRooms,
    lessonRoomsLoading,
    newLessonRoomName,
    setNewLessonRoomName,
    newLessonRoomCapacity,
    setNewLessonRoomCapacity,
    handleAddLessonRoom,
    handleUpdateLessonRoomCapacity,
    handleDeleteLessonRoom,
    handleTogglePracticeExclusion,
    // 클래스 예약 설정
    reservationSettings,
    reservationSettingsChanged,
    reservationSettingsSaving,
    updateReservationSetting,
    handleSaveReservationSettings,
  } = useSettingsTab({ groupId, currentGroup });

  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('basic');

  // 멤버 관리 탭 표시 조건 (강사 관리 또는 직책 관리가 있을 때)
  const showMembersTab = isAdmin && (
    (currentGroup.type === 'education' && !currentGroup.hasClasses && currentGroup.hasMultipleInstructors) ||
    groupId
  );

  // 시설 관리 탭 표시 조건
  const showFacilitiesTab = isAdmin && currentGroup.type === 'education' && (
    !currentGroup.hasClasses || currentGroup.hasPracticeRooms
  );

  return (
    <div className="group-detail__settings">
      {isAdmin ? (
        <>
          {/* 설정 서브탭 네비게이션 */}
          <div className="settings-tabs">
            <button
              className={`settings-tabs__btn ${activeSubTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('basic')}
            >
              기본 설정
            </button>
            {showMembersTab && (
              <button
                className={`settings-tabs__btn ${activeSubTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('members')}
              >
                멤버 관리
              </button>
            )}
            {showFacilitiesTab && (
              <button
                className={`settings-tabs__btn ${activeSubTab === 'facilities' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('facilities')}
              >
                시설 관리
              </button>
            )}
            {isOwner && (
              <button
                className={`settings-tabs__btn settings-tabs__btn--danger ${activeSubTab === 'danger' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('danger')}
              >
                모임 관리
              </button>
            )}
          </div>

          {/* 기본 설정 탭 */}
          {activeSubTab === 'basic' && (
            <div className="settings-content">
              <GroupInfoSection
                currentGroup={currentGroup}
                isOwner={isOwner}
                isAdmin={isAdmin}
                onFeatureToggle={handleFeatureToggle}
                onUpdateBasicInfo={handleUpdateBasicInfo}
                basicInfoSaving={basicInfoSaving}
              />

              {currentGroup.type === 'education' && (
                <OperatingHoursSection
                  operatingHours={operatingHours}
                  operatingHoursChanged={operatingHoursChanged}
                  operatingHoursSaving={operatingHoursSaving}
                  onSettingChange={updateOperatingHoursSetting}
                  onSaveSettings={handleSaveOperatingHours}
                />
              )}

              <LocationSection
                favoriteLocations={favoriteLocations}
                onOpenModal={openLocationModal}
                onDelete={handleDeleteLocation}
              />
            </div>
          )}

          {/* 멤버 관리 탭 */}
          {activeSubTab === 'members' && showMembersTab && (
            <div className="settings-content">
              {currentGroup.type === 'education' && !currentGroup.hasClasses && currentGroup.hasMultipleInstructors && (
                <div className="group-detail__setting-section">
                  <InstructorManagement
                    groupId={groupId}
                    members={members}
                  />
                </div>
              )}

              {groupId && (
                <div className="group-detail__setting-section">
                  <PositionsTab groupId={groupId} members={members} isAdmin={isAdmin} groupType={currentGroup.type} />
                </div>
              )}
            </div>
          )}

          {/* 시설 관리 탭 */}
          {activeSubTab === 'facilities' && showFacilitiesTab && (
            <div className="settings-content">
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
                  onTogglePracticeExclusion={handleTogglePracticeExclusion}
                  hasPracticeRooms={currentGroup.hasPracticeRooms}
                  reservationSettings={reservationSettings}
                  reservationSettingsChanged={reservationSettingsChanged}
                  reservationSettingsSaving={reservationSettingsSaving}
                  onReservationSettingChange={updateReservationSetting}
                  onSaveReservationSettings={handleSaveReservationSettings}
                />
              )}

            </div>
          )}

          {/* 모임 관리 (위험 영역) 탭 */}
          {activeSubTab === 'danger' && isOwner && (
            <div className="settings-content">
              <DangerSection
                memberCount={memberCount}
                onShowDeleteModal={onShowDeleteModal}
              />
            </div>
          )}
        </>
      ) : (
        // 교육/학원 타입은 학생이 직접 나가기 불가
        currentGroup.type !== 'education' && (
          <LeaveSection onShowLeaveModal={onShowLeaveModal} />
        )
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
