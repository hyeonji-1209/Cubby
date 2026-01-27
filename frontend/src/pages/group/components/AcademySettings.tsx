import type { GroupCreateFormState } from '../hooks/useGroupCreateForm';
import type { ListManager } from '@/hooks/useListManager';

interface AcademySettingsProps {
  formState: GroupCreateFormState;
  updateField: <K extends keyof GroupCreateFormState>(field: K, value: GroupCreateFormState[K]) => void;
  practiceRoomList: ListManager<string>;
}

const AcademySettings: React.FC<AcademySettingsProps> = ({
  formState,
  updateField,
  practiceRoomList,
}) => {
  const {
    hasClasses,
    hasPracticeRooms,
    allowGuardians,
    practiceRoomOpenTime,
    practiceRoomCloseTime,
    practiceRoomSlotMinutes,
    practiceRoomMaxHours,
  } = formState;

  return (
    <div className="group-create__academy-settings">
      <div className="group-create__academy-header">
        <span className="group-create__academy-header-icon">⚙️</span>
        <span className="group-create__academy-header-text">학원 운영 설정</span>
      </div>

      {/* 수업 방식 */}
      <div className="group-create__academy-card">
        <div className="group-create__academy-card-question">수업 방식이 어떻게 되나요?</div>
        <div className="group-create__academy-card-options">
          <button
            type="button"
            className={`group-create__academy-card-btn ${hasClasses ? 'group-create__academy-card-btn--active' : ''}`}
            onClick={() => updateField('hasClasses', true)}
          >
            <span className="group-create__academy-card-btn-icon">👥</span>
            <span className="group-create__academy-card-btn-label">반(그룹) 수업</span>
            <span className="group-create__academy-card-btn-desc">초급반, 중급반 등</span>
          </button>
          <button
            type="button"
            className={`group-create__academy-card-btn ${!hasClasses ? 'group-create__academy-card-btn--active' : ''}`}
            onClick={() => updateField('hasClasses', false)}
          >
            <span className="group-create__academy-card-btn-icon">👤</span>
            <span className="group-create__academy-card-btn-label">개인 수업</span>
            <span className="group-create__academy-card-btn-desc">1:1 레슨</span>
          </button>
        </div>
      </div>

      {/* 연습실/공부방 */}
      <div className="group-create__academy-card">
        <div className="group-create__academy-card-question">연습실/공부방이 있나요?</div>
        <div className="group-create__academy-card-toggle">
          <button
            type="button"
            className={`group-create__academy-toggle-btn ${hasPracticeRooms ? 'group-create__academy-toggle-btn--active' : ''}`}
            onClick={() => updateField('hasPracticeRooms', true)}
          >
            있어요
          </button>
          <button
            type="button"
            className={`group-create__academy-toggle-btn ${!hasPracticeRooms ? 'group-create__academy-toggle-btn--active' : ''}`}
            onClick={() => updateField('hasPracticeRooms', false)}
          >
            없어요
          </button>
        </div>
        {hasPracticeRooms && (
          <div className="group-create__academy-card-note">
            → 학생들이 연습실을 예약할 수 있어요
          </div>
        )}
      </div>

      {/* 연습실 설정 */}
      {hasPracticeRooms && (
        <div className="group-create__practice-room-settings">
          <div className="group-create__practice-room-settings-header">
            <span className="group-create__practice-room-settings-header-icon">🚪</span>
            <span className="group-create__practice-room-settings-header-text">연습실 관리</span>
          </div>

          {/* 연습실 목록 */}
          <div className="group-create__practice-room-card">
            <div className="group-create__practice-room-card-question">연습실 만들기</div>
            <input
              type="text"
              className="group-create__input"
              placeholder="연습실 이름 입력 후 Enter (예: A실, B실, 1번방)"
              maxLength={30}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (value && practiceRoomList.canAdd) {
                    const emptyIndex = practiceRoomList.items.findIndex((item: string) => !item.trim());
                    if (emptyIndex !== -1) {
                      practiceRoomList.update(emptyIndex, value);
                    } else {
                      practiceRoomList.add(value);
                    }
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            {practiceRoomList.items.some((r: string) => r.trim()) && (
              <div className="group-create__positions-tags">
                {practiceRoomList.items.map((room: string, index: number) => (
                  room.trim() && (
                    <span key={index} className="group-create__positions-tag">
                      {room}
                      <button
                        type="button"
                        className="group-create__positions-tag-remove"
                        onClick={() => practiceRoomList.remove(index)}
                      >
                        ×
                      </button>
                    </span>
                  )
                ))}
              </div>
            )}
          </div>

          {/* 운영 시간 */}
          <div className="group-create__practice-room-card">
            <div className="group-create__practice-room-card-question">운영 시간</div>
            <div className="group-create__practice-room-time-row">
              <input
                type="time"
                className="group-create__input group-create__input--time"
                value={practiceRoomOpenTime}
                onChange={(e) => updateField('practiceRoomOpenTime', e.target.value)}
              />
              <span className="group-create__practice-room-time-separator">~</span>
              <input
                type="time"
                className="group-create__input group-create__input--time"
                value={practiceRoomCloseTime}
                onChange={(e) => updateField('practiceRoomCloseTime', e.target.value)}
              />
            </div>
          </div>

          {/* 예약 단위 */}
          <div className="group-create__practice-room-card">
            <div className="group-create__practice-room-card-question">예약 단위</div>
            <div className="group-create__academy-card-toggle">
              <button
                type="button"
                className={`group-create__academy-toggle-btn ${practiceRoomSlotMinutes === 30 ? 'group-create__academy-toggle-btn--active' : ''}`}
                onClick={() => updateField('practiceRoomSlotMinutes', 30)}
              >
                30분
              </button>
              <button
                type="button"
                className={`group-create__academy-toggle-btn ${practiceRoomSlotMinutes === 60 ? 'group-create__academy-toggle-btn--active' : ''}`}
                onClick={() => updateField('practiceRoomSlotMinutes', 60)}
              >
                1시간
              </button>
            </div>
          </div>

          {/* 1일 최대 예약 */}
          <div className="group-create__practice-room-card">
            <div className="group-create__practice-room-card-question">1인 1일 최대 예약</div>
            <div className="group-create__practice-room-max-hours">
              <button
                type="button"
                className="group-create__practice-room-max-btn"
                onClick={() => updateField('practiceRoomMaxHours', Math.max(1, practiceRoomMaxHours - 1))}
              >
                -
              </button>
              <span className="group-create__practice-room-max-value">{practiceRoomMaxHours}시간</span>
              <button
                type="button"
                className="group-create__practice-room-max-btn"
                onClick={() => updateField('practiceRoomMaxHours', Math.min(8, practiceRoomMaxHours + 1))}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 보호자 허용 */}
      <div className="group-create__academy-card">
        <div className="group-create__academy-card-question">학부모(보호자)도 가입할 수 있게 할까요?</div>
        <div className="group-create__academy-card-toggle">
          <button
            type="button"
            className={`group-create__academy-toggle-btn ${allowGuardians ? 'group-create__academy-toggle-btn--active' : ''}`}
            onClick={() => updateField('allowGuardians', true)}
          >
            네
          </button>
          <button
            type="button"
            className={`group-create__academy-toggle-btn ${!allowGuardians ? 'group-create__academy-toggle-btn--active' : ''}`}
            onClick={() => updateField('allowGuardians', false)}
          >
            학생만
          </button>
        </div>
        {allowGuardians && (
          <div className="group-create__academy-card-note">
            → 보호자는 자녀의 일정/공지를 확인할 수 있어요
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademySettings;
