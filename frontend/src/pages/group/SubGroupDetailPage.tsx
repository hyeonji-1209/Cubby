import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { subGroupApi, groupApi } from '@/api';
import type { SubGroup, SubGroupRequest, GroupMember } from '@/types';
import './GroupPages.scss';

type TabType = 'home' | 'subgroups' | 'requests' | 'settings';

const SubGroupDetailPage = () => {
  const { groupId, subGroupId } = useParams<{ groupId: string; subGroupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [subGroup, setSubGroup] = useState<SubGroup | null>(null);
  const [childSubGroups, setChildSubGroups] = useState<SubGroup[]>([]);
  const [subGroupRequests, setSubGroupRequests] = useState<SubGroupRequest[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [childrenLoading, setChildrenLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showSubGroupModal, setShowSubGroupModal] = useState(false);

  // 소모임 생성 폼
  const [newSubGroupName, setNewSubGroupName] = useState('');
  const [newSubGroupDesc, setNewSubGroupDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (groupId && subGroupId) {
      fetchData();
    }
  }, [groupId, subGroupId]);

  const fetchData = async () => {
    if (!groupId || !subGroupId) return;

    setLoading(true);
    try {
      // 소모임 정보 조회
      const subGroupRes = await subGroupApi.getById(groupId, subGroupId);
      setSubGroup(subGroupRes.data);

      // 하위 소모임 조회
      await fetchChildSubGroups();

      // 상위 그룹 멤버 조회 (권한 확인용)
      const membersRes = await groupApi.getMembers(groupId);
      setMembers(membersRes.data);
    } catch (error) {
      console.error('Failed to fetch subgroup:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildSubGroups = async () => {
    if (!groupId || !subGroupId) return;

    setChildrenLoading(true);
    try {
      const res = await subGroupApi.getList(groupId, subGroupId);
      setChildSubGroups(res.data);
    } catch (error) {
      console.error('Failed to fetch child subgroups:', error);
    } finally {
      setChildrenLoading(false);
    }
  };

  const fetchSubGroupRequests = async () => {
    if (!groupId) return;

    try {
      const res = await subGroupApi.getRequests(groupId, 'pending');
      // 이 소모임의 하위 요청만 필터링
      const filtered = res.data.filter(r => r.parentSubGroupId === subGroupId);
      setSubGroupRequests(filtered);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  // 권한 확인
  const currentMember = members.find((m) => m.userId === user?.id);
  const isGroupAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const isLeader = subGroup?.leaderId === user?.id;
  const isAdmin = isGroupAdmin || isLeader;

  // 관리자인 경우 승인 요청 조회
  useEffect(() => {
    if (isAdmin && groupId) {
      fetchSubGroupRequests();
    }
  }, [isAdmin, groupId, subGroupId]);

  // 하위 소모임 생성
  const handleCreateSubGroup = async () => {
    if (!groupId || !subGroupId || !newSubGroupName.trim()) return;

    setCreateLoading(true);
    try {
      const result = await subGroupApi.requestCreate(groupId, {
        name: newSubGroupName.trim(),
        description: newSubGroupDesc.trim() || undefined,
        parentSubGroupId: subGroupId,
      });

      if ('status' in result.data && result.data.status === 'pending') {
        alert('소모임 생성 요청이 전송되었습니다. 관리자 승인을 기다려주세요.');
      } else {
        alert('소모임이 생성되었습니다!');
        await fetchChildSubGroups();
      }

      setShowSubGroupModal(false);
      setNewSubGroupName('');
      setNewSubGroupDesc('');
    } catch {
      alert('소모임 생성에 실패했습니다.');
    } finally {
      setCreateLoading(false);
    }
  };

  // 승인/거절 처리
  const handleApproveRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;

    try {
      await subGroupApi.approveRequest(groupId, request.id);
      alert(`"${request.name}" 소모임이 승인되었습니다.`);
      await fetchChildSubGroups();
      await fetchSubGroupRequests();
    } catch {
      alert('승인에 실패했습니다.');
    }
  };

  const handleRejectRequest = async (request: SubGroupRequest) => {
    if (!groupId) return;

    const reason = prompt('거절 사유를 입력하세요 (선택사항):');
    try {
      await subGroupApi.rejectRequest(groupId, request.id, reason || undefined);
      alert('요청이 거절되었습니다.');
      await fetchSubGroupRequests();
    } catch {
      alert('거절에 실패했습니다.');
    }
  };

  // 소모임 클릭
  const handleSubGroupClick = (childSubGroup: SubGroup) => {
    navigate(`/groups/${groupId}/subgroups/${childSubGroup.id}`);
  };

  if (loading) {
    return (
      <div className="subgroup-detail">
        <div className="subgroup-detail__loading">로딩 중...</div>
      </div>
    );
  }

  if (!subGroup) {
    return (
      <div className="subgroup-detail">
        <div className="subgroup-detail__error">
          <p>소모임을 찾을 수 없습니다.</p>
          <Link to={`/groups/${groupId}`}>모임으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const pendingRequestsCount = subGroupRequests.length;

  return (
    <div className="subgroup-detail">
      {/* 브레드크럼 */}
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

      {/* 헤더 */}
      <div className="subgroup-detail__header">
        <div className="subgroup-detail__info">
          {subGroup.coverImage ? (
            <img
              src={subGroup.coverImage}
              alt={subGroup.name}
              className="subgroup-detail__cover"
            />
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
            {subGroup.description && (
              <p className="subgroup-detail__desc">{subGroup.description}</p>
            )}
            {subGroup.leader && (
              <p className="subgroup-detail__leader">리더: {subGroup.leader.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="subgroup-detail__tabs">
        <button
          className={`subgroup-detail__tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          홈
        </button>
        <button
          className={`subgroup-detail__tab ${activeTab === 'subgroups' ? 'active' : ''}`}
          onClick={() => setActiveTab('subgroups')}
        >
          하위 소모임 ({childSubGroups.length})
        </button>
        {isAdmin && (
          <button
            className={`subgroup-detail__tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            승인 요청 {pendingRequestsCount > 0 && <span className="badge">{pendingRequestsCount}</span>}
          </button>
        )}
        <button
          className={`subgroup-detail__tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          설정
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="subgroup-detail__content">
        {/* 홈 탭 */}
        {activeTab === 'home' && (
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
                    <div
                      key={child.id}
                      className="subgroup-card subgroup-card--clickable"
                      onClick={() => handleSubGroupClick(child)}
                    >
                      <div className="subgroup-card__header">
                        <h3 className="subgroup-card__name">{child.name}</h3>
                        <span className={`subgroup-card__status subgroup-card__status--${child.status}`}>
                          {child.status === 'active' ? '활성' : '대기'}
                        </span>
                      </div>
                      {child.description && (
                        <p className="subgroup-card__desc">{child.description}</p>
                      )}
                    </div>
                  ))}
                  {childSubGroups.length > 3 && (
                    <button
                      className="subgroup-detail__view-all"
                      onClick={() => setActiveTab('subgroups')}
                    >
                      전체 보기 ({childSubGroups.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 하위 소모임 탭 */}
        {activeTab === 'subgroups' && (
          <div className="subgroup-detail__subgroups">
            <div className="subgroup-detail__subgroups-header">
              <h2>하위 소모임</h2>
              <button
                className="subgroup-detail__add-btn"
                onClick={() => setShowSubGroupModal(true)}
              >
                + 소모임 만들기
              </button>
            </div>

            {childrenLoading ? (
              <p className="subgroup-detail__loading-text">로딩 중...</p>
            ) : childSubGroups.length === 0 ? (
              <div className="subgroup-detail__empty">
                <p>아직 하위 소모임이 없습니다</p>
                <button onClick={() => setShowSubGroupModal(true)}>
                  첫 소모임 만들기
                </button>
              </div>
            ) : (
              <div className="subgroup-detail__subgroup-list">
                {childSubGroups.map((child) => (
                  <div
                    key={child.id}
                    className="subgroup-card subgroup-card--clickable"
                    onClick={() => handleSubGroupClick(child)}
                  >
                    <div className="subgroup-card__header">
                      <h3 className="subgroup-card__name">{child.name}</h3>
                      <span className={`subgroup-card__status subgroup-card__status--${child.status}`}>
                        {child.status === 'active' ? '활성' : child.status === 'pending' ? '대기' : '비활성'}
                      </span>
                    </div>
                    {child.description && (
                      <p className="subgroup-card__desc">{child.description}</p>
                    )}
                    {child.leader && (
                      <p className="subgroup-card__leader">리더: {child.leader.name}</p>
                    )}
                    <p className="subgroup-card__depth">깊이: {child.depth}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 승인 요청 탭 */}
        {activeTab === 'requests' && isAdmin && (
          <div className="subgroup-detail__requests">
            <h2>소모임 생성 요청</h2>

            {subGroupRequests.length === 0 ? (
              <div className="subgroup-detail__empty">
                <p>대기 중인 요청이 없습니다</p>
              </div>
            ) : (
              <div className="subgroup-detail__request-list">
                {subGroupRequests.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-card__info">
                      <h3 className="request-card__name">{request.name}</h3>
                      {request.description && (
                        <p className="request-card__desc">{request.description}</p>
                      )}
                      <p className="request-card__requester">
                        요청자: {request.requester?.name || '알 수 없음'}
                      </p>
                      <p className="request-card__date">
                        {new Date(request.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="request-card__actions">
                      <button
                        className="request-card__approve"
                        onClick={() => handleApproveRequest(request)}
                      >
                        승인
                      </button>
                      <button
                        className="request-card__reject"
                        onClick={() => handleRejectRequest(request)}
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === 'settings' && (
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

            <div className="subgroup-detail__setting-section">
              <h3>바로가기</h3>
              <Link to={`/groups/${groupId}`} className="subgroup-detail__link">
                상위 모임으로 이동
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 소모임 생성 모달 */}
      {showSubGroupModal && (
        <div className="modal-overlay" onClick={() => setShowSubGroupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">하위 소모임 만들기</h2>
            <p className="modal__desc">
              {isAdmin
                ? '새 소모임이 바로 생성됩니다.'
                : '관리자의 승인 후 소모임이 생성됩니다.'}
            </p>

            <div className="modal__field">
              <label className="modal__label">소모임 이름 *</label>
              <input
                type="text"
                className="modal__input"
                placeholder="예: 찬양팀, 수학반, 개발팀"
                value={newSubGroupName}
                onChange={(e) => setNewSubGroupName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="modal__field">
              <label className="modal__label">설명 (선택)</label>
              <textarea
                className="modal__textarea"
                placeholder="소모임에 대한 간단한 설명"
                value={newSubGroupDesc}
                onChange={(e) => setNewSubGroupDesc(e.target.value)}
                rows={3}
              />
            </div>

            <div className="modal__actions">
              <button
                className="modal__cancel"
                onClick={() => setShowSubGroupModal(false)}
              >
                취소
              </button>
              <button
                className="modal__submit"
                onClick={handleCreateSubGroup}
                disabled={!newSubGroupName.trim() || createLoading}
              >
                {createLoading ? '처리 중...' : isAdmin ? '생성하기' : '요청 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubGroupDetailPage;
