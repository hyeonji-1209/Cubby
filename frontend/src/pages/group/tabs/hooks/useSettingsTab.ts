import { useEffect, useState } from 'react';
import { useToast } from '@/components';
import { useGroupDetailStore } from '@/store';
import { useGroupStore } from '@/store/groupStore';
import { practiceRoomApi, groupApi, lessonRoomApi } from '@/api';
import type { LessonRoom } from '@/api';
import type { PracticeRoom, Group, OperatingHours } from '@/types';

interface UseSettingsTabProps {
  groupId: string;
  currentGroup: Group;
}

export const useSettingsTab = ({ groupId, currentGroup }: UseSettingsTabProps) => {
  const { showToast } = useToast();
  const { fetchGroup } = useGroupStore();

  const {
    practiceRooms,
    practiceRoomsLoading,
    favoriteLocations,
    showLocationModal,
    editingLocation,
    locationForm,
    locationSaving,
    fetchPracticeRooms,
    fetchFavoriteLocations,
    openLocationModal,
    closeLocationModal,
    setLocationForm,
    saveLocation,
    deleteLocation,
  } = useGroupDetailStore();

  // 기능 토글 저장 상태
  const [featureSaving, setFeatureSaving] = useState(false);

  // 연습실 설정 로컬 상태
  const [practiceRoomSettings, setPracticeRoomSettings] = useState({
    openTime: currentGroup?.practiceRoomSettings?.openTime || '09:00',
    closeTime: currentGroup?.practiceRoomSettings?.closeTime || '22:00',
    slotMinutes: (currentGroup?.practiceRoomSettings?.slotMinutes || 30) as 30 | 60,
    maxHoursPerDay: currentGroup?.practiceRoomSettings?.maxHoursPerDay || 2,
  });
  const [practiceRoomSettingsChanged, setPracticeRoomSettingsChanged] = useState(false);
  const [practiceRoomSaving, setPracticeRoomSaving] = useState(false);
  const [newPracticeRoomName, setNewPracticeRoomName] = useState('');
  const [newPracticeRoomCapacity, setNewPracticeRoomCapacity] = useState(1);

  // QR 코드 모달 상태
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedRoomForQR, setSelectedRoomForQR] = useState<PracticeRoom | null>(null);

  // 운영시간 설정 로컬 상태
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    openTime: currentGroup?.operatingHours?.openTime || '09:00',
    closeTime: currentGroup?.operatingHours?.closeTime || '22:00',
    closedDays: currentGroup?.operatingHours?.closedDays || [],
  });
  const [operatingHoursChanged, setOperatingHoursChanged] = useState(false);
  const [operatingHoursSaving, setOperatingHoursSaving] = useState(false);

  // 레슨실 관련 상태 (1:1 수업용)
  const [lessonRooms, setLessonRooms] = useState<LessonRoom[]>([]);
  const [lessonRoomsLoading, setLessonRoomsLoading] = useState(false);
  const [newLessonRoomName, setNewLessonRoomName] = useState('');
  const [newLessonRoomCapacity, setNewLessonRoomCapacity] = useState(1);

  // 레슨실 목록 조회
  const fetchLessonRooms = async () => {
    if (!groupId) return;
    setLessonRoomsLoading(true);
    try {
      const response = await lessonRoomApi.getByGroup(groupId);
      setLessonRooms(response.data || []);
    } catch (error) {
      console.error('Failed to fetch lesson rooms:', error);
    } finally {
      setLessonRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchFavoriteLocations(groupId);
      if (currentGroup?.type === 'education' && currentGroup?.hasPracticeRooms) {
        fetchPracticeRooms(groupId);
      }
      // 1:1 수업인 경우 레슨실 조회
      if (currentGroup?.type === 'education' && !currentGroup?.hasClasses) {
        fetchLessonRooms();
      }
    }
  }, [groupId, currentGroup?.type, currentGroup?.hasPracticeRooms, currentGroup?.hasClasses, fetchFavoriteLocations, fetchPracticeRooms]);

  const handleSavePracticeRoomSettings = async () => {
    setPracticeRoomSaving(true);
    try {
      await groupApi.update(groupId, { practiceRoomSettings });
      setPracticeRoomSettingsChanged(false);
      showToast('success', '연습실 설정이 저장되었습니다.');
    } catch {
      showToast('error', '설정 저장에 실패했습니다.');
    } finally {
      setPracticeRoomSaving(false);
    }
  };

  const handleAddPracticeRoom = async () => {
    if (!newPracticeRoomName.trim()) return;
    try {
      await practiceRoomApi.create(groupId, {
        name: newPracticeRoomName.trim(),
        capacity: newPracticeRoomCapacity,
      });
      setNewPracticeRoomName('');
      setNewPracticeRoomCapacity(1);
      fetchPracticeRooms(groupId);
      showToast('success', '연습실이 추가되었습니다.');
    } catch {
      showToast('error', '연습실 추가에 실패했습니다.');
    }
  };

  const handleUpdateRoomCapacity = async (roomId: string, capacity: number) => {
    try {
      await practiceRoomApi.update(groupId, roomId, { capacity });
      fetchPracticeRooms(groupId);
    } catch {
      showToast('error', '수용 인원 변경에 실패했습니다.');
    }
  };

  const handleDeletePracticeRoom = async (room: PracticeRoom) => {
    if (window.confirm(`"${room.name}"을(를) 삭제하시겠습니까?`)) {
      try {
        await practiceRoomApi.delete(groupId, room.id);
        fetchPracticeRooms(groupId);
        showToast('success', '연습실이 삭제되었습니다.');
      } catch {
        showToast('error', '연습실 삭제에 실패했습니다.');
      }
    }
  };

  // 레슨실 추가
  const handleAddLessonRoom = async () => {
    if (!newLessonRoomName.trim()) return;
    try {
      await lessonRoomApi.create(groupId, {
        name: newLessonRoomName.trim(),
        capacity: newLessonRoomCapacity,
      });
      setNewLessonRoomName('');
      setNewLessonRoomCapacity(1);
      fetchLessonRooms();
      showToast('success', '레슨실이 추가되었습니다.');
    } catch {
      showToast('error', '레슨실 추가에 실패했습니다.');
    }
  };

  // 레슨실 수용 인원 변경
  const handleUpdateLessonRoomCapacity = async (roomId: string, capacity: number) => {
    try {
      await lessonRoomApi.update(groupId, roomId, { capacity });
      fetchLessonRooms();
    } catch {
      showToast('error', '수용 인원 변경에 실패했습니다.');
    }
  };

  // 레슨실 삭제
  const handleDeleteLessonRoom = async (room: LessonRoom) => {
    if (window.confirm(`"${room.name}"을(를) 삭제하시겠습니까?`)) {
      try {
        await lessonRoomApi.delete(groupId, room.id);
        fetchLessonRooms();
        showToast('success', '레슨실이 삭제되었습니다.');
      } catch {
        showToast('error', '레슨실 삭제에 실패했습니다.');
      }
    }
  };

  const handleSaveLocation = async () => {
    await saveLocation(groupId);
    showToast('success', editingLocation ? '장소가 수정되었습니다.' : '장소가 추가되었습니다.');
  };

  const handleDeleteLocation = async (location: typeof favoriteLocations[number]) => {
    if (window.confirm(`"${location.name}"을(를) 삭제하시겠습니까?`)) {
      const success = await deleteLocation(groupId, location);
      if (success) {
        showToast('success', '장소가 삭제되었습니다.');
      } else {
        showToast('error', '장소 삭제에 실패했습니다.');
      }
    }
  };

  const updatePracticeRoomSetting = <K extends keyof typeof practiceRoomSettings>(
    key: K,
    value: typeof practiceRoomSettings[K]
  ) => {
    setPracticeRoomSettings((prev) => ({ ...prev, [key]: value }));
    setPracticeRoomSettingsChanged(true);
  };

  const handleShowQRCode = (room: PracticeRoom) => {
    setSelectedRoomForQR(room);
    setShowQRModal(true);
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setSelectedRoomForQR(null);
  };

  // 운영시간 설정 업데이트
  const updateOperatingHoursSetting = <K extends keyof OperatingHours>(
    key: K,
    value: OperatingHours[K]
  ) => {
    setOperatingHours((prev) => ({ ...prev, [key]: value }));
    setOperatingHoursChanged(true);
  };

  // 운영시간 설정 저장
  const handleSaveOperatingHours = async () => {
    setOperatingHoursSaving(true);
    try {
      await groupApi.update(groupId, { operatingHours });
      await fetchGroup(groupId);
      setOperatingHoursChanged(false);
      showToast('success', '운영시간 설정이 저장되었습니다.');
    } catch {
      showToast('error', '설정 저장에 실패했습니다.');
    } finally {
      setOperatingHoursSaving(false);
    }
  };

  // 기능 설정 토글
  const handleFeatureToggle = async (
    feature: 'hasClasses' | 'hasPracticeRooms' | 'hasAttendance' | 'allowGuardians',
    value: boolean
  ) => {
    if (featureSaving) return;
    setFeatureSaving(true);
    try {
      await groupApi.update(groupId, { [feature]: value });
      await fetchGroup(groupId);
      showToast('success', '설정이 변경되었습니다.');
    } catch {
      showToast('error', '설정 변경에 실패했습니다.');
    } finally {
      setFeatureSaving(false);
    }
  };

  return {
    // Practice rooms
    practiceRooms,
    practiceRoomsLoading,
    practiceRoomSettings,
    practiceRoomSettingsChanged,
    practiceRoomSaving,
    newPracticeRoomName,
    setNewPracticeRoomName,
    newPracticeRoomCapacity,
    setNewPracticeRoomCapacity,
    updatePracticeRoomSetting,
    handleSavePracticeRoomSettings,
    handleAddPracticeRoom,
    handleUpdateRoomCapacity,
    handleDeletePracticeRoom,
    // QR Code
    showQRModal,
    selectedRoomForQR,
    handleShowQRCode,
    handleCloseQRModal,
    // Feature toggle
    featureSaving,
    handleFeatureToggle,
    // Operating hours
    operatingHours,
    operatingHoursChanged,
    operatingHoursSaving,
    updateOperatingHoursSetting,
    handleSaveOperatingHours,
    // Locations
    favoriteLocations,
    showLocationModal,
    editingLocation,
    locationForm,
    locationSaving,
    openLocationModal,
    closeLocationModal,
    setLocationForm,
    handleSaveLocation,
    handleDeleteLocation,
    // Lesson rooms (1:1 수업용)
    lessonRooms,
    lessonRoomsLoading,
    newLessonRoomName,
    setNewLessonRoomName,
    newLessonRoomCapacity,
    setNewLessonRoomCapacity,
    handleAddLessonRoom,
    handleUpdateLessonRoomCapacity,
    handleDeleteLessonRoom,
  };
};
