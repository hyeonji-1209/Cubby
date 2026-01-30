import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import 'react-calendar/dist/Calendar.css';
import { QRCodeSVG } from 'qrcode.react';
import { useGroupDetail } from './hooks';
import { GroupDetailHeader, GroupDetailTabs, SubGroupModal, MemberModal, ConfirmModal, MemberApprovalModal } from './components';
import { Modal } from '@/components';
import {
  HomeTab,
  MembersTab,
  SubGroupsTab,
  AnnouncementsTab,
  SchedulesTab,
  PracticeRoomsTab,
  SettingsTab,
  LessonTab,
  LessonManagementTab,
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
    roleLoading,
    memberSearch,
    setMemberSearch,
    filteredMembers,
    // 가입 대기 멤버 (승인 시스템)
    pendingMembers,
    pendingMembersLoading,
    handleApproveMember,
    handleRejectMember,
    // 승인 모달 (1:1 교육용)
    showApprovalModal,
    setShowApprovalModal,
    approvalMember,
    instructors,
    approvalLoading,
    handleApprovalSubmit,
    // 강사별 필터링 (다중 강사 모드)
    instructorFilter,
    setInstructorFilter,
    instructorSubGroups,
    // Invite code
    regeneratingCode,
    // Calendar
    homeCalendarDate,
    setHomeCalendarDate,
    selectedDate,
    // Locations
    favoriteLocations,
    // 1:1 수업 멤버 관리
    showAttendanceStats,
    memberAttendanceStats,
    // 1:1 수업 정보
    showLessonInfo,
    lessonSchedule,
    setLessonSchedule,
    paymentDueDay,
    setPaymentDueDay,
    lessonInfoLoading,
    handleSaveLessonInfo,
    // 수업실 (1:1 교육용)
    lessonRooms,
    // 출석 QR
    showAttendanceQRModal,
    setShowAttendanceQRModal,
    attendanceQRMember,
    attendanceQRSchedule,
    attendanceQRToken,
    attendanceQRLoading,
    openAttendanceQRModal,
    getMemberNextSchedule,
    // 수업 탭 (1:1 교육용)
    openLessonPanel,
    handleEarlyLeave,
    isOneOnOneEducation,
    activeLessonMember,
    selectedLessonMember,
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

  // 수업 관리 탭에서 선택된 강사 ID
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | undefined>(undefined);

  // 수업 관리 탭으로 이동 (강사 ID 선택 포함)
  const handleGoToLessonManagement = (instructorId?: string) => {
    setSelectedInstructorId(instructorId);
    setActiveTab('lesson-management');
  };

  // 선택된 강사의 학생 수 계산
  const selectedInstructorStudentCount = useMemo(() => {
    if (!selectedMember || selectedMember.title !== '강사') return 0;
    const memberUserId = selectedMember.userId || selectedMember.user?.id;
    const subGroup = instructorSubGroups.find(sg => sg.instructorId === memberUserId);
    return subGroup?.memberCount ?? 0;
  }, [selectedMember, instructorSubGroups]);

  // 설정탭으로 이동
  const handleGoToSettings = () => {
    setShowMemberModal(false);
    setActiveTab('settings');
  };

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
        isOwner={isOwner}
        membersCount={members.length}
        subGroupsCount={subGroups.length}
        activeLessonMember={activeLessonMember}
        isInstructorWithStudents={
          // 현재 사용자가 강사이면서 학생이 배정되어 있는지 확인
          isOneOnOneEducation &&
          instructorSubGroups.some(sg => sg.instructorId === user?.id)
        }
      />

      {/* 탭 컨텐츠 */}
      <div className="group-detail__content">
        {activeTab === 'lesson' && groupId && (selectedLessonMember || activeLessonMember) && (
          <LessonTab
            groupId={groupId}
            member={(selectedLessonMember || activeLessonMember)!}
            onEarlyLeave={handleEarlyLeave}
          />
        )}

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
            hasAttendance={currentGroup.hasAttendance}
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
            hasAttendance={currentGroup.hasAttendance}
            onShowAttendanceQR={openAttendanceQRModal}
            getMemberNextSchedule={getMemberNextSchedule}
            isOneOnOneEducation={isOneOnOneEducation}
            onOpenLessonPanel={openLessonPanel}
            hasMultipleInstructors={currentGroup.hasMultipleInstructors}
            instructorSubGroups={instructorSubGroups}
            instructorFilter={instructorFilter}
            setInstructorFilter={setInstructorFilter}
            pendingMembers={pendingMembers}
            pendingMembersLoading={pendingMembersLoading}
            onApproveMember={handleApproveMember}
            onRejectMember={handleRejectMember}
            userId={user?.id}
            onGoToLessonManagement={handleGoToLessonManagement}
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
            groupType={currentGroup.type}
            isAdmin={isAdmin}
            canWriteSchedule={!!canWriteSchedule}
            userId={user?.id}
            favoriteLocations={favoriteLocations}
            hasAttendance={currentGroup.hasAttendance}
          />
        )}

        {activeTab === 'practicerooms' && currentGroup?.type === 'education' && currentGroup?.hasPracticeRooms && groupId && (
          <PracticeRoomsTab
            groupId={groupId}
            currentGroup={currentGroup}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'lesson-management' && isOneOnOneEducation && groupId && (
          <LessonManagementTab
            groupId={groupId}
            isOwner={isOwner}
            isAdmin={isAdmin}
            myRole={myRole}
            userId={user?.id}
            instructorSubGroups={instructorSubGroups}
            members={members}
            onOpenLessonPanel={openLessonPanel}
            initialInstructorId={selectedInstructorId}
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
        roleLoading={roleLoading}
        onUpdateRole={handleUpdateRole}
        onRemoveMember={handleRemoveMember}
        showAttendanceStats={showAttendanceStats}
        attendanceStats={memberAttendanceStats}
        showLessonInfo={showLessonInfo}
        lessonSchedule={lessonSchedule}
        setLessonSchedule={setLessonSchedule}
        paymentDueDay={paymentDueDay}
        setPaymentDueDay={setPaymentDueDay}
        onSaveLessonInfo={handleSaveLessonInfo}
        lessonInfoLoading={lessonInfoLoading}
        lessonRooms={lessonRooms}
        operatingHours={currentGroup.operatingHours}
        instructorStudentCount={selectedInstructorStudentCount}
        onGoToSettings={handleGoToSettings}
        isOwner={isOwner}
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

      {/* 멤버 승인 모달 (1:1 교육용) */}
      <MemberApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        member={approvalMember}
        instructors={instructors}
        lessonRooms={lessonRooms}
        hasMultipleInstructors={currentGroup.hasMultipleInstructors}
        operatingHours={currentGroup.operatingHours}
        onApprove={handleApprovalSubmit}
        loading={approvalLoading}
      />

      {/* 출석 QR 코드 모달 */}
      <Modal
        isOpen={showAttendanceQRModal}
        onClose={() => setShowAttendanceQRModal(false)}
        title="출석 QR 코드"
        size="sm"
      >
        <div className="qr-modal">
          {attendanceQRMember && attendanceQRSchedule && (
            <>
              <div className="qr-modal__member-info">
                <span className="qr-modal__member-name">
                  {attendanceQRMember.nickname || attendanceQRMember.user?.name}
                </span>
                <span className="qr-modal__schedule-title">
                  {attendanceQRSchedule.title}
                </span>
              </div>
              <div className="qr-modal__code">
                {attendanceQRLoading ? (
                  <div className="qr-modal__loading">QR 생성 중...</div>
                ) : attendanceQRToken ? (
                  <QRCodeSVG
                    value={`${window.location.origin}/attendance/checkin?token=${attendanceQRToken.token}`}
                    size={200}
                    level="M"
                    marginSize={2}
                  />
                ) : (
                  <QRCodeSVG
                    value={`${window.location.origin}/groups/${groupId}/attendance/${attendanceQRSchedule.id}?member=${attendanceQRMember.userId || attendanceQRMember.user?.id}`}
                    size={200}
                    level="M"
                    marginSize={2}
                  />
                )}
              </div>
              <p className="qr-modal__hint">
                학생이 이 QR 코드를 스캔하여 출석을 체크합니다.
              </p>
              {attendanceQRToken && (
                <p className="qr-modal__expiry">
                  ⏱️ 수업 종료까지 유효 (스캔 후 무효화)
                </p>
              )}
              <p className="qr-modal__time-info">
                수업 시간: {new Date(attendanceQRSchedule.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                {attendanceQRSchedule.endAt && ` ~ ${new Date(attendanceQRSchedule.endAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default GroupDetailPage;
