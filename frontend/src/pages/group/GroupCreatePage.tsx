import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { useToast, IconPicker } from '@/components';
import { useListManager, useLoading } from '@/hooks';
import { positionApi, groupApi, practiceRoomApi } from '@/api';
import { getPositionLabel } from '@/constants/labels';
import { bookIcon, churchIcon, targetIcon, briefcaseIcon, heartIcon } from '@/assets';
import type { GroupType } from '@/types';
import './GroupPages.scss';

interface GroupTypeOption {
  value: GroupType;
  label: string;
  icon: string;
  defaultIcon: string;
  color: string;
  features: string[];
}

const groupTypes: GroupTypeOption[] = [
  {
    value: 'education',
    label: '교육/학원',
    icon: bookIcon,
    defaultIcon: 'book',
    color: '#3b82f6',
    features: ['수업 진도 관리', '과제 관리', '보호자 연동', '성적/평가', '출석 관리']
  },
  {
    value: 'religious',
    label: '종교',
    icon: churchIcon,
    defaultIcon: 'church',
    color: '#8b5cf6',
    features: ['주보 관리', '봉사활동 관리', '기도제목 공유', '찬양콘티 관리']
  },
  {
    value: 'community',
    label: '동호회',
    icon: targetIcon,
    defaultIcon: 'target',
    color: '#10b981',
    features: ['회비 관리', '정기 모임', '게시판', '투표/설문', '사진 공유']
  },
  {
    value: 'company',
    label: '회사/팀',
    icon: briefcaseIcon,
    defaultIcon: 'briefcase',
    color: '#f59e0b',
    features: ['프로젝트 관리', '업무 할당', '회의록', '문서 공유', '결재']
  },
  {
    value: 'couple',
    label: '연인',
    icon: heartIcon,
    defaultIcon: 'heart',
    color: '#ec4899',
    features: ['기념일 관리', 'D-day 카운트', '데이트 일정', '추억 앨범', '위시리스트']
  },
];

const DEFAULT_ICON = 'users';
const DEFAULT_COLOR = '#3b82f6';

