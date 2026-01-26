import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { useToast, IconPicker } from '@/components';
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
  const [isLoading, setIsLoading] = useState(false);

  // 연인 타입 전용 필드
  const [coupleRole, setCoupleRole] = useState<'boyfriend' | 'girlfriend' | ''>('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [myBirthday, setMyBirthday] = useState('');

  const createGroup = useGroupStore((state) => state.createGroup);

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

    setIsLoading(true);

    try {
      const group = await createGroup({ name, description, type, icon, color, logoImage });
      toast.success('모임이 생성되었습니다!');
      navigate(`/groups/${group.id}`);
    } catch (error) {
      console.error('모임 생성 실패:', error);
      toast.error('모임 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
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
            disabled={isLoading || !type || !name.trim()}
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
                <div className="group-create__features">
                  <div className="group-create__features-header">
                    <span className="group-create__features-icon" style={{ background: selectedType.color }}>
                      <img src={selectedType.icon} alt="" />
                    </span>
                    <div className="group-create__features-text">
                      <span className="group-create__features-label">{selectedType.label} 기능</span>
                      <span className="group-create__features-note">설정에서 ON/OFF 가능</span>
                    </div>
                  </div>
                  <div className="group-create__features-list">
                    {selectedType.features.map((feature) => (
                      <span key={feature} className="group-create__feature-tag">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="group-create__row">
                  <div className="group-create__icon-field">
                    <label className="group-create__label">아이콘</label>
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
                    <label className="group-create__label">모임 이름</label>
                    <input
                      type="text"
                      className="group-create__input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`예: ${selectedType.label} 모임`}
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="group-create__field">
                  <label className="group-create__label">설명 <span className="group-create__optional">(선택)</span></label>
                  <textarea
                    className="group-create__textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="모임에 대한 간단한 설명"
                    rows={3}
                    maxLength={200}
                  />
                </div>

                {type !== 'couple' && (
                  <div className="group-create__role-info">
                    <span className="group-create__role-label">내 역할</span>
                    <span className="group-create__role-badge">Owner</span>
                    <span className="group-create__role-desc">모임 생성자는 자동으로 Owner가 됩니다</span>
                  </div>
                )}

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
