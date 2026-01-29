import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components';
import { subGroupApi } from '@/api/subgroup.api';
import { lessonRoomApi, LessonRoom } from '@/api/lessonRoom.api';
import type { SubGroup, SubGroupRequest, ClassSchedule } from '@/types';

// 브레드크럼
interface BreadcrumbProps {
  groupId: string;
  subGroup: SubGroup;
}

export const Breadcrumb = ({ groupId, subGroup }: BreadcrumbProps) => (
  <div className="subgroup-detail__breadcrumb">
    <Link to={`/groups/${groupId}`}>모임</Link>
    <span className="separator">/</span>
    {subGroup.parentSubGroupId && (
      <>
        <Link to={`/groups/${groupId}/subgroups/${subGroup.parentSubGroupId}`}>
          상위 소모임
        </Link>
        <span className="separator">/</span>
      </>
    )}
    <span className="current">{subGroup.name}</span>
  </div>
);

// 소모임 헤더
interface SubGroupHeaderProps {
  subGroup: SubGroup;
}

export const SubGroupHeader = ({ subGroup }: SubGroupHeaderProps) => (
  <div className="subgroup-detail__header">
    <div className="subgroup-detail__info">
      {subGroup.coverImage ? (
        <img src={subGroup.coverImage} alt={subGroup.name} className="subgroup-detail__cover" />
      ) : (
        <div className="subgroup-detail__cover subgroup-detail__cover--default">
          {subGroup.name.charAt(0)}
        </div>
      )}
      <div className="subgroup-detail__text">
        <h1 className="subgroup-detail__name">{subGroup.name}</h1>
        <span className={`subgroup-detail__status subgroup-detail__status--${subGroup.status}`}>
          {subGroup.status === 'active' ? '활성' : subGroup.status === 'pending' ? '대기' : '비활성'}
        </span>
        {subGroup.description && <p className="subgroup-detail__desc">{subGroup.description}</p>}
        {subGroup.leader && <p className="subgroup-detail__leader">리더: {subGroup.leader.name}</p>}
      </div>
    </div>
  </div>
);

// 탭 네비게이션
interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: 'home' | 'subgroups' | 'requests' | 'settings') => void;
  childSubGroupsCount: number;
  pendingRequestsCount: number;
  isAdmin: boolean;
}

export const TabNavigation = ({ activeTab, onTabChange, childSubGroupsCount, pendingRequestsCount, isAdmin }: TabNavigationProps) => (
  <div className="subgroup-detail__tabs">
    <button
      className={`subgroup-detail__tab ${activeTab === 'home' ? 'active' : ''}`}
      onClick={() => onTabChange('home')}
    >
      홈
    </button>
    <button
      className={`subgroup-detail__tab ${activeTab === 'subgroups' ? 'active' : ''}`}
      onClick={() => onTabChange('subgroups')}
    >
      하위 소모임 ({childSubGroupsCount})
    </button>
    {isAdmin && (
      <button
        className={`subgroup-detail__tab ${activeTab === 'requests' ? 'active' : ''}`}
        onClick={() => onTabChange('requests')}
      >
        승인 요청 {pendingRequestsCount > 0 && <span className="badge">{pendingRequestsCount}</span>}
      </button>
    )}
    <button
      className={`subgroup-detail__tab ${activeTab === 'settings' ? 'active' : ''}`}
      onClick={() => onTabChange('settings')}
    >
      설정
    </button>
  </div>
);

// 소모임 카드
interface SubGroupCardProps {
  subGroup: SubGroup;
  onClick: () => void;
  compact?: boolean;
}

