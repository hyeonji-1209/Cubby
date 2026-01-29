import { useParams, Link } from 'react-router-dom';
import { useSubGroupDetail } from './hooks';
import {
  Breadcrumb,
  SubGroupHeader,
  TabNavigation,
  HomeTabContent,
  SubGroupsTabContent,
  RequestsTabContent,
  SettingsTabContent,
  CreateSubGroupModal,
} from './components';
import './GroupPages.scss';

const SubGroupDetailPage = () => {
  const { groupId, subGroupId } = useParams<{ groupId: string; subGroupId: string }>();
  const { state, actions, computed } = useSubGroupDetail({ groupId, subGroupId });

  const {
    subGroup,
    childSubGroups,
    subGroupRequests,
    loading,
    childrenLoading,
    activeTab,
    showSubGroupModal,
    newSubGroupName,
    newSubGroupDesc,
    createLoading,
  } = state;

  const {
    setActiveTab,
    setShowSubGroupModal,
    setNewSubGroupName,
    setNewSubGroupDesc,
    handleCreateSubGroup,
    handleApproveRequest,
    handleRejectRequest,
    handleSubGroupClick,
    updateSubGroup,
  } = actions;

  const { isAdmin, pendingRequestsCount } = computed;

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

  return (
    <div className="subgroup-detail">
      <Breadcrumb groupId={groupId!} subGroup={subGroup} />
      <SubGroupHeader subGroup={subGroup} />

      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        childSubGroupsCount={childSubGroups.length}
        pendingRequestsCount={pendingRequestsCount}
        isAdmin={isAdmin}
      />

      <div className="subgroup-detail__content">
        {activeTab === 'home' && (
          <HomeTabContent
            subGroup={subGroup}
            childSubGroups={childSubGroups}
            onSubGroupClick={handleSubGroupClick}
            onViewAll={() => setActiveTab('subgroups')}
          />
        )}

        {activeTab === 'subgroups' && (
          <SubGroupsTabContent
            childSubGroups={childSubGroups}
            childrenLoading={childrenLoading}
            onSubGroupClick={handleSubGroupClick}
            onAddClick={() => setShowSubGroupModal(true)}
          />
        )}

        {activeTab === 'requests' && isAdmin && (
          <RequestsTabContent
            requests={subGroupRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTabContent
            groupId={groupId!}
            subGroup={subGroup}
            isAdmin={isAdmin}
            onUpdate={updateSubGroup}
          />
        )}
      </div>

      <CreateSubGroupModal
        isOpen={showSubGroupModal}
        onClose={() => setShowSubGroupModal(false)}
        name={newSubGroupName}
        desc={newSubGroupDesc}
        onNameChange={setNewSubGroupName}
        onDescChange={setNewSubGroupDesc}
        onSubmit={handleCreateSubGroup}
        isAdmin={isAdmin}
        isLoading={createLoading}
      />
    </div>
  );
};

export default SubGroupDetailPage;
