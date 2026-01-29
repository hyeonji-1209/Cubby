import { useState } from 'react';
import { GROUP_TYPE_LABELS, DAYS_OF_WEEK } from '@/constants/labels';
import { IconPicker } from '@/components';
import { QRIcon } from '@/components/icons';
import type { Group, PracticeRoom, OperatingHours } from '@/types';
import type { FavoriteLocation, LessonRoom } from '@/api';

// 기본 정보 편집 인터페이스
interface GroupBasicInfo {
  name: string;
  description: string;
  icon: string;
  color: string;
  logoImage?: string;
}

// 모임 정보 섹션
interface GroupInfoSectionProps {
  currentGroup: Group;
  isOwner: boolean;
  isAdmin: boolean;
  onFeatureToggle?: (feature: 'hasClasses' | 'hasPracticeRooms' | 'hasAttendance' | 'allowGuardians' | 'hasMultipleInstructors' | 'requiresApproval', value: boolean) => void;
  onUpdateBasicInfo?: (info: GroupBasicInfo) => Promise<void>;
  basicInfoSaving?: boolean;
}

export const GroupInfoSection = ({ currentGroup, isOwner, isAdmin, onFeatureToggle, onUpdateBasicInfo, basicInfoSaving }: GroupInfoSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<GroupBasicInfo>({
    name: currentGroup.name,
    description: currentGroup.description || '',
    icon: currentGroup.icon || '',
    color: currentGroup.color || '#6366f1',
    logoImage: currentGroup.logoImage,
  });

  const handleSave = async () => {
    if (onUpdateBasicInfo) {
      await onUpdateBasicInfo(editForm);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: currentGroup.name,
      description: currentGroup.description || '',
      icon: currentGroup.icon || '',
      color: currentGroup.color || '#6366f1',
      logoImage: currentGroup.logoImage,
    });
    setIsEditing(false);
  };

  return (
    <div className="group-detail__setting-section">
      <div className="group-detail__setting-header">
        <h3>모임 정보</h3>
        {isAdmin && !isEditing && (
          <button
            className="group-detail__setting-edit-btn"
            onClick={() => setIsEditing(true)}
          >
            수정
          </button>
        )}
        {isEditing && (
          <div className="group-detail__setting-actions">
            <button
              className="group-detail__setting-cancel-btn"
              onClick={handleCancel}
              disabled={basicInfoSaving}
            >
              취소
            </button>
            <button
              className="group-detail__setting-save-btn"
              onClick={handleSave}
              disabled={!editForm.name.trim() || basicInfoSaving}
            >
              {basicInfoSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="group-detail__basic-edit-form">
          <div className="group-detail__basic-edit-row">
            <div className="group-detail__basic-edit-icon">
              <IconPicker
                icon={editForm.icon}
                color={editForm.color}
                image={editForm.logoImage}
                onIconChange={(v) => setEditForm(prev => ({ ...prev, icon: v }))}
                onColorChange={(v) => setEditForm(prev => ({ ...prev, color: v }))}
                onImageChange={(v) => setEditForm(prev => ({ ...prev, logoImage: v }))}
              />
            </div>
            <div className="group-detail__basic-edit-name">
              <label>모임 이름</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="모임 이름을 입력하세요"
                maxLength={50}
              />
            </div>
          </div>
          <div className="group-detail__basic-edit-field">
            <label>설명</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="모임에 대한 간단한 설명"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="group-detail__setting-item">
            <span className="label">모임 이름</span>
            <span className="value">{currentGroup.name}</span>
          </div>
          {currentGroup.description && (
            <div className="group-detail__setting-item">
              <span className="label">설명</span>
              <span className="value">{currentGroup.description}</span>
            </div>
          )}
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
        </>
      )}

      {/* 학원 타입 기능 설정 표시 */}
      {currentGroup.type === 'education' && isAdmin && (
        <>
          <div className="group-detail__setting-divider" />
          <h4 className="group-detail__setting-subtitle">수업 방식</h4>
          <div className="group-detail__feature-toggles">
            <div className="group-detail__feature-toggle-item group-detail__feature-toggle-item--readonly">
              <div className="toggle-info">
                <span className="label">{currentGroup.hasClasses ? '그룹 수업' : '1:1 수업'}</span>
                <span className="desc">{currentGroup.hasClasses ? '반을 만들어 그룹으로 수업합니다' : '개별 학생마다 수업 시간을 배정합니다'}</span>
              </div>
              <span className="readonly-badge">변경 불가</span>
            </div>
          </div>

          <div className="group-detail__setting-divider" />
          <h4 className="group-detail__setting-subtitle">기능 설정</h4>
          <div className="group-detail__feature-toggles">
            <div className="group-detail__feature-toggle-item">
              <div className="toggle-info">
                <span className="label">출석 체크</span>
                <span className="desc">QR 코드로 출석을 관리합니다</span>
              </div>
              <button
                type="button"
                className={`group-detail__toggle-switch ${currentGroup.hasAttendance ? 'on' : ''}`}
                onClick={() => onFeatureToggle?.('hasAttendance', !currentGroup.hasAttendance)}
              >
                <div className="group-detail__toggle-switch-handle" />
              </button>
            </div>

            {!currentGroup.hasClasses && (
              <div className="group-detail__feature-toggle-item">
                <div className="toggle-info">
                  <span className="label">다중 강사 모드</span>
                  <span className="desc">여러 강사가 각자의 학생을 관리합니다</span>
                </div>
                <button
                  type="button"
                  className={`group-detail__toggle-switch ${currentGroup.hasMultipleInstructors ? 'on' : ''}`}
                  onClick={() => onFeatureToggle?.('hasMultipleInstructors', !currentGroup.hasMultipleInstructors)}
                >
                  <div className="group-detail__toggle-switch-handle" />
                </button>
              </div>
            )}

            <div className="group-detail__feature-toggle-item">
              <div className="toggle-info">
                <span className="label">학부모 가입 허용</span>
                <span className="desc">보호자가 학생의 수업 현황을 확인할 수 있습니다</span>
              </div>
              <button
                type="button"
                className={`group-detail__toggle-switch ${currentGroup.allowGuardians ? 'on' : ''}`}
                onClick={() => onFeatureToggle?.('allowGuardians', !currentGroup.allowGuardians)}
              >
                <div className="group-detail__toggle-switch-handle" />
              </button>
            </div>

            <div className="group-detail__feature-toggle-item">
              <div className="toggle-info">
                <span className="label">가입 승인 필요</span>
                <span className="desc">새 멤버 가입 시 관리자 승인이 필요합니다</span>
              </div>
              <button
                type="button"
                className={`group-detail__toggle-switch ${currentGroup.requiresApproval ? 'on' : ''}`}
                onClick={() => onFeatureToggle?.('requiresApproval', !currentGroup.requiresApproval)}
              >
                <div className="group-detail__toggle-switch-handle" />
              </button>
            </div>

            <div className="group-detail__feature-toggle-item">
              <div className="toggle-info">
                <span className="label">연습실 운영</span>
                <span className="desc">학생들이 연습실을 예약하고 사용할 수 있습니다</span>
              </div>
              <button
                type="button"
                className={`group-detail__toggle-switch ${currentGroup.hasPracticeRooms ? 'on' : ''}`}
                onClick={() => onFeatureToggle?.('hasPracticeRooms', !currentGroup.hasPracticeRooms)}
              >
                <div className="group-detail__toggle-switch-handle" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// 연습실 설정 인터페이스
interface PracticeRoomSettings {
  openTime: string;
  closeTime: string;
  slotMinutes: 30 | 60;
  maxHoursPerDay: number;
}

// 연습실 관리 섹션
interface PracticeRoomSectionProps {
  practiceRooms: PracticeRoom[];
  practiceRoomsLoading: boolean;
  practiceRoomSettings: PracticeRoomSettings;
  practiceRoomSettingsChanged: boolean;
  practiceRoomSaving: boolean;
  newPracticeRoomName: string;
  setNewPracticeRoomName: (name: string) => void;
  newPracticeRoomCapacity: number;
  setNewPracticeRoomCapacity: (fn: (c: number) => number) => void;
  onSettingChange: <K extends keyof PracticeRoomSettings>(key: K, value: PracticeRoomSettings[K]) => void;
  onSaveSettings: () => void;
  onAddRoom: () => void;
  onUpdateCapacity: (roomId: string, capacity: number) => void;
  onDeleteRoom: (room: PracticeRoom) => void;
  onShowQRCode?: (room: PracticeRoom) => void;
}

export const PracticeRoomSection = ({
  practiceRooms,
  practiceRoomsLoading,
  practiceRoomSettings,
  practiceRoomSettingsChanged,
  practiceRoomSaving,
  newPracticeRoomName,
  setNewPracticeRoomName,
  newPracticeRoomCapacity,
  setNewPracticeRoomCapacity,
  onSettingChange,
  onSaveSettings,
  onAddRoom,
  onUpdateCapacity,
  onDeleteRoom,
  onShowQRCode,
}: PracticeRoomSectionProps) => (
  <div className="group-detail__setting-section">
    <div className="group-detail__setting-header">
      <h3>연습실 관리</h3>
      {practiceRoomSettingsChanged && (
        <button
          className="group-detail__setting-save-btn"
          disabled={practiceRoomSaving}
          onClick={onSaveSettings}
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
          onChange={(e) => onSettingChange('openTime', e.target.value)}
        />
        <span>~</span>
        <input
          type="time"
          value={practiceRoomSettings.closeTime}
          onChange={(e) => onSettingChange('closeTime', e.target.value)}
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
          onClick={() => onSettingChange('slotMinutes', 30)}
        >
          30분
        </button>
        <button
          type="button"
          className={`group-detail__toggle-btn ${practiceRoomSettings.slotMinutes === 60 ? 'active' : ''}`}
          onClick={() => onSettingChange('slotMinutes', 60)}
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
          onClick={() => onSettingChange('maxHoursPerDay', Math.max(1, practiceRoomSettings.maxHoursPerDay - 1))}
        >
          -
        </button>
        <span>{practiceRoomSettings.maxHoursPerDay}시간</span>
        <button
          type="button"
          onClick={() => onSettingChange('maxHoursPerDay', Math.min(8, practiceRoomSettings.maxHoursPerDay + 1))}
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
              onAddRoom();
            }
          }}
        />
        <div className="group-detail__practice-room-capacity-input">
          <span>수용</span>
          <button type="button" onClick={() => setNewPracticeRoomCapacity((c) => Math.max(1, c - 1))}>-</button>
          <span>{newPracticeRoomCapacity}명</span>
          <button type="button" onClick={() => setNewPracticeRoomCapacity((c) => Math.min(50, c + 1))}>+</button>
        </div>
        <button type="button" onClick={onAddRoom} disabled={!newPracticeRoomName.trim()}>
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
            <PracticeRoomItem
              key={room.id}
              room={room}
              onUpdateCapacity={onUpdateCapacity}
              onDelete={onDeleteRoom}
              onShowQRCode={onShowQRCode}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

// 연습실 아이템
interface PracticeRoomItemProps {
  room: PracticeRoom;
  onUpdateCapacity: (roomId: string, capacity: number) => void;
  onDelete: (room: PracticeRoom) => void;
  onShowQRCode?: (room: PracticeRoom) => void;
}

const PracticeRoomItem = ({ room, onUpdateCapacity, onDelete, onShowQRCode }: PracticeRoomItemProps) => (
  <div className="group-detail__practice-room-item">
    <span className="group-detail__practice-room-name">{room.name}</span>
    <div className="group-detail__practice-room-capacity">
      <button
        type="button"
        onClick={() => onUpdateCapacity(room.id, Math.max(1, room.capacity - 1))}
      >
        -
      </button>
      <span>{room.capacity}명</span>
      <button
        type="button"
        onClick={() => onUpdateCapacity(room.id, Math.min(50, room.capacity + 1))}
      >
        +
      </button>
    </div>
    <div className="group-detail__practice-room-actions">
      {onShowQRCode && (
        <button
          className="group-detail__practice-room-qr"
          onClick={() => onShowQRCode(room)}
          title="QR 코드 생성"
        >
          <QRIcon />
        </button>
      )}
      <button
        className="group-detail__practice-room-delete"
        onClick={() => onDelete(room)}
        title="삭제"
      >
        <TrashIcon />
      </button>
    </div>
  </div>
);

// 수업실 관리 섹션 (1:1 수업용)
interface LessonRoomSectionProps {
  lessonRooms: LessonRoom[];
  lessonRoomsLoading: boolean;
  newLessonRoomName: string;
  setNewLessonRoomName: (name: string) => void;
  newLessonRoomCapacity: number;
  setNewLessonRoomCapacity: (fn: (c: number) => number) => void;
  onAddRoom: () => void;
  onUpdateCapacity: (roomId: string, capacity: number) => void;
  onDeleteRoom: (room: LessonRoom) => void;
}

export const LessonRoomSection = ({
  lessonRooms,
  lessonRoomsLoading,
  newLessonRoomName,
  setNewLessonRoomName,
  newLessonRoomCapacity,
  setNewLessonRoomCapacity,
  onAddRoom,
  onUpdateCapacity,
  onDeleteRoom,
}: LessonRoomSectionProps) => (
  <div className="group-detail__setting-section">
    <div className="group-detail__setting-header">
      <h3>수업실 관리</h3>
    </div>
    <p className="group-detail__setting-hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
      1:1 수업이 진행되는 수업실을 등록하세요. 학생 수업 배정 시 수업실을 선택할 수 있습니다.
    </p>

    {/* 수업실 추가 */}
    <div className="group-detail__practice-room-add">
      <input
        type="text"
        placeholder="수업실 이름 (예: A실, 1번 수업실)"
        value={newLessonRoomName}
        onChange={(e) => setNewLessonRoomName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            onAddRoom();
          }
        }}
      />
      <div className="group-detail__practice-room-capacity-input">
        <span>수용</span>
        <button type="button" onClick={() => setNewLessonRoomCapacity((c) => Math.max(1, c - 1))}>-</button>
        <span>{newLessonRoomCapacity}명</span>
        <button type="button" onClick={() => setNewLessonRoomCapacity((c) => c + 1)}>+</button>
      </div>
      <button type="button" onClick={onAddRoom} disabled={!newLessonRoomName.trim()}>
        추가
      </button>
    </div>

    {/* 수업실 목록 */}
    {lessonRoomsLoading ? (
      <p className="group-detail__setting-hint">불러오는 중...</p>
    ) : lessonRooms.length === 0 ? (
      <p className="group-detail__setting-empty">등록된 수업실이 없습니다</p>
    ) : (
      <div className="group-detail__practice-room-items">
        {lessonRooms.map((room) => (
          <LessonRoomItem
            key={room.id}
            room={room}
            onUpdateCapacity={onUpdateCapacity}
            onDelete={onDeleteRoom}
          />
        ))}
      </div>
    )}
  </div>
);

// 수업실 아이템
interface LessonRoomItemProps {
  room: LessonRoom;
  onUpdateCapacity: (roomId: string, capacity: number) => void;
  onDelete: (room: LessonRoom) => void;
}

const LessonRoomItem = ({ room, onUpdateCapacity, onDelete }: LessonRoomItemProps) => (
  <div className="group-detail__practice-room-item">
    <span className="group-detail__practice-room-name">{room.name}</span>
    <div className="group-detail__practice-room-capacity">
      <button
        type="button"
        onClick={() => onUpdateCapacity(room.id, Math.max(1, room.capacity - 1))}
      >
        -
      </button>
      <span>{room.capacity}명</span>
      <button
        type="button"
        onClick={() => onUpdateCapacity(room.id, room.capacity + 1)}
      >
        +
      </button>
    </div>
    <button
      className="group-detail__practice-room-delete"
      onClick={() => onDelete(room)}
      title="삭제"
    >
      <TrashIcon />
    </button>
  </div>
);

// 학원 운영시간 설정 섹션
interface OperatingHoursSectionProps {
  operatingHours: OperatingHours;
  operatingHoursChanged: boolean;
  operatingHoursSaving: boolean;
  onSettingChange: <K extends keyof OperatingHours>(key: K, value: OperatingHours[K]) => void;
  onSaveSettings: () => void;
}

export const OperatingHoursSection = ({
  operatingHours,
  operatingHoursChanged,
  operatingHoursSaving,
  onSettingChange,
  onSaveSettings,
}: OperatingHoursSectionProps) => {
  const toggleClosedDay = (day: number) => {
    const currentClosedDays = operatingHours.closedDays || [];
    if (currentClosedDays.includes(day)) {
      onSettingChange('closedDays', currentClosedDays.filter(d => d !== day));
    } else {
      onSettingChange('closedDays', [...currentClosedDays, day].sort());
    }
  };

  return (
    <div className="group-detail__setting-section">
      <div className="group-detail__setting-header">
        <h3>학원 운영시간</h3>
        {operatingHoursChanged && (
          <button
            className="group-detail__setting-save-btn"
            disabled={operatingHoursSaving}
            onClick={onSaveSettings}
          >
            {operatingHoursSaving ? '저장 중...' : '저장'}
          </button>
        )}
      </div>

      {/* 운영 시간 */}
      <div className="group-detail__setting-item">
        <span className="label">운영 시간</span>
        <div className="group-detail__practice-room-time">
          <input
            type="time"
            value={operatingHours.openTime || '09:00'}
            onChange={(e) => onSettingChange('openTime', e.target.value)}
          />
          <span>~</span>
          <input
            type="time"
            value={operatingHours.closeTime || '22:00'}
            onChange={(e) => onSettingChange('closeTime', e.target.value)}
          />
        </div>
      </div>

      {/* 휴무일 */}
      <div className="group-detail__setting-item">
        <span className="label">휴무일</span>
        <div className="group-detail__closed-days">
          {DAYS_OF_WEEK.map((day, index) => (
            <button
              key={index}
              type="button"
              className={`group-detail__day-btn ${operatingHours.closedDays?.includes(index) ? 'active' : ''}`}
              onClick={() => toggleClosedDay(index)}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// 모임 장소 섹션
interface LocationSectionProps {
  favoriteLocations: FavoriteLocation[];
  onOpenModal: (location?: FavoriteLocation) => void;
  onDelete: (location: FavoriteLocation) => void;
}

export const LocationSection = ({ favoriteLocations, onOpenModal, onDelete }: LocationSectionProps) => (
  <div className="group-detail__setting-section">
    <div className="group-detail__setting-header">
      <h3>모임 장소</h3>
      <button className="group-detail__setting-add-btn" onClick={() => onOpenModal()}>
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
                onClick={() => onOpenModal(location)}
                title="수정"
              >
                <EditIcon />
              </button>
              <button
                className="group-detail__location-btn group-detail__location-btn--danger"
                onClick={() => onDelete(location)}
                title="삭제"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// 모임 삭제 섹션 (운영자용)
interface DangerSectionProps {
  memberCount: number;
  onShowDeleteModal: () => void;
}

export const DangerSection = ({ memberCount, onShowDeleteModal }: DangerSectionProps) => (
  <div className="group-detail__setting-section group-detail__setting-section--danger">
    <h3>모임 삭제</h3>
    {memberCount === 1 ? (
      <button className="group-detail__danger-btn" onClick={onShowDeleteModal}>
        모임 삭제
      </button>
    ) : (
      <p className="group-detail__warning">
        운영자는 모임을 나갈 수 없습니다. 다른 멤버에게 운영자 권한을 넘긴 후 나가세요.
      </p>
    )}
  </div>
);

// 모임 나가기 섹션 (일반 멤버용)
interface LeaveSectionProps {
  onShowLeaveModal: () => void;
}

export const LeaveSection = ({ onShowLeaveModal }: LeaveSectionProps) => (
  <div className="group-detail__setting-section">
    <h3>모임 나가기</h3>
    <p className="group-detail__leave-desc">
      모임을 나가면 더 이상 이 모임의 공지사항, 일정 등을 확인할 수 없습니다.
    </p>
    <button className="group-detail__leave-btn" onClick={onShowLeaveModal}>
      모임 나가기
    </button>
  </div>
);

// 아이콘 컴포넌트들
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

