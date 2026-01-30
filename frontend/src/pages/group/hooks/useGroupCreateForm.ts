import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/groupStore';
import { useToast } from '@/components';
import { useListManager, useLoading } from '@/hooks';
import { positionApi, groupApi, practiceRoomApi, lessonRoomApi } from '@/api';
import { getPositionLabel, GROUP_TYPE_COLORS, GROUP_TYPE_DEFAULT_ICONS } from '@/constants/labels';
import type { GroupType } from '@/types';

const DEFAULT_ICON = 'users';
const DEFAULT_COLOR = '#3b82f6';

export interface GroupCreateFormState {
  // 기본 정보
  name: string;
  description: string;
  type: GroupType | '';
  icon: string;
  color: string;
  logoImage?: string;

  // 연인 타입 전용
  coupleRole: 'boyfriend' | 'girlfriend' | '';
  anniversaryDate: string;
  myBirthday: string;

  // 직책/직분
  myTitle: string;

  // 회사 타입 전용
  companyPositionMode: 'both' | 'title_only';
  myRank: string;

  // 학원 타입 전용
  ownerCount: number; // 원장 수
  hasClasses: boolean;
  hasPracticeRooms: boolean;
  allowGuardians: boolean;
  hasAttendance: boolean;
  hasMultipleInstructors: boolean; // 다중 강사 모드

  // 연습실 설정
  practiceRoomOpenTime: string;
  practiceRoomCloseTime: string;
  practiceRoomSlotMinutes: 30 | 60;
  practiceRoomMaxHours: number;
}

// 학원 타입 고정 직책
export const EDUCATION_POSITIONS = ['원장', '강사', '학생', '보호자'] as const;
export type EducationPosition = typeof EDUCATION_POSITIONS[number];

const initialState: GroupCreateFormState = {
  name: '',
  description: '',
  type: '',
  icon: DEFAULT_ICON,
  color: DEFAULT_COLOR,
  logoImage: undefined,
  coupleRole: '',
  anniversaryDate: '',
  myBirthday: '',
  myTitle: '',
  companyPositionMode: 'title_only',
  myRank: '',
  ownerCount: 1,
  hasClasses: false,
  hasPracticeRooms: false,
  allowGuardians: false,
  hasAttendance: false,
  hasMultipleInstructors: false,
  practiceRoomOpenTime: '09:00',
  practiceRoomCloseTime: '22:00',
  practiceRoomSlotMinutes: 60,
  practiceRoomMaxHours: 2,
};

// 교육 타입 생성 단계 (5단계)
export type EducationStep = 1 | 2 | 3 | 4 | 5;
export const EDUCATION_STEPS = {
  1: '기본 정보',
  2: '수업 방식',
  3: '추가 설정',
  4: '클래스',
  5: '직책 설정',
} as const;

// 클래스/연습실 타입
export interface ClassRoom {
  name: string;
  isPracticeRoom: boolean; // 연습실로 사용 여부
}

