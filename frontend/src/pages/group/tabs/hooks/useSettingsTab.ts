import { useEffect, useState } from 'react';
import { useToast } from '@/components';
import { useGroupDetailStore } from '@/store';
import { practiceRoomApi, groupApi } from '@/api';
import type { PracticeRoom, Group } from '@/types';

interface UseSettingsTabProps {
  groupId: string;
  currentGroup: Group;
}

export const useSettingsTab = ({ groupId, currentGroup }: UseSettingsTabProps) => {
  const { showToast } = useToast();

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

  useEffect(() => {
    if (groupId) {
      fetchFavoriteLocations(groupId);
      if (currentGroup?.type === 'education' && currentGroup?.hasPracticeRooms) {
        fetchPracticeRooms(groupId);
      }
    }
  }, [groupId, currentGroup?.type, currentGroup?.hasPracticeRooms, fetchFavoriteLocations, fetchPracticeRooms]);

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
  };
};
