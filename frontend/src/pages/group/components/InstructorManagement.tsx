import { useState, useEffect, useCallback } from 'react';
import { subgroupMemberApi } from '@/api';
import type { InstructorSubGroup, SubGroupMemberInfo, UnassignedStudent } from '@/api';
import type { GroupMember } from '@/types';
import { useToast } from '@/components/common';
import './InstructorManagement.scss';

interface InstructorManagementProps {
  groupId: string;
  members: GroupMember[]; // admin 멤버들 (강사 후보)
  onUpdate?: () => void;
}

const InstructorManagement: React.FC<InstructorManagementProps> = ({
  groupId,
  members,
  onUpdate,
}) => {
  const toast = useToast();

  // 상태
  const [instructorSubGroups, setInstructorSubGroups] = useState<InstructorSubGroup[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<UnassignedStudent[]>([]);
  const [selectedSubGroup, setSelectedSubGroup] = useState<string | null>(null);
  const [subGroupMembers, setSubGroupMembers] = useState<SubGroupMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // 강사 후보 (title이 '강사'이거나 owner)
  const instructorCandidates = members.filter(
    (m) => m.title === '강사' || m.role === 'owner'
  );

  // 강사 소그룹 목록 조회
  const fetchInstructorSubGroups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await subgroupMemberApi.getInstructorSubGroups(groupId);
      if (response.success) {
        setInstructorSubGroups(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch instructor subgroups:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // 미배정 학생 조회
  const fetchUnassignedStudents = useCallback(async () => {
    try {
      const response = await subgroupMemberApi.getUnassignedStudents(groupId);
      if (response.success) {
        setUnassignedStudents(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch unassigned students:', error);
    }
  }, [groupId]);

  // 소그룹 멤버 조회
  const fetchSubGroupMembers = useCallback(async (subGroupId: string) => {
    setMembersLoading(true);
    try {
      const response = await subgroupMemberApi.getSubGroupMembers(groupId, subGroupId);
      if (response.success) {
        setSubGroupMembers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch subgroup members:', error);
    } finally {
      setMembersLoading(false);
    }
  }, [groupId]);

  // 초기 로드
  useEffect(() => {
    fetchInstructorSubGroups();
    fetchUnassignedStudents();
  }, [fetchInstructorSubGroups, fetchUnassignedStudents]);

  // 소그룹 선택 시 멤버 로드
  useEffect(() => {
    if (selectedSubGroup) {
      fetchSubGroupMembers(selectedSubGroup);
    } else {
      setSubGroupMembers([]);
    }
  }, [selectedSubGroup, fetchSubGroupMembers]);

  // 강사 소그룹 생성
  const handleCreateInstructorSubGroup = async (instructorId: string) => {
    try {
      const response = await subgroupMemberApi.createInstructorSubGroup(groupId, {
        instructorId,
      });
      if (response.success) {
        toast.success('강사 소그룹이 생성되었습니다');
        fetchInstructorSubGroups();
        onUpdate?.();
      }
    } catch (error) {
      toast.error('강사 소그룹 생성에 실패했습니다');
    }
  };

  // 학생 배정
  const handleAssignStudent = async (memberId: string) => {
    if (!selectedSubGroup) return;

    try {
      const response = await subgroupMemberApi.assignStudent(groupId, selectedSubGroup, memberId);
      if (response.success) {
        toast.success('학생이 배정되었습니다');
        fetchSubGroupMembers(selectedSubGroup);
        fetchUnassignedStudents();
        // 소그룹 목록도 갱신 (멤버 수 변경)
        fetchInstructorSubGroups();
        onUpdate?.();
      }
    } catch (error) {
      toast.error('학생 배정에 실패했습니다');
    }
  };

  // 학생 제거
  const handleRemoveStudent = async (memberId: string) => {
    if (!selectedSubGroup) return;

    try {
      const response = await subgroupMemberApi.removeStudent(groupId, selectedSubGroup, memberId);
      if (response.success) {
        toast.success('학생이 제거되었습니다');
        fetchSubGroupMembers(selectedSubGroup);
        fetchUnassignedStudents();
        fetchInstructorSubGroups();
        onUpdate?.();
      }
    } catch (error) {
      toast.error('학생 제거에 실패했습니다');
    }
  };

  // 소그룹이 없는 강사 목록
  const instructorsWithoutSubGroup = instructorCandidates.filter(
    (instructor) => !instructorSubGroups.some((sg) => sg.instructorId === instructor.userId)
  );

  const selectedSubGroupData = instructorSubGroups.find((sg) => sg.id === selectedSubGroup);

  return (
    <div className="instructor-management">
      <div className="instructor-management__header">
        <h3>강사별 학생 관리</h3>
        <p className="instructor-management__desc">
          강사별로 담당 학생을 배정하여 수업 기록을 관리할 수 있습니다
        </p>
      </div>

      <div className="instructor-management__content">
        {/* 강사 소그룹 목록 */}
        <div className="instructor-management__instructors">
          <div className="instructor-management__section-header">
            <h4>강사 목록</h4>
          </div>

          {loading ? (
            <p className="instructor-management__loading">로딩 중...</p>
          ) : (
            <>
              {instructorSubGroups.map((sg) => (
                <div
                  key={sg.id}
                  className={`instructor-management__instructor-card ${selectedSubGroup === sg.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSubGroup(sg.id)}
                >
                  <div className="instructor-management__instructor-info">
                    {sg.instructor?.profileImage ? (
                      <img
                        src={sg.instructor.profileImage}
                        alt={sg.instructor.name}
                        className="instructor-management__instructor-avatar"
                      />
                    ) : (
                      <div className="instructor-management__instructor-avatar instructor-management__instructor-avatar--placeholder">
                        {sg.instructor?.name.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="instructor-management__instructor-details">
                      <span className="instructor-management__instructor-name">
                        {sg.name}
                      </span>
                      <span className="instructor-management__instructor-count">
                        학생 {sg.memberCount}명
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 소그룹 미생성 강사 */}
              {instructorsWithoutSubGroup.length > 0 && (
                <div className="instructor-management__unassigned-instructors">
                  <p className="instructor-management__unassigned-label">소그룹 미생성</p>
                  {instructorsWithoutSubGroup.map((instructor) => (
                    <div
                      key={instructor.id}
                      className="instructor-management__instructor-card instructor-management__instructor-card--inactive"
                    >
                      <div className="instructor-management__instructor-info">
                        {instructor.user.profileImage ? (
                          <img
                            src={instructor.user.profileImage}
                            alt={instructor.user.name}
                            className="instructor-management__instructor-avatar"
                          />
                        ) : (
                          <div className="instructor-management__instructor-avatar instructor-management__instructor-avatar--placeholder">
                            {(instructor.nickname || instructor.user.name).charAt(0)}
                          </div>
                        )}
                        <span className="instructor-management__instructor-name">
                          {instructor.nickname || instructor.user.name}
                        </span>
                      </div>
                      <button
                        className="instructor-management__create-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateInstructorSubGroup(instructor.userId);
                        }}
                      >
                        소그룹 생성
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {instructorSubGroups.length === 0 && instructorsWithoutSubGroup.length === 0 && (
                <p className="instructor-management__empty">
                  강사(관리자)가 없습니다.<br />
                  멤버를 관리자로 지정해주세요.
                </p>
              )}
            </>
          )}
        </div>

        {/* 학생 배정 영역 */}
        <div className="instructor-management__students">
          {selectedSubGroup ? (
            <>
              <div className="instructor-management__section-header">
                <h4>{selectedSubGroupData?.name} 학생</h4>
              </div>

              {/* 배정된 학생 목록 */}
              <div className="instructor-management__assigned">
                <p className="instructor-management__list-label">배정된 학생</p>
                {membersLoading ? (
                  <p className="instructor-management__loading">로딩 중...</p>
                ) : (
                  <>
                    {subGroupMembers
                      .filter((m) => m.role === 'member')
                      .map((m) => (
                        <div key={m.id} className="instructor-management__student-card">
                          <div className="instructor-management__student-info">
                            {m.groupMember?.user.profileImage ? (
                              <img
                                src={m.groupMember.user.profileImage}
                                alt={m.groupMember.user.name}
                                className="instructor-management__student-avatar"
                              />
                            ) : (
                              <div className="instructor-management__student-avatar instructor-management__student-avatar--placeholder">
                                {(m.groupMember?.nickname || m.groupMember?.user.name || '?').charAt(0)}
                              </div>
                            )}
                            <span className="instructor-management__student-name">
                              {m.groupMember?.nickname || m.groupMember?.user.name}
                            </span>
                          </div>
                          <button
                            className="instructor-management__remove-btn"
                            onClick={() => handleRemoveStudent(m.groupMemberId)}
                          >
                            제거
                          </button>
                        </div>
                      ))}
                    {subGroupMembers.filter((m) => m.role === 'member').length === 0 && (
                      <p className="instructor-management__empty-small">배정된 학생이 없습니다</p>
                    )}
                  </>
                )}
              </div>

              {/* 미배정 학생 목록 */}
              <div className="instructor-management__unassigned">
                <p className="instructor-management__list-label">미배정 학생</p>
                {unassignedStudents.length === 0 ? (
                  <p className="instructor-management__empty-small">모든 학생이 배정되었습니다</p>
                ) : (
                  unassignedStudents.map((student) => (
                    <div key={student.id} className="instructor-management__student-card">
                      <div className="instructor-management__student-info">
                        {student.user.profileImage ? (
                          <img
                            src={student.user.profileImage}
                            alt={student.user.name}
                            className="instructor-management__student-avatar"
                          />
                        ) : (
                          <div className="instructor-management__student-avatar instructor-management__student-avatar--placeholder">
                            {(student.nickname || student.user.name).charAt(0)}
                          </div>
                        )}
                        <span className="instructor-management__student-name">
                          {student.nickname || student.user.name}
                        </span>
                      </div>
                      <button
                        className="instructor-management__assign-btn"
                        onClick={() => handleAssignStudent(student.id)}
                      >
                        배정
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="instructor-management__placeholder">
              <p>왼쪽에서 강사를 선택하면<br />학생을 배정할 수 있습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorManagement;
