import { IconPicker } from '@/components';
import {
  GROUP_TYPE_LABELS,
  GROUP_TYPE_COLORS,
  GROUP_TYPE_FEATURES,
} from '@/constants/labels';
import { bookIcon, churchIcon, targetIcon, briefcaseIcon, heartIcon } from '@/assets';
import { useGroupCreateForm, EDUCATION_STEPS, EDUCATION_POSITIONS } from './hooks';
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

// 타입별 설명
const GROUP_TYPE_DESCRIPTIONS: Record<GroupType, string> = {
  education: '학원, 레슨, 과외 등 교육 관련 모임',
  religious: '교회, 성당, 사찰 등 종교 모임',
  community: '동아리, 스터디, 취미 모임',
  company: '회사, 팀, 프로젝트 그룹',
  couple: '연인 간의 일정 및 기념일 관리',
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
    classRoomList,
    educationStep,
    canGoNextStep,
    goNextStep,
    goPrevStep,
  } = useGroupCreateForm();

  const { type, name, description, icon, color, logoImage, coupleRole, anniversaryDate, myBirthday } = formState;

  // 교육 타입 슬라이드 UI
  const renderEducationSlide = () => {
    switch (educationStep) {
      case 1:
        return (
          <div className="folder__step">
            <div className="folder__step-header">
              <span className="folder__step-num">1</span>
              <div className="folder__step-info">
                <h4>기본 정보</h4>
                <p>학원의 이름과 아이콘을 설정합니다</p>
              </div>
            </div>
            <div className="folder__step-content">
              <div className="folder__field-row">
                <IconPicker
                  icon={icon}
                  color={color}
                  image={logoImage}
                  onIconChange={(v) => updateField('icon', v)}
                  onColorChange={(v) => updateField('color', v)}
                  onImageChange={(v) => updateField('logoImage', v)}
                />
                <div className="folder__field folder__field--grow">
                  <label>학원 이름 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="학원 이름을 입력하세요"
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="folder__field">
                <label>설명 <span>(선택)</span></label>
                <textarea
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

      case 2:
        return (
          <div className="folder__step">
            <div className="folder__step-header">
              <span className="folder__step-num">2</span>
              <div className="folder__step-info">
                <h4>수업 방식</h4>
                <p>학원의 수업 운영 방식을 설정합니다</p>
              </div>
            </div>
            <div className="folder__step-content">
              <div className="folder__options">
                <label className={`folder__option ${!formState.hasClasses ? 'folder__option--active' : ''}`}>
                  <input
                    type="radio"
                    name="classMode"
                    checked={!formState.hasClasses}
                    onChange={() => updateField('hasClasses', false)}
                  />
                  <span className="folder__option-icon">1:1</span>
                  <div className="folder__option-text">
                    <strong>1:1 수업</strong>
                    <span>개별 학생마다 수업 시간을 배정</span>
                  </div>
                </label>
                <label className={`folder__option ${formState.hasClasses ? 'folder__option--active' : ''}`}>
                  <input
                    type="radio"
                    name="classMode"
                    checked={formState.hasClasses}
                    onChange={() => updateField('hasClasses', true)}
                  />
                  <span className="folder__option-icon">GR</span>
                  <div className="folder__option-text">
                    <strong>그룹 수업</strong>
                    <span>반을 만들어 그룹으로 수업</span>
                  </div>
                </label>
              </div>
              <div className="folder__toggle">
                <div className="folder__toggle-info">
                  <strong>출석 체크 기능</strong>
                  <span>QR 코드로 출석을 관리합니다</span>
                </div>
                <label className="folder__switch">
                  <input
                    type="checkbox"
                    checked={formState.hasAttendance}
                    onChange={(e) => updateField('hasAttendance', e.target.checked)}
                  />
                  <span />
                </label>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="folder__step">
            <div className="folder__step-header">
              <span className="folder__step-num">3</span>
              <div className="folder__step-info">
                <h4>추가 설정</h4>
                <p>강사 및 학부모 관련 설정</p>
              </div>
            </div>
            <div className="folder__step-content">
              {!formState.hasClasses && (
                <div className="folder__toggle">
                  <div className="folder__toggle-info">
                    <strong>다중 강사 모드</strong>
                    <span>여러 강사가 각자의 학생을 관리</span>
                  </div>
                  <label className="folder__switch">
                    <input
                      type="checkbox"
                      checked={formState.hasMultipleInstructors}
                      onChange={(e) => updateField('hasMultipleInstructors', e.target.checked)}
                    />
                    <span />
                  </label>
                </div>
              )}
              <div className="folder__toggle">
                <div className="folder__toggle-info">
                  <strong>학부모 가입 허용</strong>
                  <span>보호자가 학생의 수업 현황을 확인</span>
                </div>
                <label className="folder__switch">
                  <input
                    type="checkbox"
                    checked={formState.allowGuardians}
                    onChange={(e) => updateField('allowGuardians', e.target.checked)}
                  />
                  <span />
                </label>
              </div>
              {!formState.hasMultipleInstructors && !formState.hasClasses && (
                <div className="folder__notice">
                  다중 강사 모드가 꺼져 있으면, 운영자가 모든 학생의 강사가 됩니다.
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="folder__step">
            <div className="folder__step-header">
              <span className="folder__step-num">4</span>
              <div className="folder__step-info">
                <h4>클래스 설정</h4>
                <p>수업에 사용할 클래스(교실)를 등록</p>
              </div>
            </div>
            <div className="folder__step-content">
              <div className="folder__list">
                <div className="folder__list-header">
                  <span>클래스 목록</span>
                  {formState.hasPracticeRooms && <span className="folder__list-hint">연습실 제외 시 체크</span>}
                </div>
                {classRoomList.items.map((room, index) => (
                  <div key={index} className="folder__list-item">
                    <span className="folder__list-num">{index + 1}</span>
                    <input
                      type="text"
                      value={room.name}
                      onChange={(e) => classRoomList.update(index, { ...room, name: e.target.value })}
                      placeholder="클래스 이름 (예: A실)"
                    />
                    {formState.hasPracticeRooms && room.name.trim() && (
                      <label className="folder__list-check">
                        <input
                          type="checkbox"
                          checked={!room.isPracticeRoom}
                          onChange={(e) => classRoomList.update(index, { ...room, isPracticeRoom: !e.target.checked })}
                        />
                        <span />
                      </label>
                    )}
                    {classRoomList.items.length > 1 && (
                      <button type="button" onClick={() => classRoomList.remove(index)}>×</button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="folder__list-add"
                  onClick={() => classRoomList.add({ name: '', isPracticeRoom: true })}
                >
                  + 클래스 추가
                </button>
              </div>
              <div className="folder__toggle">
                <div className="folder__toggle-info">
                  <strong>연습(공부)실 운영</strong>
                  <span>학생들이 수업 외 시간에 클래스를 예약</span>
                </div>
                <label className="folder__switch">
                  <input
                    type="checkbox"
                    checked={formState.hasPracticeRooms}
                    onChange={(e) => updateField('hasPracticeRooms', e.target.checked)}
                  />
                  <span />
                </label>
              </div>
              {formState.hasPracticeRooms && (
                <div className="folder__subsection">
                  <div className="folder__subsection-row">
                    <span>운영 시간</span>
                    <div className="folder__time-inputs">
                      <input
                        type="time"
                        value={formState.practiceRoomOpenTime}
                        onChange={(e) => updateField('practiceRoomOpenTime', e.target.value)}
                      />
                      <span>~</span>
                      <input
                        type="time"
                        value={formState.practiceRoomCloseTime}
                        onChange={(e) => updateField('practiceRoomCloseTime', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="folder__subsection-row">
                    <span>예약 단위</span>
                    <div className="folder__slot-btns">
                      <button
                        type="button"
                        className={formState.practiceRoomSlotMinutes === 30 ? 'active' : ''}
                        onClick={() => updateField('practiceRoomSlotMinutes', 30)}
                      >
                        30분
                      </button>
                      <button
                        type="button"
                        className={formState.practiceRoomSlotMinutes === 60 ? 'active' : ''}
                        onClick={() => updateField('practiceRoomSlotMinutes', 60)}
                      >
                        1시간
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="folder__step">
            <div className="folder__step-header">
              <span className="folder__step-num">5</span>
              <div className="folder__step-info">
                <h4>직책 설정</h4>
                <p>본인의 직책을 선택</p>
              </div>
            </div>
            <div className="folder__step-content">
              <div className="folder__box">
                <div className="folder__box-header">
                  <span>학원 직책</span>
                  <span className="folder__box-badge">자동 생성</span>
                </div>
                <div className="folder__box-tags">
                  {EDUCATION_POSITIONS.map((pos) => (
                    <span key={pos}>{pos}</span>
                  ))}
                </div>
              </div>
              <div className="folder__counter">
                <div className="folder__counter-header">
                  <strong>운영자(Owner) 수</strong>
                  <span>모임 관리의 모든 권한을 가집니다</span>
                </div>
                <div className="folder__counter-controls">
                  <button
                    type="button"
                    onClick={() => updateField('ownerCount', Math.max(1, (formState.ownerCount || 1) - 1))}
                    disabled={(formState.ownerCount || 1) <= 1}
                  >
                    −
                  </button>
                  <span>{formState.ownerCount || 1}명</span>
                  <button
                    type="button"
                    onClick={() => updateField('ownerCount', Math.min(5, (formState.ownerCount || 1) + 1))}
                    disabled={(formState.ownerCount || 1) >= 5}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="folder__field">
                <label>본인 직책 선택 *</label>
                <div className="folder__select-btns">
                  {EDUCATION_POSITIONS.filter((pos) => pos === '원장' || pos === '강사').map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      className={formState.myTitle === pos ? 'active' : ''}
                      onClick={() => updateField('myTitle', pos)}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 폴더 카드 클릭 핸들러
  const handleFolderClick = (gt: GroupType) => {
    if (type === gt) {
      // 이미 선택된 타입을 다시 클릭하면 닫기
      handleReset();
    } else {
      handleTypeSelect(gt);
    }
  };

  return (
    <div className="folder-page">
      <div className="folder-page__header">
        <h1>새 모임 만들기</h1>
        <p>만들고 싶은 모임 유형을 선택하세요</p>
      </div>

      <div className="folder-page__content">
        {GROUP_TYPES.map((gt) => {
          const isOpen = type === gt;
          const typeColor = GROUP_TYPE_COLORS[gt];

          return (
            <div
              key={gt}
              className={`folder ${isOpen ? 'folder--open' : ''}`}
              style={{ '--folder-color': typeColor } as React.CSSProperties}
            >
              {/* 폴더 탭 (항상 보임) */}
              <button
                type="button"
                className="folder__tab"
                onClick={() => handleFolderClick(gt)}
              >
                <div className="folder__tab-icon" style={{ background: typeColor }}>
                  <img src={GROUP_TYPE_ICON_IMAGES[gt]} alt="" />
                </div>
                <div className="folder__tab-info">
                  <span className="folder__tab-name">{GROUP_TYPE_LABELS[gt]}</span>
                  <span className="folder__tab-desc">{GROUP_TYPE_DESCRIPTIONS[gt]}</span>
                </div>
                <div className="folder__tab-tags">
                  {GROUP_TYPE_FEATURES[gt].slice(0, 3).map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
                <span className={`folder__tab-arrow ${isOpen ? 'folder__tab-arrow--open' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </button>

              {/* 폴더 내용 (펼쳐졌을 때만 보임) */}
              {isOpen && (
                <div className="folder__body">
                  {/* 교육 타입: 단계별 */}
                  {gt === 'education' && (
                    <>
                      <div className="folder__progress">
                        {([1, 2, 3, 4, 5] as const).map((step) => (
                          <div
                            key={step}
                            className={`folder__progress-dot ${
                              educationStep === step ? 'folder__progress-dot--active' : ''
                            } ${educationStep > step ? 'folder__progress-dot--done' : ''}`}
                          >
                            <span>{educationStep > step ? '✓' : step}</span>
                            <span className="folder__progress-text">{EDUCATION_STEPS[step]}</span>
                          </div>
                        ))}
                      </div>
                      {renderEducationSlide()}
                      <div className="folder__nav">
                        <button
                          type="button"
                          className="folder__nav-prev"
                          onClick={goPrevStep}
                          disabled={educationStep === 1}
                        >
                          이전
                        </button>
                        {educationStep < 5 ? (
                          <button
                            type="button"
                            className="folder__nav-next"
                            onClick={goNextStep}
                            disabled={!canGoNextStep()}
                          >
                            다음
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="folder__nav-submit"
                            onClick={handleSubmit}
                            disabled={!canSubmit() || isLoading}
                          >
                            {isLoading ? '생성 중...' : '모임 만들기'}
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* 다른 타입: 단일 폼 */}
                  {gt !== 'education' && (
                    <>
                      <div className="folder__form">
                        <div className="folder__field-row">
                          <IconPicker
                            icon={icon}
                            color={color}
                            image={logoImage}
                            onIconChange={(v) => updateField('icon', v)}
                            onColorChange={(v) => updateField('color', v)}
                            onImageChange={(v) => updateField('logoImage', v)}
                          />
                          <div className="folder__field folder__field--grow">
                            <label>{GROUP_TYPE_LABELS[gt]} 이름 *</label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => updateField('name', e.target.value)}
                              placeholder={`${GROUP_TYPE_LABELS[gt]} 이름을 입력하세요`}
                              maxLength={50}
                            />
                          </div>
                        </div>

                        {/* 직책 설정 (커플 제외) */}
                        {gt !== 'couple' && (
                          <PositionSettings
                            type={gt}
                            formState={formState}
                            updateField={updateField}
                            positionList={positionList}
                            rankList={rankList}
                          />
                        )}

                        {/* 커플 전용 */}
                        {gt === 'couple' && (
                          <div className="folder__couple">
                            <div className="folder__field">
                              <label>나는</label>
                              <div className="folder__couple-btns">
                                <button
                                  type="button"
                                  className={coupleRole === 'boyfriend' ? 'active' : ''}
                                  onClick={() => updateField('coupleRole', 'boyfriend')}
                                >
                                  남자친구
                                </button>
                                <button
                                  type="button"
                                  className={coupleRole === 'girlfriend' ? 'active' : ''}
                                  onClick={() => updateField('coupleRole', 'girlfriend')}
                                >
                                  여자친구
                                </button>
                              </div>
                            </div>
                            <div className="folder__field-row">
                              <div className="folder__field">
                                <label>사귄 날짜</label>
                                <input
                                  type="date"
                                  value={anniversaryDate}
                                  onChange={(e) => updateField('anniversaryDate', e.target.value)}
                                />
                              </div>
                              <div className="folder__field">
                                <label>내 생일</label>
                                <input
                                  type="date"
                                  value={myBirthday}
                                  onChange={(e) => updateField('myBirthday', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="folder__field">
                          <label>설명 <span>(선택)</span></label>
                          <textarea
                            value={description}
                            onChange={(e) => updateField('description', e.target.value)}
                            placeholder="모임에 대한 간단한 설명"
                            rows={2}
                            maxLength={200}
                          />
                        </div>
                      </div>

                      <div className="folder__footer">
                        <button
                          type="button"
                          className="folder__submit"
                          onClick={handleSubmit}
                          disabled={!canSubmit() || isLoading}
                        >
                          {isLoading ? '생성 중...' : '모임 만들기'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupCreatePage;
