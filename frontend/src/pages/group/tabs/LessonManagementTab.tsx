import { useState, useEffect, useCallback, useMemo } from 'react';
import { lessonRecordApi, subgroupMemberApi } from '@/api';
import { EmptyState } from '@/components';
import type { GroupMember, LessonSchedule } from '@/types';
import type { InstructorSubGroup, SubGroupMemberInfo } from '@/api/subgroupMember.api';
import type { LessonRecord } from '@/api/lessonRecord.api';
import { DAYS_OF_WEEK } from '@/constants/labels';
import './LessonManagementTab.scss';

interface StudentSummary {
  memberId: string;
  userId: string;
  name: string;
  profileImage?: string;
  instructorId?: string;
  instructorName?: string;
  lessonSchedule?: LessonSchedule[];
  lastLessonDate?: string;
  lastLessonContent?: string;
  hasHomework: boolean;
  totalLessons: number;
  groupMember?: GroupMember;
}

interface LessonManagementTabProps {
  groupId: string;
  isOwner: boolean;
  isAdmin: boolean;
  myRole?: string;
  userId?: string;
  instructorSubGroups: InstructorSubGroup[];
  members: GroupMember[];
  onOpenLessonPanel: (member: GroupMember) => void;
  initialInstructorId?: string;
}