export const SubGroupCard = ({ subGroup, onClick, compact }: SubGroupCardProps) => (
  <div className="subgroup-card subgroup-card--clickable" onClick={onClick}>
    <div className="subgroup-card__header">
      <h3 className="subgroup-card__name">{subGroup.name}</h3>
      <span className={`subgroup-card__status subgroup-card__status--${subGroup.status}`}>
        {subGroup.status === 'active' ? '활성' : subGroup.status === 'pending' ? '대기' : '비활성'}
      </span>
    </div>
    {subGroup.description && <p className="subgroup-card__desc">{subGroup.description}</p>}
    {!compact && (
      <>
        {subGroup.leader && <p className="subgroup-card__leader">리더: {subGroup.leader.name}</p>}
        <p className="subgroup-card__depth">깊이: {subGroup.depth}</p>
      </>
    )}
  </div>
);

// 홈 탭
interface HomeTabContentProps {
  subGroup: SubGroup;
  childSubGroups: SubGroup[];
  onSubGroupClick: (child: SubGroup) => void;
  onViewAll: () => void;
}

export const HomeTabContent = ({ subGroup, childSubGroups, onSubGroupClick, onViewAll }: HomeTabContentProps) => (
  <div className="subgroup-detail__home">
    <div className="subgroup-detail__stats">
      <div className="subgroup-detail__stat">
        <span className="subgroup-detail__stat-value">{childSubGroups.length}</span>
        <span className="subgroup-detail__stat-label">하위 소모임</span>
      </div>
      <div className="subgroup-detail__stat">
        <span className="subgroup-detail__stat-value">{subGroup.depth}</span>
        <span className="subgroup-detail__stat-label">깊이</span>
      </div>
    </div>

    {subGroup.description && (
      <div className="subgroup-detail__section">
        <h2>소개</h2>
        <p>{subGroup.description}</p>
      </div>
    )}

    {childSubGroups.length > 0 && (
      <div className="subgroup-detail__section">
        <h2>하위 소모임</h2>
        <div className="subgroup-detail__children-preview">
          {childSubGroups.slice(0, 3).map((child) => (
            <SubGroupCard key={child.id} subGroup={child} onClick={() => onSubGroupClick(child)} compact />
          ))}
          {childSubGroups.length > 3 && (
            <button className="subgroup-detail__view-all" onClick={onViewAll}>
              전체 보기 ({childSubGroups.length})
            </button>
          )}
        </div>
      </div>
    )}
  </div>
);

// 소모임 목록 탭
interface SubGroupsTabContentProps {
  childSubGroups: SubGroup[];
  childrenLoading: boolean;
  onSubGroupClick: (child: SubGroup) => void;
  onAddClick: () => void;
}

export const SubGroupsTabContent = ({ childSubGroups, childrenLoading, onSubGroupClick, onAddClick }: SubGroupsTabContentProps) => (
  <div className="subgroup-detail__subgroups">
    <div className="subgroup-detail__subgroups-header">
      <h2>하위 소모임</h2>
      <button className="subgroup-detail__add-btn" onClick={onAddClick}>
        + 소모임 만들기
      </button>
    </div>

    {childrenLoading ? (
      <p className="subgroup-detail__loading-text">로딩 중...</p>
    ) : childSubGroups.length === 0 ? (
      <div className="subgroup-detail__empty">
        <p>아직 하위 소모임이 없습니다</p>
        <button onClick={onAddClick}>첫 소모임 만들기</button>
      </div>
    ) : (
      <div className="subgroup-detail__subgroup-list">
        {childSubGroups.map((child) => (
          <SubGroupCard key={child.id} subGroup={child} onClick={() => onSubGroupClick(child)} />
        ))}
      </div>
    )}
  </div>
);

// 요청 목록 탭
interface RequestsTabContentProps {
  requests: SubGroupRequest[];
  onApprove: (request: SubGroupRequest) => void;
  onReject: (request: SubGroupRequest) => void;
}

