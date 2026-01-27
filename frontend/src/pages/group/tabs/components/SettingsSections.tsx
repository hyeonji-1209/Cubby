import { GROUP_TYPE_LABELS } from '@/constants/labels';
import type { Group, PracticeRoom } from '@/types';
import type { FavoriteLocation } from '@/api';

// 모임 정보 섹션
interface GroupInfoSectionProps {
  currentGroup: Group;
  isOwner: boolean;
}

export const GroupInfoSection = ({ currentGroup, isOwner }: GroupInfoSectionProps) => (
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
);

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
          <button type="button" onClick={() => setNewPracticeRoomCapacity((c) => Math.min(20, c + 1))}>+</button>
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
}

const PracticeRoomItem = ({ room, onUpdateCapacity, onDelete }: PracticeRoomItemProps) => (
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
        onClick={() => onUpdateCapacity(room.id, Math.min(20, room.capacity + 1))}
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