const LessonManagementTab = ({
  groupId,
  isOwner,
  userId,
  instructorSubGroups,
  members,
  onOpenLessonPanel,
  initialInstructorId,
}: LessonManagementTabProps) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(
    initialInstructorId || null
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['unassigned']));
  const [studentsByInstructor, setStudentsByInstructor] = useState<Record<string, StudentSummary[]>>({});
  const [unassignedStudents, setUnassignedStudents] = useState<StudentSummary[]>([]);

  // 현재 사용자가 강사인지 확인 (title로 판단)
  const isInstructor = useMemo(() => {
    const currentMember = members.find(m => m.userId === userId || m.user?.id === userId);
    return currentMember?.title === '강사';
  }, [members, userId]);

  // 강사의 소그룹 찾기
  const myInstructorSubGroup = useMemo(() => {
    if (!isInstructor || !userId) return null;
    return instructorSubGroups.find(sg => sg.instructorId === userId);
  }, [isInstructor, userId, instructorSubGroups]);

  // 섹션 토글
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // 강사 선택
  const handleSelectInstructor = (instructorId: string | null) => {
    setSelectedInstructorId(instructorId);
    if (instructorId) {
      setExpandedSections(prev => new Set([...prev, instructorId]));
    }
  };

  // 학생 데이터 로드
  const loadStudents = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const studentMap: Record<string, StudentSummary[]> = {};
      const unassigned: StudentSummary[] = [];

      if (isInstructor && myInstructorSubGroup) {
        // 강사: 본인 소그룹의 학생만 조회
        const membersResponse = await subgroupMemberApi.getSubGroupMembers(groupId, myInstructorSubGroup.id);
        const subGroupMembers = membersResponse.data || [];

        const students = subGroupMembers
          .filter((m: SubGroupMemberInfo) => m.role === 'member')
          .map((m: SubGroupMemberInfo) => ({
            memberId: m.groupMemberId,
            userId: m.groupMember?.userId || m.groupMember?.user?.id || '',
            name: m.groupMember?.nickname || m.groupMember?.user?.name || '학생',
            profileImage: m.groupMember?.user?.profileImage,
            lessonSchedule: m.groupMember?.lessonSchedule,
            lastLessonDate: undefined,
            lastLessonContent: undefined,
            hasHomework: false,
            totalLessons: 0,
            groupMember: m.groupMember as GroupMember,
          }));

        studentMap[userId!] = students;
        setSelectedInstructorId(userId!);
      } else if (isOwner) {
        // 원장: 모든 학생 조회 및 강사별 분류
        const studentMembers = members.filter(m => m.role === 'member');

        // 각 강사의 학생 목록 조회
        for (const subGroup of instructorSubGroups) {
          try {
            const membersResponse = await subgroupMemberApi.getSubGroupMembers(groupId, subGroup.id);
            const subGroupMembers = membersResponse.data || [];

            studentMap[subGroup.instructorId] = subGroupMembers
              .filter((m: SubGroupMemberInfo) => m.role === 'member')
              .map((m: SubGroupMemberInfo) => ({
                memberId: m.groupMemberId,
                userId: m.groupMember?.userId || m.groupMember?.user?.id || '',
                name: m.groupMember?.nickname || m.groupMember?.user?.name || '학생',
                profileImage: m.groupMember?.user?.profileImage,
                instructorId: subGroup.instructorId,
                instructorName: subGroup.instructor?.name,
                lessonSchedule: m.groupMember?.lessonSchedule,
                lastLessonDate: undefined,
                lastLessonContent: undefined,
                hasHomework: false,
                totalLessons: 0,
                groupMember: m.groupMember as GroupMember,
              }));
          } catch {
            studentMap[subGroup.instructorId] = [];
          }
        }

        // 배정된 학생 ID 목록
        const assignedStudentIds = new Set(
          Object.values(studentMap).flat().map(s => s.memberId)
        );

        // 미배정 학생
        for (const member of studentMembers) {
          if (!assignedStudentIds.has(member.id)) {
            unassigned.push({
              memberId: member.id,
              userId: member.userId || member.user?.id || '',
              name: member.nickname || member.user?.name || '학생',
              profileImage: member.user?.profileImage,
              lessonSchedule: member.lessonSchedule,
              lastLessonDate: undefined,
              lastLessonContent: undefined,
              hasHomework: false,
              totalLessons: 0,
              groupMember: member,
            });
          }
        }
      }

      // 각 학생의 최근 수업 기록 조회
      const allStudents = [...Object.values(studentMap).flat(), ...unassigned];
      const studentsWithRecords = await Promise.all(
        allStudents.map(async (student) => {
          try {
            const recordsResponse = await lessonRecordApi.getByMember(groupId, student.memberId, { limit: 1 });
            if (recordsResponse.success && recordsResponse.data?.items?.length > 0) {
              const lastRecord: LessonRecord = recordsResponse.data.items[0];
              return {
                ...student,
                lastLessonDate: lastRecord.lessonDate,
                lastLessonContent: lastRecord.currentContent,
                hasHomework: !!lastRecord.homework,
                totalLessons: recordsResponse.data.total,
              };
            }
          } catch {
            // 에러 무시
          }
          return student;
        })
      );

      // 다시 분류
      const updatedMap: Record<string, StudentSummary[]> = {};
      const updatedUnassigned: StudentSummary[] = [];

      for (const student of studentsWithRecords) {
        if (student.instructorId) {
          if (!updatedMap[student.instructorId]) {
            updatedMap[student.instructorId] = [];
          }
          updatedMap[student.instructorId].push(student);
        } else if (Object.keys(studentMap).some(id =>
          studentMap[id].some(s => s.memberId === student.memberId)
        )) {
          const instructorId = Object.keys(studentMap).find(id =>
            studentMap[id].some(s => s.memberId === student.memberId)
          );
          if (instructorId) {
            if (!updatedMap[instructorId]) {
              updatedMap[instructorId] = [];
            }
            updatedMap[instructorId].push(student);
          }
        } else {
          updatedUnassigned.push(student);
        }
      }

      setStudentsByInstructor(updatedMap);
      setUnassignedStudents(updatedUnassigned);

      // 초기 선택 설정
      if (initialInstructorId) {
        setSelectedInstructorId(initialInstructorId);
        setExpandedSections(new Set([initialInstructorId]));
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, isInstructor, isOwner, myInstructorSubGroup, members, instructorSubGroups, userId, initialInstructorId]);

  // 초기 로드
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // 선택된 강사의 학생 목록 (검색 필터 적용)
  const displayedStudents = useMemo(() => {
    let students: StudentSummary[] = [];

    if (selectedInstructorId === 'unassigned') {
      students = unassignedStudents;
    } else if (selectedInstructorId) {
      students = studentsByInstructor[selectedInstructorId] || [];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      students = students.filter(s => s.name.toLowerCase().includes(query));
    }

    return students;
  }, [selectedInstructorId, studentsByInstructor, unassignedStudents, searchQuery]);

  // 수업 일정 포맷팅
  const formatSchedule = (schedule?: LessonSchedule[]) => {
    if (!schedule || schedule.length === 0) return '-';
    return schedule
      .map(s => `${DAYS_OF_WEEK[s.dayOfWeek]} ${s.startTime.slice(0, 5)}`)
      .join(', ');
  };

  // 날짜 포맷팅
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 학생 클릭 핸들러
  const handleStudentClick = (student: StudentSummary) => {
    if (student.groupMember) {
      onOpenLessonPanel(student.groupMember);
    }
  };

  // 선택된 강사 정보
  const selectedInstructorInfo = useMemo(() => {
    if (selectedInstructorId === 'unassigned') {
      return { name: '미배정 학생', count: unassignedStudents.length };
    }
    const subGroup = instructorSubGroups.find(sg => sg.instructorId === selectedInstructorId);
    const students = studentsByInstructor[selectedInstructorId || ''] || [];
    return {
      name: subGroup?.instructor?.name || '강사',
      count: students.length,
    };
  }, [selectedInstructorId, instructorSubGroups, studentsByInstructor, unassignedStudents]);

  // 전체 학생 수
  const totalStudentCount = useMemo(() => {
    return Object.values(studentsByInstructor).flat().length + unassignedStudents.length;
  }, [studentsByInstructor, unassignedStudents]);

  if (loading) {
    return (
      <div className="lesson-management">
        <div className="lesson-management__loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="lesson-management">
      {/* 검색바 */}
      <div className="lesson-management__search">
        <input
          type="text"
          placeholder="학생 이름 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="lesson-management__search-input"
        />
        {searchQuery && (
          <button
            className="lesson-management__search-clear"
            onClick={() => setSearchQuery('')}
          >
            ✕
          </button>
        )}
      </div>

      <div className="lesson-management__container">
        {/* 왼쪽 사이드바 - 강사 목록 (원장만) */}
        {isOwner && (
          <aside className="lesson-management__sidebar">
            <div className="lesson-management__sidebar-header">
              <span className="lesson-management__sidebar-title">강사 / 학생</span>
              <span className="lesson-management__sidebar-count">{totalStudentCount}명</span>
            </div>

            <nav className="lesson-management__nav">
              {/* 강사별 섹션 */}
              {instructorSubGroups.map((subGroup) => {
                const students = studentsByInstructor[subGroup.instructorId] || [];
                const isExpanded = expandedSections.has(subGroup.instructorId);
                const isSelected = selectedInstructorId === subGroup.instructorId;

                return (
                  <div key={subGroup.id} className="lesson-management__nav-section">
                    <button
                      className={`lesson-management__nav-header ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        handleSelectInstructor(subGroup.instructorId);
                        toggleSection(subGroup.instructorId);
                      }}
                    >
                      <span className="lesson-management__nav-icon">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span className="lesson-management__nav-name">
                        {subGroup.instructor?.name || subGroup.name}
                      </span>
                      <span className="lesson-management__nav-count">{students.length}</span>
                    </button>

                    {isExpanded && students.length > 0 && (
                      <ul className="lesson-management__nav-list">
                        {students.slice(0, 5).map((student) => (
                          <li key={student.memberId}>
                            <button
                              className="lesson-management__nav-item"
                              onClick={() => handleStudentClick(student)}
                            >
                              {student.name}
                            </button>
                          </li>
                        ))}
                        {students.length > 5 && (
                          <li className="lesson-management__nav-more">
                            +{students.length - 5}명 더보기
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}

              {/* 미배정 학생 섹션 */}
              {unassignedStudents.length > 0 && (
                <div className="lesson-management__nav-section">
                  <button
                    className={`lesson-management__nav-header lesson-management__nav-header--unassigned ${
                      selectedInstructorId === 'unassigned' ? 'selected' : ''
                    }`}
                    onClick={() => {
                      handleSelectInstructor('unassigned');
                      toggleSection('unassigned');
                    }}
                  >
                    <span className="lesson-management__nav-icon">
                      {expandedSections.has('unassigned') ? '▼' : '▶'}
                    </span>
                    <span className="lesson-management__nav-name">미배정 학생</span>
                    <span className="lesson-management__nav-count">{unassignedStudents.length}</span>
                  </button>

                  {expandedSections.has('unassigned') && (
                    <ul className="lesson-management__nav-list">
                      {unassignedStudents.slice(0, 5).map((student) => (
                        <li key={student.memberId}>
                          <button
                            className="lesson-management__nav-item"
                            onClick={() => handleStudentClick(student)}
                          >
                            {student.name}
                          </button>
                        </li>
                      ))}
                      {unassignedStudents.length > 5 && (
                        <li className="lesson-management__nav-more">
                          +{unassignedStudents.length - 5}명 더보기
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </nav>
          </aside>
        )}

        {/* 오른쪽 메인 컨텐츠 - 학생 목록 */}
        <main className={`lesson-management__main ${!isOwner ? 'lesson-management__main--full' : ''}`}>
          {selectedInstructorId ? (
            <>
              <div className="lesson-management__main-header">
                <h2 className="lesson-management__main-title">
                  {selectedInstructorInfo.name}
                  <span className="lesson-management__main-count">
                    {displayedStudents.length}명
                    {searchQuery && ` / ${selectedInstructorInfo.count}명`}
                  </span>
                </h2>
              </div>

              {displayedStudents.length === 0 ? (
                <EmptyState
                  title="학생이 없습니다"
                  description={searchQuery ? '검색 결과가 없습니다.' : '배정된 학생이 없습니다.'}
                />
              ) : (
                <div className="lesson-management__students">
                  {displayedStudents.map((student) => (
                    <div
                      key={student.memberId}
                      className="lesson-management__student-card"
                      onClick={() => handleStudentClick(student)}
                    >
                      <div className="lesson-management__student-avatar">
                        {student.profileImage ? (
                          <img src={student.profileImage} alt={student.name} />
                        ) : (
                          student.name.charAt(0)
                        )}
                      </div>
                      <div className="lesson-management__student-info">
                        <span className="lesson-management__student-name">{student.name}</span>
                        <span className="lesson-management__student-schedule">
                          {formatSchedule(student.lessonSchedule)}
                        </span>
                      </div>
                      <div className="lesson-management__student-meta">
                        <span className="lesson-management__student-date">
                          최근: {formatDate(student.lastLessonDate)}
                        </span>
                        {student.hasHomework && (
                          <span className="lesson-management__student-homework">과제</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="lesson-management__placeholder">
              <EmptyState
                title="강사를 선택하세요"
                description="왼쪽에서 강사를 선택하면 해당 강사의 학생 목록이 표시됩니다."
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LessonManagementTab;
