import { useState, useCallback } from 'react';
import type { GroupMember } from '@/types';

/**
 * 그룹 상세 페이지의 모달 상태 관리 훅
 */
export const useGroupModals = () => {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubGroupModal, setShowSubGroupModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  // 승인 모달 (1:1 교육용)
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalMember, setApprovalMember] = useState<GroupMember | null>(null);

  // 출석 QR 모달
  const [showAttendanceQRModal, setShowAttendanceQRModal] = useState(false);
  const [attendanceQRMember, setAttendanceQRMember] = useState<GroupMember | null>(null);

  // 수업 패널 (1:1 교육용)
  const [showLessonPanel, setShowLessonPanel] = useState(false);
  const [lessonPanelMember, setLessonPanelMember] = useState<GroupMember | null>(null);

  const openMemberModal = useCallback((member: GroupMember) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  }, []);

  const closeMemberModal = useCallback(() => {
    setSelectedMember(null);
    setShowMemberModal(false);
  }, []);

  const openApprovalModal = useCallback((member: GroupMember) => {
    setApprovalMember(member);
    setShowApprovalModal(true);
  }, []);

  const closeApprovalModal = useCallback(() => {
    setApprovalMember(null);
    setShowApprovalModal(false);
  }, []);

  const openLessonPanel = useCallback((member: GroupMember) => {
    setLessonPanelMember(member);
    setShowLessonPanel(true);
  }, []);

  const closeLessonPanel = useCallback(() => {
    setLessonPanelMember(null);
    setShowLessonPanel(false);
  }, []);

  return {
    // Leave/Delete
    showLeaveModal,
    setShowLeaveModal,
    showDeleteModal,
    setShowDeleteModal,
    // SubGroup
    showSubGroupModal,
    setShowSubGroupModal,
    // Member
    showMemberModal,
    setShowMemberModal,
    selectedMember,
    setSelectedMember,
    openMemberModal,
    closeMemberModal,
    // Approval
    showApprovalModal,
    setShowApprovalModal,
    approvalMember,
    setApprovalMember,
    openApprovalModal,
    closeApprovalModal,
    // Attendance QR
    showAttendanceQRModal,
    setShowAttendanceQRModal,
    attendanceQRMember,
    setAttendanceQRMember,
    // Lesson Panel
    showLessonPanel,
    setShowLessonPanel,
    lessonPanelMember,
    setLessonPanelMember,
    openLessonPanel,
    closeLessonPanel,
  };
};

export type GroupModalsState = ReturnType<typeof useGroupModals>;