export const RequestsTabContent = ({ requests, onApprove, onReject }: RequestsTabContentProps) => (
  <div className="subgroup-detail__requests">
    <h2>소모임 생성 요청</h2>

    {requests.length === 0 ? (
      <div className="subgroup-detail__empty">
        <p>대기 중인 요청이 없습니다</p>
      </div>
    ) : (
      <div className="subgroup-detail__request-list">
        {requests.map((request) => (
          <div key={request.id} className="request-card">
            <div className="request-card__info">
              <h3 className="request-card__name">{request.name}</h3>
              {request.description && <p className="request-card__desc">{request.description}</p>}
              <p className="request-card__requester">요청자: {request.requester?.name || '알 수 없음'}</p>
              <p className="request-card__date">{new Date(request.createdAt).toLocaleDateString('ko-KR')}</p>
            </div>
            <div className="request-card__actions">
              <button className="request-card__approve" onClick={() => onApprove(request)}>
                승인
              </button>
              <button className="request-card__reject" onClick={() => onReject(request)}>
                거절
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// 설정 탭
interface SettingsTabContentProps {
  groupId: string;
  subGroup: SubGroup;
  isAdmin: boolean;
  onUpdate?: (updated: SubGroup) => void;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export const SettingsTabContent = ({ groupId, subGroup, isAdmin, onUpdate }: SettingsTabContentProps) => {
  const [lessonRooms, setLessonRooms] = useState<LessonRoom[]>([]);
  const [classSchedule, setClassSchedule] = useState<ClassSchedule[]>(subGroup.classSchedule || []);
  const [lessonRoomId, setLessonRoomId] = useState<string | undefined>(subGroup.lessonRoomId);
  const [saving, setSaving] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // 반(class) 타입인지 확인
  const isClassType = subGroup.type === 'class';

  // 수업실 목록 로드
  useEffect(() => {
    if (isClassType && isAdmin) {
      setLoadingRooms(true);
      lessonRoomApi.getByGroup(groupId)
        .then((res) => {
          if (res.success) {
            setLessonRooms(res.data.filter(r => r.isActive));
          }
        })
        .catch(console.error)
        .finally(() => setLoadingRooms(false));
    }
  }, [groupId, isClassType, isAdmin]);

  // subGroup 변경 시 상태 동기화
  useEffect(() => {
    setClassSchedule(subGroup.classSchedule || []);
    setLessonRoomId(subGroup.lessonRoomId);
  }, [subGroup]);

  const handleAddSchedule = () => {
    setClassSchedule([...classSchedule, { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }]);
  };

  const handleRemoveSchedule = (index: number) => {
    setClassSchedule(classSchedule.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (index: number, field: keyof ClassSchedule, value: number | string) => {
    const updated = [...classSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setClassSchedule(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await subGroupApi.update(groupId, subGroup.id, {
        classSchedule,
        lessonRoomId: lessonRoomId || undefined,
      });
      if (res.success && onUpdate) {
        onUpdate(res.data);
      }
      alert('저장되었습니다.');
    } catch (error) {
      console.error(error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    JSON.stringify(classSchedule) !== JSON.stringify(subGroup.classSchedule || []) ||
    lessonRoomId !== subGroup.lessonRoomId;

  return (
    <div className="subgroup-detail__settings">
      <h2>소모임 설정</h2>

      <div className="subgroup-detail__setting-section">
        <h3>기본 정보</h3>
        <div className="subgroup-detail__setting-item">
          <span className="label">소모임 이름</span>
          <span className="value">{subGroup.name}</span>
        </div>
        <div className="subgroup-detail__setting-item">
          <span className="label">상태</span>
          <span className="value">{subGroup.status === 'active' ? '활성' : '비활성'}</span>
        </div>
        <div className="subgroup-detail__setting-item">
          <span className="label">타입</span>
          <span className="value">
            {subGroup.type === 'class' ? '반' : subGroup.type === 'instructor' ? '강사별' : '일반'}
          </span>
        </div>
        <div className="subgroup-detail__setting-item">
          <span className="label">깊이</span>
          <span className="value">{subGroup.depth}</span>
        </div>
        {subGroup.leader && (
          <div className="subgroup-detail__setting-item">
            <span className="label">리더</span>
            <span className="value">{subGroup.leader.name}</span>
          </div>
        )}
      </div>

      {/* 반 타입일 때만 수업 설정 표시 */}
      {isClassType && isAdmin && (
        <>
          <div className="subgroup-detail__setting-section">
            <h3>수업 시간표</h3>
            <p className="subgroup-detail__setting-desc">
              반의 정규 수업 시간을 설정하세요.
            </p>

            <div className="class-schedule-list">
              {classSchedule.map((schedule, index) => (
                <div key={index} className="class-schedule-item">
                  <select
                    value={schedule.dayOfWeek}
                    onChange={(e) => handleScheduleChange(index, 'dayOfWeek', parseInt(e.target.value))}
                    className="class-schedule-item__day"
                  >
                    {DAY_NAMES.map((day, i) => (
                      <option key={i} value={i}>{day}요일</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                    className="class-schedule-item__time"
                  />
                  <span className="class-schedule-item__separator">~</span>
                  <input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                    className="class-schedule-item__time"
                  />
                  <button
                    type="button"
                    className="class-schedule-item__remove"
                    onClick={() => handleRemoveSchedule(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="subgroup-detail__add-schedule-btn"
              onClick={handleAddSchedule}
            >
              + 수업 시간 추가
            </button>
          </div>

          <div className="subgroup-detail__setting-section">
            <h3>수업실 배정</h3>
            <p className="subgroup-detail__setting-desc">
              이 반이 사용하는 수업실을 선택하세요.
            </p>

            {loadingRooms ? (
              <p className="subgroup-detail__loading-text">수업실 로딩 중...</p>
            ) : lessonRooms.length === 0 ? (
              <p className="subgroup-detail__empty-text">등록된 수업실이 없습니다.</p>
            ) : (
              <select
                value={lessonRoomId || ''}
                onChange={(e) => setLessonRoomId(e.target.value || undefined)}
                className="subgroup-detail__room-select"
              >
                <option value="">수업실 선택</option>
                {lessonRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} (정원: {room.capacity}명)
                  </option>
                ))}
              </select>
            )}
          </div>

          {hasChanges && (
            <div className="subgroup-detail__save-section">
              <button
                className="subgroup-detail__save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '변경사항 저장'}
              </button>
            </div>
          )}
        </>
      )}

      <div className="subgroup-detail__setting-section">
        <h3>바로가기</h3>
        <Link to={`/groups/${groupId}`} className="subgroup-detail__link">
          상위 모임으로 이동
        </Link>
      </div>
    </div>
  );
};

// 소모임 생성 모달
interface CreateSubGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  desc: string;
  onNameChange: (value: string) => void;
  onDescChange: (value: string) => void;
  onSubmit: () => void;
  isAdmin: boolean;
  isLoading: boolean;
}

export const CreateSubGroupModal = ({
  isOpen,
  onClose,
  name,
  desc,
  onNameChange,
  onDescChange,
  onSubmit,
  isAdmin,
  isLoading,
}: CreateSubGroupModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="하위 소모임 만들기"
    description={isAdmin ? '새 소모임이 바로 생성됩니다.' : '관리자의 승인 후 소모임이 생성됩니다.'}
    actions={
      <>
        <button className="modal__cancel" onClick={onClose}>
          취소
        </button>
        <button
          className="modal__submit"
          onClick={onSubmit}
          disabled={!name.trim() || isLoading}
        >
          {isLoading ? '처리 중...' : isAdmin ? '생성하기' : '요청 보내기'}
        </button>
      </>
    }
  >
    <div className="modal__field">
      <label className="modal__label">소모임 이름 *</label>
      <input
        type="text"
        className="modal__input"
        placeholder="예: 찬양팀, 수학반, 개발팀"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        maxLength={100}
      />
    </div>

    <div className="modal__field">
      <label className="modal__label">설명 (선택)</label>
      <textarea
        className="modal__textarea"
        placeholder="소모임에 대한 간단한 설명"
        value={desc}
        onChange={(e) => onDescChange(e.target.value)}
        rows={3}
      />
    </div>
  </Modal>
);
