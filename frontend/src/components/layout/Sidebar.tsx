import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { subGroupApi, groupApi } from '@/api';
import { useToast } from '@/components/common';
import { useLoading } from '@/hooks';
import { getPositionLabel } from '@/constants/labels';
import { homeIcon, settingsIcon, chevronRightIcon, plusIcon, linkIcon, getIconById } from '@/assets';
import type { SubGroup, GroupType } from '@/types';
import './Sidebar.scss';

// 소모임 점 아이콘
const SubGroupDot = () => (
  <span className="sidebar__subgroup-dot" />
);

interface GroupMenuItemProps {
  groupId: string;
  groupName: string;
  icon?: string;
  color?: string;
  logoImage?: string;
  isActive: boolean;
}

const GroupMenuItem = ({ groupId, groupName, icon, color, logoImage, isActive }: GroupMenuItemProps) => {
  const [isOpen, setIsOpen] = useState(false); // 기본 닫힘
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const location = useLocation();

  // 소모임 로드
  const loadSubGroups = useCallback(async () => {
    if (hasLoadedRef.current || isLoading || !groupId || groupId === 'undefined') return;

    setIsLoading(true);
    try {
      const response = await subGroupApi.getList(groupId);
      setSubGroups(response.data);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Failed to load subgroups:', error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, isLoading]);

  // 현재 이 그룹 또는 그 소모임이 활성화되어 있으면 자동으로 열고 로드
  useEffect(() => {
    const isGroupActive = location.pathname.includes(`/groups/${groupId}`);
    if (isGroupActive && !isOpen) {
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, groupId]);

  // 열릴 때만 소모임 로드
  useEffect(() => {
    if (isOpen && !hasLoadedRef.current && !isLoading) {
      loadSubGroups();
    }
  }, [isOpen, isLoading, loadSubGroups]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="sidebar__group">
      <div className="sidebar__group-header">
        <NavLink
          to={`/groups/${groupId}`}
          className={({ isActive: linkActive }) =>
            `sidebar__group-link ${linkActive || isActive ? 'sidebar__group-link--active' : ''}`
          }
        >
          <span
            className="sidebar__group-avatar"
            style={color && color !== 'transparent' ? { background: color } : undefined}
          >
            {logoImage ? (
              <img src={logoImage} alt={groupName} className="sidebar__group-logo" />
            ) : icon && getIconById(icon) ? (
              <img src={getIconById(icon)} alt="" className="sidebar__group-icon" />
            ) : (
              groupName?.charAt(0) || '?'
            )}
          </span>
          <span className="sidebar__group-name">{groupName || '이름 없음'}</span>
        </NavLink>
        <button
          className="sidebar__toggle-btn"
          onClick={handleToggle}
          aria-label={isOpen ? '소모임 접기' : '소모임 펼치기'}
        >
          <img
            src={chevronRightIcon}
            alt=""
            className={`sidebar__chevron ${isOpen ? 'sidebar__chevron--open' : ''}`}
            width="16"
            height="16"
          />
        </button>
      </div>

      {isOpen && (
        <div className="sidebar__subgroups">
          {isLoading ? (
            <div className="sidebar__loading">로딩 중...</div>
          ) : subGroups.length === 0 ? (
            <div className="sidebar__empty-subgroups">소모임 없음</div>
          ) : (
            subGroups.map((subGroup) => (
              <NavLink
                key={subGroup.id}
                to={`/groups/${groupId}/subgroups/${subGroup.id}`}
                className={({ isActive: linkActive }) =>
                  `sidebar__subgroup-link ${linkActive ? 'sidebar__subgroup-link--active' : ''}`
                }
              >
                <SubGroupDot />
                <span>{subGroup.name}</span>
              </NavLink>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// 초대 코드 입력 모달
interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface JoinedGroupInfo {
  id: string;
  name: string;
  type: GroupType;
  allowGuardians?: boolean;
  positions?: { id: string; name: string; color?: string }[];
}

type InviteStep = 'code' | 'guardian' | 'position';

// 자녀 정보 타입
interface ChildFormData {
  name: string;
  birthYear: string;
  note: string;
}

const InviteModal = ({ isOpen, onClose }: InviteModalProps) => {
  const [step, setStep] = useState<InviteStep>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [joinedGroup, setJoinedGroup] = useState<JoinedGroupInfo | null>(null);
  const { loading, withLoading } = useLoading();
  const [error, setError] = useState('');
  const { joinGroup, fetchMyGroups } = useGroupStore();
  const toast = useToast();

  // 보호자 관련 상태
  const [isGuardian, setIsGuardian] = useState(false);
  const [children, setChildren] = useState<ChildFormData[]>([{ name: '', birthYear: '', note: '' }]);

  // 직책 관련 상태
  const [selectedPositionId, setSelectedPositionId] = useState('');

  const positionLabel = getPositionLabel(joinedGroup?.type);

  // 자녀 추가
  const addChild = () => {
    setChildren([...children, { name: '', birthYear: '', note: '' }]);
  };

  // 자녀 제거
  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  // 자녀 정보 업데이트
  const updateChild = (index: number, field: keyof ChildFormData, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  // 모달 닫을 때 초기화
  const handleClose = useCallback(() => {
    setStep('code');
    setInviteCode('');
    setJoinedGroup(null);
    setError('');
    setIsGuardian(false);
    setChildren([{ name: '', birthYear: '', note: '' }]);
    setSelectedPositionId('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  // Step 1: 초대 코드 검증만 (가입은 아직 안함)
  const handleCheckCode = async () => {
    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해주세요');
      return;
    }

    setError('');
    await withLoading(async () => {
      // 코드만 검증하고 그룹 정보 받기
      const response = await groupApi.validateInviteCode(inviteCode.trim());
      const result = response.data;
      setJoinedGroup(result);

      // 연인 타입이면 바로 가입 처리
      if (result.type === 'couple') {
        await joinGroup(inviteCode.trim());
        toast.success('모임에 가입되었습니다!');
        await fetchMyGroups();
        handleClose();
        return;
      }

      // 보호자 허용 그룹이면 보호자 선택 단계로
      if (result.allowGuardians) {
        setStep('guardian');
      } else {
        // 아니면 바로 직책 선택 단계로
        setStep('position');
      }
    }).catch(() => setError('유효하지 않은 초대 코드입니다'));
  };

  // Step 2: 보호자 여부 선택 후 다음
  const handleGuardianNext = () => {
    if (isGuardian) {
      // 적어도 하나의 자녀에 이름이 있어야 함
      const hasValidChild = children.some(child => child.name.trim());
      if (!hasValidChild) {
        setError('자녀 이름을 입력해주세요');
        return;
      }
    }
    setError('');
    setStep('position');
  };

  // Step 3: 직책 설정 후 가입 완료
  const handleComplete = async () => {
    const positions = joinedGroup?.positions || [];
    const hasPositions = positions.length > 0;
    const selectedPosition = positions.find(p => p.id === selectedPositionId);

    if (hasPositions && !selectedPositionId) {
      setError(`${positionLabel}을 선택해주세요`);
      return;
    }

    if (!joinedGroup) return;

    setError('');
    await withLoading(async () => {
      // 유효한 자녀 정보만 필터링 (이름이 있는 것만)
      const validChildren = isGuardian
        ? children
            .filter(child => child.name.trim())
            .map(child => ({
              name: child.name.trim(),
              birthYear: child.birthYear ? parseInt(child.birthYear) : undefined,
              note: child.note.trim() || undefined,
            }))
        : undefined;

      // 실제 가입 처리 (모든 정보 포함)
      await joinGroup(inviteCode.trim(), {
        isGuardian,
        childInfo: validChildren,
        positionId: selectedPositionId || undefined,
      });

      // 직책 title 업데이트
      if (selectedPosition) {
        await groupApi.updateMyProfile(joinedGroup.id, {
          title: selectedPosition.name,
          positionId: selectedPositionId,
        });
      }

      toast.success('모임에 가입되었습니다!');
      await fetchMyGroups();
      handleClose();
    }).catch(() => setError('가입에 실패했습니다'));
  };

  // 년도 옵션 생성 (현재년도 - 30년 ~ 현재년도)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 31 }, (_, i) => currentYear - i);

  return (
    <div className="sidebar-modal-overlay" onClick={handleClose}>
      <div className="sidebar-modal" onClick={(e) => e.stopPropagation()}>
        {/* Step 1: 초대 코드 입력 */}
        {step === 'code' && (
          <>
            <h3 className="sidebar-modal__title">초대 코드 입력</h3>
            <p className="sidebar-modal__desc">모임 초대 코드를 입력해주세요</p>

            {error && <div className="sidebar-modal__error">{error}</div>}

            <input
              type="text"
              className="sidebar-modal__input"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="예: ABC123"
              maxLength={10}
              autoFocus
            />

            <div className="sidebar-modal__actions">
              <button className="sidebar-modal__btn sidebar-modal__btn--cancel" onClick={handleClose}>
                취소
              </button>
              <button
                className="sidebar-modal__btn sidebar-modal__btn--submit"
                onClick={handleCheckCode}
                disabled={loading || !inviteCode.trim()}
              >
                {loading ? '확인 중...' : '다음'}
              </button>
            </div>
          </>
        )}

        {/* Step 2: 보호자 여부 선택 */}
        {step === 'guardian' && (
          <>
            <h3 className="sidebar-modal__title">가입 유형 선택</h3>
            <p className="sidebar-modal__desc">
              <strong>{joinedGroup?.name}</strong>에 어떤 자격으로 가입하시나요?
            </p>

            {error && <div className="sidebar-modal__error">{error}</div>}

            <div className="sidebar-modal__radio-group">
              <label className={`sidebar-modal__radio ${!isGuardian ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="memberType"
                  checked={!isGuardian}
                  onChange={() => setIsGuardian(false)}
                />
                <span className="sidebar-modal__radio-label">본인 (학생/수강생)</span>
              </label>
              <label className={`sidebar-modal__radio ${isGuardian ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="memberType"
                  checked={isGuardian}
                  onChange={() => setIsGuardian(true)}
                />
                <span className="sidebar-modal__radio-label">보호자</span>
              </label>
            </div>

            {isGuardian && (
              <div className="sidebar-modal__child-info">
                <div className="sidebar-modal__child-info-header">
                  <p className="sidebar-modal__child-info-title">자녀 정보</p>
                  {children.length < 5 && (
                    <button
                      type="button"
                      className="sidebar-modal__add-child-btn"
                      onClick={addChild}
                    >
                      + 자녀 추가
                    </button>
                  )}
                </div>
                {children.map((child, index) => (
                  <div key={index} className="sidebar-modal__child-item">
                    {children.length > 1 && (
                      <div className="sidebar-modal__child-header">
                        <span className="sidebar-modal__child-number">자녀 {index + 1}</span>
                        <button
                          type="button"
                          className="sidebar-modal__remove-child-btn"
                          onClick={() => removeChild(index)}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      className="sidebar-modal__input"
                      value={child.name}
                      onChange={(e) => updateChild(index, 'name', e.target.value)}
                      placeholder="자녀 이름 *"
                      maxLength={20}
                    />
                    <select
                      className="sidebar-modal__select"
                      value={child.birthYear}
                      onChange={(e) => updateChild(index, 'birthYear', e.target.value)}
                    >
                      <option value="">출생년도 (선택)</option>
                      {yearOptions.map(year => (
                        <option key={year} value={year}>{year}년</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="sidebar-modal__input"
                      value={child.note}
                      onChange={(e) => updateChild(index, 'note', e.target.value)}
                      placeholder="메모 (선택, 예: 알레르기 등)"
                      maxLength={100}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="sidebar-modal__actions">
              <button
                className="sidebar-modal__btn sidebar-modal__btn--cancel"
                onClick={() => setStep('code')}
              >
                이전
              </button>
              <button
                className="sidebar-modal__btn sidebar-modal__btn--submit"
                onClick={handleGuardianNext}
                disabled={loading || (isGuardian && !children.some(c => c.name.trim()))}
              >
                다음
              </button>
            </div>
          </>
        )}

        {/* Step 3: 직책 선택 */}
        {step === 'position' && (
          <>
            <h3 className="sidebar-modal__title">{positionLabel} 설정</h3>
            <p className="sidebar-modal__desc">
              <strong>{joinedGroup?.name}</strong> 모임에서 사용할 {positionLabel}을 선택해주세요
            </p>

            {error && <div className="sidebar-modal__error">{error}</div>}

            {joinedGroup?.positions && joinedGroup.positions.length > 0 ? (
              <select
                className="sidebar-modal__select"
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
              >
                <option value="">{positionLabel} 선택</option>
                {joinedGroup.positions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
            ) : (
              <p className="sidebar-modal__info">
                설정된 {positionLabel}이 없습니다. 바로 가입합니다.
              </p>
            )}

            <div className="sidebar-modal__actions">
              <button
                className="sidebar-modal__btn sidebar-modal__btn--cancel"
                onClick={() => setStep(joinedGroup?.allowGuardians ? 'guardian' : 'code')}
              >
                이전
              </button>
              <button
                className="sidebar-modal__btn sidebar-modal__btn--submit"
                onClick={handleComplete}
                disabled={loading || (joinedGroup?.positions && joinedGroup.positions.length > 0 && !selectedPositionId)}
              >
                {loading ? '가입 중...' : '가입하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const { myGroups, myGroupsLoading, fetchMyGroups } = useGroupStore();
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (myGroups.length === 0) {
      fetchMyGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside className="sidebar">
      {/* 상단: 액션 버튼 */}
      <div className="sidebar__top">
        <div className="sidebar__actions">
          <button
            className="sidebar__action-btn"
            onClick={() => setShowInviteModal(true)}
            title="초대 코드 입력"
          >
            <img src={linkIcon} alt="" width="18" height="18" />
            <span>초대 코드</span>
          </button>
          <Link to="/groups/create" className="sidebar__action-btn sidebar__action-btn--primary" title="새 모임 만들기">
            <img src={plusIcon} alt="" width="18" height="18" />
            <span>새 모임</span>
          </Link>
        </div>
      </div>

      {/* 중간: 네비게이션 (스크롤 가능) */}
      <nav className="sidebar__nav">
        {/* 대시보드 */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
          }
        >
          <img src={homeIcon} alt="" className="sidebar__icon" width="20" height="20" />
          <span className="sidebar__label">대시보드</span>
        </NavLink>

        {/* 구분선 */}
        <div className="sidebar__divider" />

        {/* 내 모임 목록 */}
        {myGroupsLoading ? (
          <div className="sidebar__loading">로딩 중...</div>
        ) : myGroups.length === 0 ? (
          <div className="sidebar__empty">
            <span>가입한 모임이 없습니다</span>
          </div>
        ) : (
          myGroups
            .filter((group) => group.id) // id가 있는 그룹만 렌더링
            .map((group) => (
              <GroupMenuItem
                key={group.id}
                groupId={group.id}
                groupName={group.name}
                icon={group.icon}
                color={group.color}
                logoImage={group.logoImage}
                isActive={location.pathname.includes(`/groups/${group.id}`)}
              />
            ))
        )}
      </nav>

      {/* 하단: 설정 (고정) */}
      <div className="sidebar__bottom">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
          }
        >
          <img src={settingsIcon} alt="" className="sidebar__icon" width="20" height="20" />
          <span className="sidebar__label">설정</span>
        </NavLink>
      </div>

      {/* 초대 코드 모달 */}
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
    </aside>
  );
};

export default Sidebar;