const GroupCreatePage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GroupType | ''>('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [logoImage, setLogoImage] = useState<string | undefined>();
  const { loading: isLoading, withLoading } = useLoading();

  // 연인 타입 전용 필드
  const [coupleRole, setCoupleRole] = useState<'boyfriend' | 'girlfriend' | ''>('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [myBirthday, setMyBirthday] = useState('');

  // 직책/직분 필드 - useListManager 훅 사용
  const positionList = useListManager<string>([''], { maxLength: 10, minLength: 1 });
  const [myTitle, setMyTitle] = useState('');

  // 회사 타입 전용: 직위+직책 vs 직책만
  const [companyPositionMode, setCompanyPositionMode] = useState<'both' | 'title_only'>('title_only');
  const rankList = useListManager<string>([''], { maxLength: 10, minLength: 1 });
  const [myRank, setMyRank] = useState(''); // 내 직위

  // 학원(education) 타입 전용 설정
  const [hasClasses, setHasClasses] = useState(false); // 반 운영 여부
  const [hasPracticeRooms, setHasPracticeRooms] = useState(false); // 연습실 운영 여부
  const [allowGuardians, setAllowGuardians] = useState(false); // 보호자 허용 여부

  // 연습실 관리 설정
  const practiceRoomList = useListManager<string>([''], { maxLength: 20, minLength: 1 });
  const [practiceRoomOpenTime, setPracticeRoomOpenTime] = useState('09:00');
  const [practiceRoomCloseTime, setPracticeRoomCloseTime] = useState('22:00');
  const [practiceRoomSlotMinutes, setPracticeRoomSlotMinutes] = useState<30 | 60>(60);
  const [practiceRoomMaxHours, setPracticeRoomMaxHours] = useState(2);

  const createGroup = useGroupStore((state) => state.createGroup);

  // 종교 모임이면 "직분", 아니면 "직책"
  const positionLabel = getPositionLabel(type || undefined);

  const handleTypeSelect = (selectedType: GroupType) => {
    setType(selectedType);
    const selected = groupTypes.find((gt) => gt.value === selectedType);
    if (selected) {
      setIcon(selected.defaultIcon);
      setColor(selected.color);
    }
  };

  const handleReset = () => {
    setName('');
    setDescription('');
    setType('');
    setIcon(DEFAULT_ICON);
    setColor(DEFAULT_COLOR);
    setLogoImage(undefined);
    setCoupleRole('');
    setAnniversaryDate('');
    setMyBirthday('');
    positionList.reset(['']);
    setMyTitle('');
    setCompanyPositionMode('title_only');
    rankList.reset(['']);
    setMyRank('');
    // 학원 설정 초기화
    setHasClasses(false);
    setHasPracticeRooms(false);
    setAllowGuardians(false);
    // 연습실 설정 초기화
    practiceRoomList.reset(['']);
    setPracticeRoomOpenTime('09:00');
    setPracticeRoomCloseTime('22:00');
    setPracticeRoomSlotMinutes(60);
    setPracticeRoomMaxHours(2);
  };

  const handleSubmit = async () => {
    if (!type) {
      toast.error('모임 타입을 선택해주세요');
      return;
    }

    if (!name.trim()) {
      toast.error('모임 이름을 입력해주세요');
      return;
    }

    const validPositions = positionList.items.filter((p) => p.trim());
    const validRanks = rankList.items.filter((r) => r.trim());

    // 커플 타입이 아니면 직책/직분 최소 1개 필수
    if (type !== 'couple' && validPositions.length === 0) {
      toast.error(`최소 하나 이상의 ${positionLabel}을 만들어주세요`);
      return;
    }

    // 회사 타입이고 직위+직책 모드일 때 직위도 필수
    if (type === 'company' && companyPositionMode === 'both' && validRanks.length === 0) {
      toast.error('최소 하나 이상의 직위를 만들어주세요');
      return;
    }

    // 커플 타입이 아니면 본인 직책/직분 필수
    if (type !== 'couple' && !myTitle.trim()) {
      toast.error(`본인의 ${positionLabel}을 설정해주세요`);
      return;
    }

    // 회사 타입이고 직위+직책 모드일 때 본인 직위도 필수
    if (type === 'company' && companyPositionMode === 'both' && !myRank.trim()) {
      toast.error('본인의 직위를 설정해주세요');
      return;
    }

    await withLoading(async () => {
      // 1. 모임 생성 (학원 타입이면 추가 설정 포함)
      const groupData: Parameters<typeof createGroup>[0] = { name, description, type, icon, color, logoImage };
      if (type === 'education') {
        groupData.hasClasses = hasClasses;
        groupData.hasPracticeRooms = hasPracticeRooms;
        groupData.allowGuardians = allowGuardians;
        if (hasPracticeRooms) {
          groupData.practiceRoomSettings = {
            openTime: practiceRoomOpenTime,
            closeTime: practiceRoomCloseTime,
            slotMinutes: practiceRoomSlotMinutes,
            maxHoursPerDay: practiceRoomMaxHours,
          };
        }
      }
      const group = await createGroup(groupData);

      // 2. 직책/직분 생성 (커플 타입 제외)
      const createdPositions: Array<{ id: string; name: string }> = [];
      if (type !== 'couple' && validPositions.length > 0) {
        const results = await Promise.all(
          validPositions.map((positionName) =>
            positionApi.create(group.id, { name: positionName }).catch((err) => {
              console.error('직책 생성 실패:', err);
              return null;
            })
          )
        );
        results.forEach((result) => {
          if (result?.data) {
            createdPositions.push(result.data);
          }
        });
      }

      // 2-1. 회사 타입 직위 생성
      if (type === 'company' && companyPositionMode === 'both' && validRanks.length > 0) {
        await Promise.all(
          validRanks.map((rankName) =>
            positionApi.create(group.id, { name: `[직위] ${rankName}` }).catch((err) =>
              console.error('직위 생성 실패:', err)
            )
          )
        );
      }

      // 3. 본인 프로필에 직책/직분 설정 + 직책 배정
      if (type !== 'couple' && myTitle.trim()) {
        const titleValue = type === 'company' && companyPositionMode === 'both' && myRank.trim()
          ? `${myRank.trim()} / ${myTitle.trim()}`
          : myTitle.trim();
        await groupApi.updateMyProfile(group.id, { title: titleValue }).catch((err) =>
          console.error('프로필 업데이트 실패:', err)
        );

        // 내가 입력한 직책과 일치하는 Position 찾아서 배정
        const myPosition = createdPositions.find((p) => p.name === myTitle.trim());
        if (myPosition && group.myMembershipId) {
          await positionApi.assignPosition(group.id, group.myMembershipId, {
            positionId: myPosition.id,
          }).catch((err) => console.error('직책 배정 실패:', err));
        }
      }

      // 4. 연습실 생성 (학원 타입 + 연습실 있을 때만)
      if (type === 'education' && hasPracticeRooms) {
        const validRooms = practiceRoomList.items.filter((r) => r.trim());
        if (validRooms.length > 0) {
          await Promise.all(
            validRooms.map((roomName) =>
              practiceRoomApi.create(group.id, { name: roomName.trim() }).catch((err) => {
                console.error('연습실 생성 실패:', err);
                return null;
              })
            )
          );
        }
      }

      toast.success('모임이 생성되었습니다!');
      navigate(`/groups/${group.id}`);
    }).catch((error) => {
      console.error('모임 생성 실패:', error);
      toast.error('모임 생성에 실패했습니다.');
    });
  };

  const selectedType = groupTypes.find((gt) => gt.value === type);

  return (
    <div className="group-create">
      <div className="group-create__header">
        <div className="group-create__header-left">
          <h1 className="group-create__title">새 모임 만들기</h1>
          <p className="group-create__subtitle">함께할 사람들과 새로운 모임을 시작하세요</p>
        </div>
        <div className="group-create__actions">
          <button
            type="button"
            className="group-create__cancel"
            onClick={handleReset}
          >
            초기화
          </button>
          <button
            type="button"
            className="group-create__submit"
            disabled={
              isLoading ||
              !type ||
              !name.trim() ||
              (type !== 'couple' && positionList.items.filter((p) => p.trim()).length === 0) ||
              (type !== 'couple' && !myTitle.trim()) ||
              (type === 'company' && companyPositionMode === 'both' && rankList.items.filter((r) => r.trim()).length === 0) ||
              (type === 'company' && companyPositionMode === 'both' && !myRank.trim())
            }
            onClick={handleSubmit}
          >
            {isLoading ? '생성 중...' : '만들기'}
          </button>
        </div>
      </div>

      <div className="group-create__form">
        <div className="group-create__body">
          <div className="group-create__left">
            <label className="group-create__label">모임 타입</label>
            <div className="group-create__types">
              {groupTypes.map((gt) => (
                <label
                  key={gt.value}
                  className={`group-create__type ${type === gt.value ? 'group-create__type--selected' : ''}`}
                  style={{ '--type-color': gt.color } as React.CSSProperties}
                >
                  <input
                    type="radio"
                    name="type"
                    value={gt.value}
                    checked={type === gt.value}
                    onChange={() => handleTypeSelect(gt.value)}
                  />
                  <div className="group-create__type-icon">
                    <img src={gt.icon} alt="" />
                  </div>
                  <span className="group-create__type-label">{gt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="group-create__right">
            {!selectedType && (
              <div className="group-create__features group-create__features--all">
                <p className="group-create__features-guide">모임 타입을 클릭해 모임 생성을 진행해주세요!</p>
                <div className="group-create__features-all">
                  {groupTypes.map((gt) => (
                    <div key={gt.value} className="group-create__features-group">
                      <div className="group-create__features-group-header">
                        <span className="group-create__features-group-icon" style={{ background: gt.color }}>
                          <img src={gt.icon} alt="" />
                        </span>
                        <span className="group-create__features-group-label">{gt.label}</span>
                      </div>
                      <div className="group-create__features-group-list">
                        {gt.features.map((feature) => (
                          <span key={feature} className="group-create__feature-tag">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedType && (
              <>
                {/* 1. 아이콘 + 모임 이름 (최상단) */}
                <div className="group-create__row">
                  <div className="group-create__icon-field">
                    <IconPicker
                      icon={icon}
                      color={color}
                      image={logoImage}
                      onIconChange={setIcon}
                      onColorChange={setColor}
                      onImageChange={setLogoImage}
                    />
                  </div>
                  <div className="group-create__field group-create__field--grow">
                    <input
                      type="text"
                      className="group-create__input group-create__input--large"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`${selectedType.label} 이름을 입력하세요`}
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* 2. 학원 타입 전용 운영 설정 */}
                {type === 'education' && (
                  <div className="group-create__academy-settings">
                    <div className="group-create__academy-header">
                      <span className="group-create__academy-header-icon">⚙️</span>
                      <span className="group-create__academy-header-text">학원 운영 설정</span>
                    </div>

                    {/* 질문 1: 수업 방식 */}
                    <div className="group-create__academy-card">
                      <div className="group-create__academy-card-question">
                        수업 방식이 어떻게 되나요?
                      </div>
                      <div className="group-create__academy-card-options">
                        <button
                          type="button"
                          className={`group-create__academy-card-btn ${hasClasses ? 'group-create__academy-card-btn--active' : ''}`}
                          onClick={() => setHasClasses(true)}
                        >
                          <span className="group-create__academy-card-btn-icon">👥</span>
                          <span className="group-create__academy-card-btn-label">반(그룹) 수업</span>
                          <span className="group-create__academy-card-btn-desc">초급반, 중급반 등</span>
                        </button>
                        <button
                          type="button"
                          className={`group-create__academy-card-btn ${!hasClasses ? 'group-create__academy-card-btn--active' : ''}`}
                          onClick={() => setHasClasses(false)}
                        >
                          <span className="group-create__academy-card-btn-icon">👤</span>
                          <span className="group-create__academy-card-btn-label">개인 수업</span>
                          <span className="group-create__academy-card-btn-desc">1:1 레슨</span>
                        </button>
                      </div>
                    </div>

                    {/* 질문 2: 연습실/공부방 */}
                    <div className="group-create__academy-card">
                      <div className="group-create__academy-card-question">
                        연습실/공부방이 있나요?
                      </div>
                      <div className="group-create__academy-card-toggle">
                        <button
                          type="button"
                          className={`group-create__academy-toggle-btn ${hasPracticeRooms ? 'group-create__academy-toggle-btn--active' : ''}`}
                          onClick={() => setHasPracticeRooms(true)}
                        >
                          있어요
                        </button>
                        <button
                          type="button"
                          className={`group-create__academy-toggle-btn ${!hasPracticeRooms ? 'group-create__academy-toggle-btn--active' : ''}`}
                          onClick={() => setHasPracticeRooms(false)}
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

                    {/* 연습실 관리 설정 (연습실 있을 때만) */}
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
                                  const emptyIndex = practiceRoomList.items.findIndex(item => !item.trim());
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
                          {practiceRoomList.items.some(r => r.trim()) && (
                            <div className="group-create__positions-tags">
                              {practiceRoomList.items.map((room, index) => (
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
                              onChange={(e) => setPracticeRoomOpenTime(e.target.value)}
                            />
                            <span className="group-create__practice-room-time-separator">~</span>
                            <input
                              type="time"
                              className="group-create__input group-create__input--time"
                              value={practiceRoomCloseTime}
                              onChange={(e) => setPracticeRoomCloseTime(e.target.value)}
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
                              onClick={() => setPracticeRoomSlotMinutes(30)}
                            >
                              30분
                            </button>
                            <button
                              type="button"
                              className={`group-create__academy-toggle-btn ${practiceRoomSlotMinutes === 60 ? 'group-create__academy-toggle-btn--active' : ''}`}
                              onClick={() => setPracticeRoomSlotMinutes(60)}
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
                              onClick={() => setPracticeRoomMaxHours(Math.max(1, practiceRoomMaxHours - 1))}
                            >
                              -
                            </button>
                            <span className="group-create__practice-room-max-value">{practiceRoomMaxHours}시간</span>
                            <button
                              type="button"
                              className="group-create__practice-room-max-btn"
                              onClick={() => setPracticeRoomMaxHours(Math.min(8, practiceRoomMaxHours + 1))}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 질문 3: 보호자 */}
                    <div className="group-create__academy-card">
                      <div className="group-create__academy-card-question">
                        학부모(보호자)도 가입할 수 있게 할까요?
                      </div>
                      <div className="group-create__academy-card-toggle">
                        <button
                          type="button"
                          className={`group-create__academy-toggle-btn ${allowGuardians ? 'group-create__academy-toggle-btn--active' : ''}`}
                          onClick={() => setAllowGuardians(true)}
                        >
                          네
                        </button>
                        <button
                          type="button"
                          className={`group-create__academy-toggle-btn ${!allowGuardians ? 'group-create__academy-toggle-btn--active' : ''}`}
                          onClick={() => setAllowGuardians(false)}
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
                )}

                {/* 3. 직책/직분 설정 (커플 제외) */}
                {type !== 'couple' && (
                  <>
                    {/* 회사 타입: 직위+직책 vs 직책만 선택 */}
                    {type === 'company' && (
                      <div className="group-create__company-mode">
                        <label className="group-create__label">직위/직책 설정 방식</label>
                        <div className="group-create__company-mode-toggle">
                          <button
                            type="button"
                            className={`group-create__company-mode-btn ${companyPositionMode === 'title_only' ? 'group-create__company-mode-btn--active' : ''}`}
                            onClick={() => setCompanyPositionMode('title_only')}
                          >
                            직책만
                          </button>
                          <button
                            type="button"
                            className={`group-create__company-mode-btn ${companyPositionMode === 'both' ? 'group-create__company-mode-btn--active' : ''}`}
                            onClick={() => setCompanyPositionMode('both')}
                          >
                            직위 + 직책
                          </button>
                        </div>
                        <span className="group-create__company-mode-hint">
                          {companyPositionMode === 'title_only'
                            ? '직책만 사용합니다 (예: 팀장, 부서장)'
                            : '직위와 직책을 함께 사용합니다 (예: 과장/팀장)'}
                        </span>
                      </div>
                    )}

                    {/* 회사 직위+직책 모드일 때 직위 섹션 */}
                    {type === 'company' && companyPositionMode === 'both' && (
                      <div className="group-create__positions">
                        <label className="group-create__label">직위 만들기</label>
                        <input
                          type="text"
                          className="group-create__input"
                          placeholder="직위 입력 후 Enter (예: 사원, 대리, 과장)"
                          maxLength={30}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              const value = e.currentTarget.value.trim();
                              if (value && rankList.canAdd) {
                                const emptyIndex = rankList.items.findIndex(item => !item.trim());
                                if (emptyIndex !== -1) {
                                  rankList.update(emptyIndex, value);
                                } else {
                                  rankList.add(value);
                                }
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        {rankList.items.some(r => r.trim()) && (
                          <div className="group-create__positions-tags">
                            {rankList.items.map((rank, index) => (
                              rank.trim() && (
                                <span key={index} className="group-create__positions-tag">
                                  {rank}
                                  <button
                                    type="button"
                                    className="group-create__positions-tag-remove"
                                    onClick={() => rankList.remove(index)}
                                  >
                                    ×
                                  </button>
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 직책/직분 설정 섹션 - 카드 스타일 */}
                    <div className="group-create__member-settings">
                      <div className="group-create__member-settings-header">
                        <span className="group-create__member-settings-header-icon">👥</span>
                        <span className="group-create__member-settings-header-text">멤버 설정</span>
                      </div>

                      {/* 직책/직분 만들기 */}
                      <div className="group-create__member-settings-card">
                        <div className="group-create__member-settings-card-question">
                          {positionLabel} 만들기
                        </div>
                        <input
                          type="text"
                          className="group-create__input"
                          placeholder={
                            type === 'religious'
                              ? '직분 입력 후 Enter (예: 목사, 전도사, 장로)'
                              : type === 'company'
                                ? '직책 입력 후 Enter (예: 팀장, 부서장)'
                                : type === 'education'
                                  ? '직책 입력 후 Enter (예: 원장, 강사, 매니저)'
                                  : '직책 입력 후 Enter (예: 회장, 총무, 팀장)'
                          }
                          maxLength={30}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              const value = e.currentTarget.value.trim();
                              if (value && positionList.canAdd) {
                                const emptyIndex = positionList.items.findIndex(item => !item.trim());
                                if (emptyIndex !== -1) {
                                  positionList.update(emptyIndex, value);
                                } else {
                                  positionList.add(value);
                                }
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        {positionList.items.some(p => p.trim()) && (
                          <div className="group-create__positions-tags">
                            {positionList.items.map((position, index) => (
                              position.trim() && (
                                <span key={index} className="group-create__positions-tag">
                                  {position}
                                  <button
                                    type="button"
                                    className="group-create__positions-tag-remove"
                                    onClick={() => positionList.remove(index)}
                                  >
                                    ×
                                  </button>
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 회사 직위+직책 모드일 때 내 직위 설정 */}
                      {type === 'company' && companyPositionMode === 'both' && (
                        <div className="group-create__member-settings-card">
                          <div className="group-create__member-settings-card-question">내 직위</div>
                          <input
                            type="text"
                            className="group-create__input"
                            value={myRank}
                            onChange={(e) => setMyRank(e.target.value)}
                            placeholder="본인의 직위를 입력하세요 (예: 과장)"
                            maxLength={30}
                          />
                        </div>
                      )}

                      {/* 본인 직책/직분 설정 */}
                      <div className="group-create__member-settings-card">
                        <div className="group-create__member-settings-card-question">내 {positionLabel}</div>
                        <input
                          type="text"
                          className="group-create__input"
                          value={myTitle}
                          onChange={(e) => setMyTitle(e.target.value)}
                          placeholder={
                            type === 'education'
                              ? '본인의 직책 (예: 원장, 강사)'
                              : `본인의 ${positionLabel}을 입력하세요`
                          }
                          maxLength={30}
                        />
                        <div className="group-create__member-settings-card-note">
                          <span className="group-create__role-badge">Owner</span>
                          <span>모임 생성자는 자동으로 Owner가 됩니다</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 5. 설명 (마지막) */}
                <div className="group-create__field">
                  <label className="group-create__label">설명 <span className="group-create__optional">(선택)</span></label>
                  <textarea
                    className="group-create__textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="모임에 대한 간단한 설명"
                    rows={2}
                    maxLength={200}
                  />
                </div>

                {type === 'couple' && (
                  <div className="group-create__couple-fields">
                    <div className="group-create__couple-role">
                      <span className="group-create__couple-role-label">나는</span>
                      <div className="group-create__couple-toggle">
                        <button
                          type="button"
                          className={`group-create__couple-btn ${coupleRole === 'boyfriend' ? 'group-create__couple-btn--active' : ''}`}
                          onClick={() => setCoupleRole('boyfriend')}
                        >
                          남자친구
                        </button>
                        <button
                          type="button"
                          className={`group-create__couple-btn ${coupleRole === 'girlfriend' ? 'group-create__couple-btn--active' : ''}`}
                          onClick={() => setCoupleRole('girlfriend')}
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
                          onChange={(e) => setAnniversaryDate(e.target.value)}
                        />
                      </div>
                      <div className="group-create__couple-date">
                        <label className="group-create__couple-date-label">내 생일</label>
                        <input
                          type="date"
                          className="group-create__couple-date-input"
                          value={myBirthday}
                          onChange={(e) => setMyBirthday(e.target.value)}
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
