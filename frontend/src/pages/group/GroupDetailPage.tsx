import { Link } from 'react-router-dom';
import 'react-calendar/dist/Calendar.css';
import { useGroupDetail } from './hooks';
import { GroupDetailHeader, GroupDetailTabs, SubGroupModal, MemberModal, ConfirmModal } from './components';
import {
  HomeTab,
  MembersTab,
  SubGroupsTab,
  AnnouncementsTab,
  SchedulesTab,
  PracticeRoomsTab,
  SettingsTab,
} from './tabs';
import './GroupPages.scss';

const GroupDetailPage = () => {
  const {
    // IDs & Navigation
    groupId,
    user,
    // Group data
    currentGroup,
    currentGroupLoading,
    members,
    membersLoading,
    subGroups,
    subGroupsLoading,
    subGroupRequests,
    // Permissions
    currentMember,
    myRole,
    isOwner,
    isAdmin,
    memberCount,
    canWriteAnnouncement,
    canWriteSchedule,
    // Tab state
    activeTab,
    setActiveTab,
    // Modal states
    showLeaveModal,
    setShowLeaveModal,
    showDeleteModal,
    setShowDeleteModal,
    showSubGroupModal,
    setShowSubGroupModal,
    showMemberModal,
    setShowMemberModal,
    selectedMember,
    // SubGroup form
    subGroupName,
    setSubGroupName,
    subGroupDesc,
    setSubGroupDesc,
    subGroupLoading,
    // Member management
    newRole,
    setNewRole,
    roleLoading,
    memberSearch,
    setMemberSearch,
    filteredMembers,
    // Invite code
    regeneratingCode,
    // Calendar
    homeCalendarDate,
    setHomeCalendarDate,
    selectedDate,
    // Locations
    favoriteLocations,
    // Handlers
    handleLeaveGroup,
    handleDeleteGroup,
    copyInviteCode,
    isInviteCodeExpired,
    formatExpiryDate,
    handleRegenerateInviteCode,
    handleCreateSubGroup,
    handleApproveRequest,
    handleRejectRequest,
    openMemberModal,
    handleUpdateRole,
    handleRemoveMember,
  } = useGroupDetail();

  if (currentGroupLoading) {
    return (
      <div className="group-detail">
        <div className="group-detail__loading">로딩 중...</div>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="group-detail">
        <div className="group-detail__error">
          <p>모임을 찾을 수 없습니다.</p>
          <Link to="/groups">모임 목록으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group-detail">
      {/* 헤더 */}
      <GroupDetailHeader
        currentGroup={currentGroup}
        currentMember={currentMember}
        user={user}
        isOwner={isOwner}
        onCopyInviteCode={copyInviteCode}
      />

      {/* 탭 네비게이션 */}
      <GroupDetailTabs
        currentGroup={currentGroup}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        membersCount={members.length}
        subGroupsCount={subGroups.length}
      />

      {/* 탭 컨텐츠 */}
      <div className="group-detail__content">
        {activeTab === 'home' && groupId && (
          <HomeTab
            groupId={groupId}
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            homeCalendarDate={homeCalendarDate}
            setHomeCalendarDate={setHomeCalendarDate}
            selectedDate={selectedDate}
            regeneratingCode={regeneratingCode}
            onCopyInviteCode={copyInviteCode}
            onRegenerateInviteCode={handleRegenerateInviteCode}
            onNavigateToTab={setActiveTab}
            formatExpiryDate={formatExpiryDate}
            isInviteCodeExpired={isInviteCodeExpired}
          />
        )}

        {activeTab === 'members' && isAdmin && groupId && (
          <MembersTab
            groupId={groupId}
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            members={members}
            membersLoading={membersLoading}
            memberSearch={memberSearch}
            setMemberSearch={setMemberSearch}
            filteredMembers={filteredMembers}
            onOpenMemberModal={openMemberModal}
          />
        )}

        {activeTab === 'subgroups' && isAdmin && groupId && (
          <SubGroupsTab
            groupId={groupId}
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            subGroups={subGroups}
            subGroupsLoading={subGroupsLoading}
            subGroupRequests={subGroupRequests}
            onShowSubGroupModal={() => setShowSubGroupModal(true)}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
          />
        )}

        {activeTab === 'announcements' && groupId && (
          <AnnouncementsTab
            groupId={groupId}
            isAdmin={isAdmin}
            canWriteAnnouncement={!!canWriteAnnouncement}
            subGroupRequests={subGroupRequests}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
          />
        )}

        {activeTab === 'schedules' && groupId && (
          <SchedulesTab
            groupId={groupId}
            isAdmin={isAdmin}
            canWriteSchedule={!!canWriteSchedule}
            userId={user?.id}
            favoriteLocations={favoriteLocations}
          />
        )}

        {activeTab === 'practicerooms' && currentGroup?.type === 'education' && currentGroup?.hasPracticeRooms && groupId && (
          <PracticeRoomsTab
            groupId={groupId}
            currentGroup={currentGroup}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'settings' && groupId && (
          <SettingsTab
            groupId={groupId}
            currentGroup={currentGroup}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            members={members}
            memberCount={memberCount}
            onShowLeaveModal={() => setShowLeaveModal(true)}
            onShowDeleteModal={() => setShowDeleteModal(true)}
          />
        )}
      </div>

      {/* 모달들 */}
      <SubGroupModal
        isOpen={showSubGroupModal}
        onClose={() => setShowSubGroupModal(false)}
        currentGroup={currentGroup}
        isAdmin={isAdmin}
        subGroupName={subGroupName}
        setSubGroupName={setSubGroupName}
        subGroupDesc={subGroupDesc}
        setSubGroupDesc={setSubGroupDesc}
        subGroupLoading={subGroupLoading}
        onSubmit={handleCreateSubGroup}
      />

      <MemberModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        selectedMember={selectedMember}
        newRole={newRole}
        setNewRole={setNewRole}
        roleLoading={roleLoading}
        onUpdateRole={handleUpdateRole}
        onRemoveMember={handleRemoveMember}
      />

      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="모임 나가기"
        description={`정말 ${currentGroup.name} 모임을 나가시겠습니까?`}
        confirmText="나가기"
        onConfirm={handleLeaveGroup}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="모임 삭제"
        description={`정말 ${currentGroup.name} 모임을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        onConfirm={handleDeleteGroup}
      />
    </div>
  );
};

export default GroupDetailPage;