export const useGroupCreateForm = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const createGroup = useGroupStore((state) => state.createGroup);
  const { loading: isLoading, withLoading } = useLoading();

  // 기본 폼 상태
  const [formState, setFormState] = useState<GroupCreateFormState>(initialState);

  // 교육 타입 단계 관리
  const [educationStep, setEducationStep] = useState<EducationStep>(1);

  // 리스트 관리 (직책, 직위, 클래스/연습실)
  const positionList = useListManager<string>([''], { maxLength: 10, minLength: 1 });
  const rankList = useListManager<string>([''], { maxLength: 10, minLength: 1 });
  // 클래스는 기본적으로 연습실로 사용 (isPracticeRoom: true가 기본)
  const classRoomList = useListManager<ClassRoom>([{ name: '', isPracticeRoom: true }], { maxLength: 20, minLength: 1 });

  // 폼 필드 업데이트
  const updateField = useCallback(<K extends keyof GroupCreateFormState>(
    field: K,
    value: GroupCreateFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 타입 선택 시 아이콘/색상 자동 설정
  const handleTypeSelect = useCallback((selectedType: GroupType) => {
    setFormState((prev) => ({
      ...prev,
      type: selectedType,
      icon: GROUP_TYPE_DEFAULT_ICONS[selectedType],
      color: GROUP_TYPE_COLORS[selectedType],
    }));
    // 교육 타입 선택 시 step 1로 시작
    if (selectedType === 'education') {
      setEducationStep(1);
    }
  }, []);

  // 교육 타입 단계별 유효성 검사
  const canGoNextStep = useCallback((): boolean => {
    const { name } = formState;
    switch (educationStep) {
      case 1: // 기본 정보: 이름 필수
        return !!name.trim();
      case 2: // 수업 방식: 항상 가능 (기본값 있음)
        return true;
      case 3: // 추가 설정: 항상 가능
        return true;
      case 4: // 연습실: 항상 가능
        return true;
      case 5: { // 직책 설정: 본인 직책 설정 필수
        // 학원 타입은 고정 직책 사용, 다른 타입은 직책 목록 필요
        return !!formState.myTitle.trim();
      }
      default:
        return false;
    }
  }, [educationStep, formState, positionList.items]);

  // 다음 단계로
  const goNextStep = useCallback(() => {
    if (educationStep < 5 && canGoNextStep()) {
      setEducationStep((prev) => (prev + 1) as EducationStep);
    }
  }, [educationStep, canGoNextStep]);

  // 이전 단계로
  const goPrevStep = useCallback(() => {
    if (educationStep > 1) {
      setEducationStep((prev) => (prev - 1) as EducationStep);
    }
  }, [educationStep]);

  // 폼 초기화
  const handleReset = useCallback(() => {
    setFormState(initialState);
    positionList.reset(['']);
    rankList.reset(['']);
    classRoomList.reset([{ name: '', isPracticeRoom: true }]);
    setEducationStep(1);
  }, [positionList, rankList, classRoomList]);

  // 유효성 검사
  const validate = useCallback((): boolean => {
    const { type, name, myTitle, companyPositionMode, myRank } = formState;
    const positionLabel = getPositionLabel(type || undefined);
    const validPositions = positionList.items.filter((p) => p.trim());
    const validRanks = rankList.items.filter((r) => r.trim());

    if (!type) {
      toast.error('모임 타입을 선택해주세요');
      return false;
    }

    if (!name.trim()) {
      toast.error('모임 이름을 입력해주세요');
      return false;
    }

    // 학원 타입은 고정 직책 사용, 커플 제외, 나머지 타입은 직책 목록 필요
    if (type !== 'couple' && type !== 'education' && validPositions.length === 0) {
      toast.error(`최소 하나 이상의 ${positionLabel}을 만들어주세요`);
      return false;
    }

    if (type === 'company' && companyPositionMode === 'both' && validRanks.length === 0) {
      toast.error('최소 하나 이상의 직위를 만들어주세요');
      return false;
    }

    if (type !== 'couple' && !myTitle.trim()) {
      toast.error(`본인의 ${positionLabel}을 설정해주세요`);
      return false;
    }

    if (type === 'company' && companyPositionMode === 'both' && !myRank.trim()) {
      toast.error('본인의 직위를 설정해주세요');
      return false;
    }

    return true;
  }, [formState, positionList.items, rankList.items, toast]);

  // 제출 가능 여부
  const canSubmit = useCallback((): boolean => {
    const { type, name, myTitle, companyPositionMode, myRank } = formState;
    const validPositions = positionList.items.filter((p) => p.trim());
    const validRanks = rankList.items.filter((r) => r.trim());

    if (isLoading || !type || !name.trim()) return false;
    // 학원 타입은 고정 직책 사용, 커플 제외, 나머지 타입은 직책 목록 필요
    if (type !== 'couple' && type !== 'education' && validPositions.length === 0) return false;
    if (type !== 'couple' && !myTitle.trim()) return false;
    if (type === 'company' && companyPositionMode === 'both' && validRanks.length === 0) return false;
    if (type === 'company' && companyPositionMode === 'both' && !myRank.trim()) return false;

    return true;
  }, [formState, positionList.items, rankList.items, isLoading]);

  // 폼 제출
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const {
      type, name, description, icon, color, logoImage,
      hasClasses, hasPracticeRooms, allowGuardians, hasAttendance, hasMultipleInstructors,
      practiceRoomOpenTime, practiceRoomCloseTime, practiceRoomSlotMinutes, practiceRoomMaxHours,
      myTitle, myRank, companyPositionMode,
    } = formState;

    const validPositions = positionList.items.filter((p) => p.trim());
    const validRanks = rankList.items.filter((r) => r.trim());
    // 클래스 중 연습실로 사용하는 것만 필터링
    const validPracticeRooms = classRoomList.items.filter((r) => r.name.trim() && r.isPracticeRoom);

    await withLoading(async () => {
      // 1. 모임 생성
      const groupData: Parameters<typeof createGroup>[0] = {
        name, description, type: type as GroupType, icon, color, logoImage,
      };

      if (type === 'education') {
        groupData.hasClasses = hasClasses;
        groupData.hasPracticeRooms = hasPracticeRooms;
        groupData.allowGuardians = allowGuardians;
        groupData.hasAttendance = hasAttendance;
        // 1:1 수업일 때만 다중 강사 모드 설정
        if (!hasClasses) {
          groupData.hasMultipleInstructors = hasMultipleInstructors;
        }
        if (hasPracticeRooms) {
          groupData.practiceRoomSettings = {
            openTime: practiceRoomOpenTime,
            closeTime: practiceRoomCloseTime,
            slotMinutes: practiceRoomSlotMinutes,
            maxHoursPerDay: practiceRoomMaxHours,
          };
        }
      }

      const group = await createGroup(groupData);

      // 2. 직책/직분 생성
      const createdPositions: Array<{ id: string; name: string }> = [];
      if (type === 'education') {
        // 학원 타입은 고정 직책 사용
        const results = await Promise.all(
          EDUCATION_POSITIONS.map((positionName) =>
            positionApi.create(group.id, { name: positionName }).catch(() => null)
          )
        );
        results.forEach((result) => {
          if (result?.data) createdPositions.push(result.data);
        });
      } else if (type !== 'couple' && validPositions.length > 0) {
        const results = await Promise.all(
          validPositions.map((positionName) =>
            positionApi.create(group.id, { name: positionName }).catch(() => null)
          )
        );
        results.forEach((result) => {
          if (result?.data) createdPositions.push(result.data);
        });
      }

      // 2-1. 회사 타입 직위 생성
      if (type === 'company' && companyPositionMode === 'both' && validRanks.length > 0) {
        await Promise.all(
          validRanks.map((rankName) =>
            positionApi.create(group.id, { name: `[직위] ${rankName}` }).catch(() => null)
          )
        );
      }

      // 3. 본인 프로필 설정
      if (type !== 'couple' && myTitle.trim()) {
        const titleValue = type === 'company' && companyPositionMode === 'both' && myRank.trim()
          ? `${myRank.trim()} / ${myTitle.trim()}`
          : myTitle.trim();

        await groupApi.updateMyProfile(group.id, { title: titleValue }).catch(() => null);

        const myPosition = createdPositions.find((p) => p.name === myTitle.trim());
        if (myPosition && group.myMembershipId) {
          await positionApi.assignPosition(group.id, group.myMembershipId, {
            positionId: myPosition.id,
          }).catch(() => null);
        }
      }

      // 4. 클래스/수업실 생성 (1:1 수업인 경우 lessonRoomApi 사용)
      const validClassRooms = classRoomList.items.filter((r) => r.name.trim());
      if (type === 'education' && !hasClasses && validClassRooms.length > 0) {
        // 1:1 수업: lessonRoomApi 사용
        await Promise.all(
          validClassRooms.map((room) =>
            lessonRoomApi.create(group.id, {
              name: room.name.trim(),
              capacity: 1,
              excludeFromPractice: !room.isPracticeRoom, // 예약 제외 여부
            }).catch(() => null)
          )
        );
      } else if (type === 'education' && hasPracticeRooms && validPracticeRooms.length > 0) {
        // 그룹 수업 + 연습실: practiceRoomApi 사용
        await Promise.all(
          validPracticeRooms.map((room) =>
            practiceRoomApi.create(group.id, { name: room.name.trim() }).catch(() => null)
          )
        );
      }

      toast.success('모임이 생성되었습니다!');
      navigate(`/groups/${group.id}`);
    }).catch(() => {
      toast.error('모임 생성에 실패했습니다.');
    });
  }, [formState, positionList.items, rankList.items, classRoomList.items, validate, withLoading, createGroup, navigate, toast]);

  return {
    formState,
    updateField,
    handleTypeSelect,
    handleReset,
    handleSubmit,
    canSubmit,
    isLoading,
    // 리스트 매니저
    positionList,
    rankList,
    classRoomList,
    // 교육 타입 단계 관리
    educationStep,
    setEducationStep,
    canGoNextStep,
    goNextStep,
    goPrevStep,
  };
};

export default useGroupCreateForm;
