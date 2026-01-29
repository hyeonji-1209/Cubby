import { IconPicker } from '@/components';
import {
  GROUP_TYPE_LABELS,
  GROUP_TYPE_COLORS,
  GROUP_TYPE_FEATURES,
} from '@/constants/labels';
import { bookIcon, churchIcon, targetIcon, briefcaseIcon, heartIcon } from '@/assets';
import { useGroupCreateForm, EDUCATION_STEPS } from './hooks';
import { PositionSettings } from './components';
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
    // 교육 타입 단계 관리
    educationStep,
    canGoNextStep,
    goNextStep,
    goPrevStep,
  } = useGroupCreateForm();

  const { type, name, description, icon, color, logoImage, coupleRole, anniversaryDate, myBirthday } = formState;

  // 교육 타입 슬라이드 UI
  const renderEducationSlide = () => {
    switch (educationStep) {
      case 1: // 기본 정보
        return (
          <div className="group-create__slide">
            <h2 className="group-create__slide-title">학원 정보를 입력해주세요</h2>
            <p className="group-create__slide-desc">학원의 이름과 아이콘을 설정합니다</p>

            <div className="group-create__slide-content">
              <div className="group-create__row group-create__row--center">
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
                    placeholder="학원 이름을 입력하세요"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="group-create__field">
                <label className="group-create__label">
                  설명 <span className="group-create__optional">(선택)</span>
                </label>
                <textarea
                  className="group-create__textarea"
                  value={description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="학원에 대한 간단한 설명"
                  rows={2}
                  maxLength={200}
                />
              </div>
            </div>
          </div>
        );

      case 2: // 수업 방식 + 출석 체크
        return (
          <div className="group-create__slide">
            <h2 className="group-create__slide-title">수업 방식을 선택해주세요</h2>
            <p className="group-create__slide-desc">학원의 수업 운영 방식을 설정합니다</p>

            <div className="group-create__slide-content">
              <div className="group-create__option-cards">
                <label
                  className={`group-create__option-card ${!formState.hasClasses ? 'group-create__option-card--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="classMode"
                    checked={!formState.hasClasses}
                    onChange={() => updateField('hasClasses', false)}
                  />
                  <div className="group-create__option-card-content">
                    <span className="group-create__option-card-icon">1:1</span>
                    <span className="group-create__option-card-title">1:1 수업</span>
                    <span className="group-create__option-card-desc">
                      개별 학생마다 수업 시간을 배정합니다
                    </span>
                  </div>
                </label>

                <label
                  className={`group-create__option-card ${formState.hasClasses ? 'group-create__option-card--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="classMode"
                    checked={formState.hasClasses}
                    onChange={() => updateField('hasClasses', true)}
                  />
                  <div className="group-create__option-card-content">
                    <span className="group-create__option-card-icon">GR</span>
                    <span className="group-create__option-card-title">그룹 수업</span>
                    <span className="group-create__option-card-desc">
                      반을 만들어 그룹으로 수업합니다
                    </span>
                  </div>
                </label>
              </div>

              <div className="group-create__toggle-row">
                <div className="group-create__toggle-info">
                  <span className="group-create__toggle-label">출석 체크 기능</span>
                  <span className="group-create__toggle-desc">QR 코드로 출석을 관리합니다</span>
                </div>
                <label className="group-create__toggle">
                  <input
                    type="checkbox"
                    checked={formState.hasAttendance}
                    onChange={(e) => updateField('hasAttendance', e.target.checked)}
                  />
                  <span className="group-create__toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        );

      case 3: // 다중 강사 + 학부모 가입
        return (
          <div className="group-create__slide">
            <h2 className="group-create__slide-title">추가 설정</h2>
            <p className="group-create__slide-desc">강사 및 학부모 관련 설정입니다</p>

            <div className="group-create__slide-content">
              {!formState.hasClasses && (
                <div className="group-create__toggle-row">
                  <div className="group-create__toggle-info">
                    <span className="group-create__toggle-label">다중 강사 모드</span>
                    <span className="group-create__toggle-desc">
                      여러 강사가 각자의 학생을 관리합니다
                    </span>
                  </div>
                  <label className="group-create__toggle">
                    <input
                      type="checkbox"
                      checked={formState.hasMultipleInstructors}
                      onChange={(e) => updateField('hasMultipleInstructors', e.target.checked)}
                    />
                    <span className="group-create__toggle-slider" />
                  </label>
                </div>
              )}

              <div className="group-create__toggle-row">
                <div className="group-create__toggle-info">
                  <span className="group-create__toggle-label">학부모 가입 허용</span>
                  <span className="group-create__toggle-desc">
                    보호자가 학생의 수업 현황을 확인할 수 있습니다
                  </span>
                </div>
                <label className="group-create__toggle">
                  <input
                    type="checkbox"
                    checked={formState.allowGuardians}
                    onChange={(e) => updateField('allowGuardians', e.target.checked)}
                  />
                  <span className="group-create__toggle-slider" />
                </label>
              </div>

              {!formState.hasMultipleInstructors && !formState.hasClasses && (
                <div className="group-create__info-box">
                  <p>다중 강사 모드가 꺼져 있으면, 운영자가 모든 학생의 강사가 됩니다.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 4: // 연습실 설정
        return (
          <div className="group-create__slide">
            <h2 className="group-create__slide-title">연습실 설정</h2>
            <p className="group-create__slide-desc">학생들이 연습실을 예약할 수 있습니다</p>

            <div className="group-create__slide-content">
              <div className="group-create__toggle-row">
                <div className="group-create__toggle-info">
                  <span className="group-create__toggle-label">연습실 운영</span>
                  <span className="group-create__toggle-desc">
                    학생들이 연습실을 예약하고 사용할 수 있습니다
                  </span>
                </div>
                <label className="group-create__toggle">
                  <input
                    type="checkbox"
                    checked={formState.hasPracticeRooms}
                    onChange={(e) => updateField('hasPracticeRooms', e.target.checked)}
                  />
                  <span className="group-create__toggle-slider" />
                </label>
              </div>

              {formState.hasPracticeRooms && (
                <div className="group-create__practice-settings">
                  <div className="group-create__time-row">
                    <div className="group-create__time-field">
                      <label>운영 시작</label>
                      <input
                        type="time"
                        value={formState.practiceRoomOpenTime}
                        onChange={(e) => updateField('practiceRoomOpenTime', e.target.value)}
                      />
                    </div>
                    <span className="group-create__time-separator">~</span>
                    <div className="group-create__time-field">
                      <label>운영 종료</label>
                      <input
                        type="time"
                        value={formState.practiceRoomCloseTime}
                        onChange={(e) => updateField('practiceRoomCloseTime', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="group-create__field">
                    <label className="group-create__label">예약 단위</label>
                    <div className="group-create__radio-group">
                      <label className="group-create__radio">
                        <input
                          type="radio"
                          checked={formState.practiceRoomSlotMinutes === 30}
                          onChange={() => updateField('practiceRoomSlotMinutes', 30)}
                        />
                        <span>30분</span>
                      </label>
                      <label className="group-create__radio">
                        <input
                          type="radio"
                          checked={formState.practiceRoomSlotMinutes === 60}
                          onChange={() => updateField('practiceRoomSlotMinutes', 60)}
                        />
                        <span>1시간</span>
                      </label>
                    </div>
                  </div>

                  <div className="group-create__field">
                    <label className="group-create__label">
                      연습실 목록 <span className="group-create__optional">(나중에 추가 가능)</span>
                    </label>
                    <div className="group-create__list">
                      {practiceRoomList.items.map((room, index) => (
                        <div key={index} className="group-create__list-item">
                          <input
                            type="text"
                            className="group-create__input"
                            value={room}
                            onChange={(e) => practiceRoomList.update(index, e.target.value)}
                            placeholder={`연습실 ${index + 1}`}
                          />
                          {practiceRoomList.items.length > 1 && (
                            <button
                              type="button"
                              className="group-create__list-remove"
                              onClick={() => practiceRoomList.remove(index)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="group-create__list-add"
                        onClick={() => practiceRoomList.add('')}
                      >
                        + 연습실 추가
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 5: // 직책 설정
        return (
          <div className="group-create__slide">
            <h2 className="group-create__slide-title">직책 설정</h2>
            <p className="group-create__slide-desc">학원에서 사용할 직책을 설정합니다</p>

            <div className="group-create__slide-content">
              <PositionSettings
                type="education"
                formState={formState}
                updateField={updateField}
                positionList={positionList}
                rankList={rankList}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
          {/* 교육 타입이 아니거나 마지막 단계일 때만 만들기 버튼 표시 */}
          {(type !== 'education' || educationStep === 5) && type && (
            <button
              type="button"
              className="group-create__submit"
              disabled={!canSubmit()}
              onClick={handleSubmit}
            >
              {isLoading ? '생성 중...' : '만들기'}
            </button>
          )}
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

            {/* 교육 타입: 슬라이드 방식 */}
            {type === 'education' && (
              <>
                {/* 진행 표시 */}
                <div className="group-create__progress">
                  {([1, 2, 3, 4, 5] as const).map((step) => (
                    <div
                      key={step}
                      className={`group-create__progress-step ${
                        educationStep === step ? 'group-create__progress-step--active' : ''
                      } ${educationStep > step ? 'group-create__progress-step--done' : ''}`}
                    >
                      <span className="group-create__progress-number">{step}</span>
                      <span className="group-create__progress-label">{EDUCATION_STEPS[step]}</span>
                    </div>
                  ))}
                </div>

                {/* 슬라이드 콘텐츠 */}
                {renderEducationSlide()}

                {/* 네비게이션 버튼 */}
                <div className="group-create__nav">
                  <button
                    type="button"
                    className="group-create__nav-btn group-create__nav-btn--prev"
                    onClick={goPrevStep}
                    disabled={educationStep === 1}
                  >
                    이전
                  </button>
                  {educationStep < 5 ? (
                    <button
                      type="button"
                      className="group-create__nav-btn group-create__nav-btn--next"
                      onClick={goNextStep}
                      disabled={!canGoNextStep()}
                    >
                      다음
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="group-create__nav-btn group-create__nav-btn--submit"
                      onClick={handleSubmit}
                      disabled={!canSubmit() || isLoading}
                    >
                      {isLoading ? '생성 중...' : '완료'}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* 다른 타입: 기존 방식 유지 */}
            {type && type !== 'education' && (
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
