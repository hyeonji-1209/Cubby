import { IconPicker } from '@/components';
import {
  GROUP_TYPE_LABELS,
  GROUP_TYPE_COLORS,
  GROUP_TYPE_FEATURES,
} from '@/constants/labels';
import { bookIcon, churchIcon, targetIcon, briefcaseIcon, heartIcon } from '@/assets';
import { useGroupCreateForm } from './hooks';
import { AcademySettings, PositionSettings } from './components';
import type { GroupType } from '@/types';
import './GroupPages.scss';

// 타입별 아이콘 매핑
const GROUP_TYPE_ICON_IMAGES: Record<GroupType, string> = {
  education: bookIcon,
  religious: churchIcon,
  community: targetIcon,
  company: briefcaseIcon,
  couple: heartIcon,
};

const GROUP_TYPES: GroupType[] = ['education', 'religious', 'community', 'company', 'couple'];

const GroupCreatePage = () => {
  const {
    formState,
    updateField,
    handleTypeSelect,
    handleReset,
    handleSubmit,
    canSubmit,
    isLoading,
    positionList,
    rankList,
    practiceRoomList,
  } = useGroupCreateForm();

  const { type, name, description, icon, color, logoImage, coupleRole, anniversaryDate, myBirthday } = formState;

  return (
    <div className="group-create">
      <div className="group-create__header">
        <div className="group-create__header-left">
          <h1 className="group-create__title">새 모임 만들기</h1>
          <p className="group-create__subtitle">함께할 사람들과 새로운 모임을 시작하세요</p>
        </div>
        <div className="group-create__actions">
          <button type="button" className="group-create__cancel" onClick={handleReset}>
            초기화
          </button>
          <button
            type="button"
            className="group-create__submit"
            disabled={!canSubmit()}
            onClick={handleSubmit}
          >
            {isLoading ? '생성 중...' : '만들기'}
          </button>
        </div>
      </div>

      <div className="group-create__form">
        <div className="group-create__body">
          {/* 왼쪽: 타입 선택 */}
          <div className="group-create__left">
            <label className="group-create__label">모임 타입</label>
            <div className="group-create__types">
              {GROUP_TYPES.map((gt) => (
                <label
                  key={gt}
                  className={`group-create__type ${type === gt ? 'group-create__type--selected' : ''}`}
                  style={{ '--type-color': GROUP_TYPE_COLORS[gt] } as React.CSSProperties}
                >
                  <input
                    type="radio"
                    name="type"
                    value={gt}
                    checked={type === gt}
                    onChange={() => handleTypeSelect(gt)}
                  />
                  <div className="group-create__type-icon">
                    <img src={GROUP_TYPE_ICON_IMAGES[gt]} alt="" />
                  </div>
                  <span className="group-create__type-label">{GROUP_TYPE_LABELS[gt]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 오른쪽: 설정 폼 */}
          <div className="group-create__right">
            {/* 타입 미선택 시 안내 */}
            {!type && (
              <div className="group-create__features group-create__features--all">
                <p className="group-create__features-guide">모임 타입을 클릭해 모임 생성을 진행해주세요!</p>
                <div className="group-create__features-all">
                  {GROUP_TYPES.map((gt) => (
                    <div key={gt} className="group-create__features-group">
                      <div className="group-create__features-group-header">
                        <span className="group-create__features-group-icon" style={{ background: GROUP_TYPE_COLORS[gt] }}>
                          <img src={GROUP_TYPE_ICON_IMAGES[gt]} alt="" />
                        </span>
                        <span className="group-create__features-group-label">{GROUP_TYPE_LABELS[gt]}</span>
                      </div>
                      <div className="group-create__features-group-list">
                        {GROUP_TYPE_FEATURES[gt].map((feature) => (
                          <span key={feature} className="group-create__feature-tag">{feature}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 타입 선택 후 폼 */}
            {type && (
              <>
                {/* 아이콘 + 모임 이름 */}
                <div className="group-create__row">
                  <div className="group-create__icon-field">
                    <IconPicker
                      icon={icon}
                      color={color}
                      image={logoImage}
                      onIconChange={(v) => updateField('icon', v)}
                      onColorChange={(v) => updateField('color', v)}
                      onImageChange={(v) => updateField('logoImage', v)}
                    />
                  </div>
                  <div className="group-create__field group-create__field--grow">
                    <input
                      type="text"
                      className="group-create__input group-create__input--large"
                      value={name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder={`${GROUP_TYPE_LABELS[type]} 이름을 입력하세요`}
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* 학원 타입 전용 설정 */}
                {type === 'education' && (
                  <AcademySettings
                    formState={formState}
                    updateField={updateField}
                    practiceRoomList={practiceRoomList}
                  />
                )}

                {/* 직책/직분 설정 (커플 제외) */}
                {type !== 'couple' && (
                  <PositionSettings
                    type={type}
                    formState={formState}
                    updateField={updateField}
                    positionList={positionList}
                    rankList={rankList}
                  />
                )}

                {/* 설명 */}
                <div className="group-create__field">
                  <label className="group-create__label">
                    설명 <span className="group-create__optional">(선택)</span>
                  </label>
                  <textarea
                    className="group-create__textarea"
                    value={description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="모임에 대한 간단한 설명"
                    rows={2}
                    maxLength={200}
                  />
                </div>

                {/* 커플 타입 전용 */}
                {type === 'couple' && (
                  <div className="group-create__couple-fields">
                    <div className="group-create__couple-role">
                      <span className="group-create__couple-role-label">나는</span>
                      <div className="group-create__couple-toggle">
                        <button
                          type="button"
                          className={`group-create__couple-btn ${coupleRole === 'boyfriend' ? 'group-create__couple-btn--active' : ''}`}
                          onClick={() => updateField('coupleRole', 'boyfriend')}
                        >
                          남자친구
                        </button>
                        <button
                          type="button"
                          className={`group-create__couple-btn ${coupleRole === 'girlfriend' ? 'group-create__couple-btn--active' : ''}`}
                          onClick={() => updateField('coupleRole', 'girlfriend')}
                        >
                          여자친구
                        </button>
                      </div>
                    </div>
                    <div className="group-create__couple-dates">
                      <div className="group-create__couple-date">
                        <label className="group-create__couple-date-label">사귄 날짜</label>
                        <input
                          type="date"
                          className="group-create__couple-date-input"
                          value={anniversaryDate}
                          onChange={(e) => updateField('anniversaryDate', e.target.value)}
                        />
                      </div>
                      <div className="group-create__couple-date">
                        <label className="group-create__couple-date-label">내 생일</label>
                        <input
                          type="date"
                          className="group-create__couple-date-input"
                          value={myBirthday}
                          onChange={(e) => updateField('myBirthday', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCreatePage;
