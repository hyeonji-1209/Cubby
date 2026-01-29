import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { subgroupMemberApi } from '@/api';
import type { InstructorSubGroup, SubGroupMemberInfo } from '@/api';
import type { GroupMember } from '@/types';

/**
 * 멤버 검색/필터링 관련 훅
 */
export const useMemberFilters = (
  groupId: string | undefined,
  members: GroupMember[],
  hasMultipleInstructors?: boolean
) => {
  // 멤버 검색
  const [memberSearch, setMemberSearch] = useState('');

  // 강사별 필터링 (다중 강사 모드)
  const [instructorFilter, setInstructorFilter] = useState<string>('all');
  const [instructorSubGroups, setInstructorSubGroups] = useState<InstructorSubGroup[]>([]);
  const [instructorSubGroupMembers, setInstructorSubGroupMembers] = useState<Map<string, string[]>>(new Map());

  // 로드 상태
  const loadedRef = useRef(false);

  // 강사 소그룹 조회
  const fetchInstructorSubGroups = useCallback(async () => {
    if (!groupId) return;
    try {
      const response = await subgroupMemberApi.getInstructorSubGroups(groupId);
      setInstructorSubGroups(response.data || []);

      // 각 강사 소그룹의 멤버 목록 조회
      const memberMap = new Map<string, string[]>();
      for (const subGroup of response.data || []) {
        try {
          const membersResponse = await subgroupMemberApi.getSubGroupMembers(groupId, subGroup.id);
          const memberIds = (membersResponse.data || [])
            .filter((m: SubGroupMemberInfo) => m.groupMember)
            .map((m: SubGroupMemberInfo) => m.groupMemberId);
          memberMap.set(subGroup.id, memberIds);
        } catch (error) {
          console.error('Failed to fetch subgroup members:', error);
        }
      }
      setInstructorSubGroupMembers(memberMap);
    } catch (error) {
      console.error('Failed to fetch instructor subgroups:', error);
    }
  }, [groupId]);

  // 다중 강사 모드인 경우 강사 소그룹 조회
  useEffect(() => {
    if (hasMultipleInstructors && !loadedRef.current) {
      loadedRef.current = true;
      fetchInstructorSubGroups();
    }
  }, [hasMultipleInstructors, fetchInstructorSubGroups]);

  // 필터링된 멤버 목록
  const filteredMembers = useMemo(() => {
    let result = members;

    // 강사별 필터링 (다중 강사 모드)
    if (instructorFilter && instructorFilter !== 'all') {
      if (instructorFilter === 'unassigned') {
        // 미배정 학생: 어느 강사 소그룹에도 속하지 않은 멤버
        const allAssignedMemberIds = new Set<string>();
        instructorSubGroupMembers.forEach((memberIds) => {
          memberIds.forEach((id) => allAssignedMemberIds.add(id));
        });
        result = result.filter((m) => m.role !== 'owner' && m.role !== 'admin' && !allAssignedMemberIds.has(m.id));
      } else {
        // 특정 강사의 학생
        const memberIds = instructorSubGroupMembers.get(instructorFilter) || [];
        result = result.filter((m) => memberIds.includes(m.id));
      }
    }

    // 검색어 필터링
    if (memberSearch) {
      const searchLower = memberSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(searchLower) ||
          m.user?.email?.toLowerCase().includes(searchLower) ||
          m.nickname?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [members, memberSearch, instructorFilter, instructorSubGroupMembers]);

  return {
    memberSearch,
    setMemberSearch,
    instructorFilter,
    setInstructorFilter,
    instructorSubGroups,
    filteredMembers,
    fetchInstructorSubGroups,
  };
};

export type MemberFiltersState = ReturnType<typeof useMemberFilters>;
