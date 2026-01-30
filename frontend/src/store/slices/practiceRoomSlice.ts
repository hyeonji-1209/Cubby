import type { StateCreator } from 'zustand';
import { lessonRoomApi, practiceRoomReservationApi } from '@/api';
import type { LessonByDate, LessonRoom } from '@/api';
import { formatDateInput } from '@/utils/dateFormat';
import type { PracticeRoomReservation } from '@/types';

export interface PracticeRoomSlice {
  // State - LessonRoom 사용 (클래스 예약)
  practiceRooms: LessonRoom[];
  practiceRoomsLoading: boolean;
  reservations: PracticeRoomReservation[];
  reservationsLoading: boolean;
  myUpcomingReservations: PracticeRoomReservation[];
  reservationDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;
  lessonsByDate: LessonByDate[];

  // Actions
  fetchPracticeRooms: (groupId: string) => Promise<void>;
  fetchReservations: (groupId: string, date: Date) => Promise<void>;
  fetchLessonsByDate: (groupId: string, date: Date) => Promise<void>;
  fetchMyReservations: (groupId: string) => Promise<void>;
  setReservationDate: (date: Date) => void;
  setSelectedTime: (start: string, end: string) => void;
  createReservation: (groupId: string, roomId: string) => Promise<{ success: boolean; message?: string }>;
  cancelReservation: (groupId: string, reservationId: string) => Promise<boolean>;
  resetPracticeRoomState: () => void;
}

export const createPracticeRoomSlice: StateCreator<PracticeRoomSlice, [], [], PracticeRoomSlice> = (set, get) => ({
  // Initial State
  practiceRooms: [],
  practiceRoomsLoading: false,
  reservations: [],
  reservationsLoading: false,
  myUpcomingReservations: [],
  reservationDate: new Date(),
  selectedStartTime: '',
  selectedEndTime: '',
  lessonsByDate: [],

  // Actions - LessonRoom 사용 (클래스 예약 가능한 것만 필터링)
  fetchPracticeRooms: async (groupId) => {
    set({ practiceRoomsLoading: true });
    try {
      const response = await lessonRoomApi.getByGroup(groupId);
      // 예약 가능한 클래스만 필터링 (excludeFromPractice가 false인 것)
      const availableRooms = (response.data || []).filter(room => !room.excludeFromPractice && room.isActive);
      set({ practiceRooms: availableRooms });
    } catch (error) {
      console.error('Failed to fetch practice rooms:', error);
    } finally {
      set({ practiceRoomsLoading: false });
    }
  },

  fetchReservations: async (groupId, date) => {
    set({ reservationsLoading: true });
    try {
      const dateStr = formatDateInput(date);
      const response = await practiceRoomReservationApi.getByDate(groupId, dateStr);
      set({ reservations: response.data });
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      set({ reservationsLoading: false });
    }
  },

  fetchLessonsByDate: async (groupId, date) => {
    try {
      const dateStr = formatDateInput(date);
      const response = await practiceRoomReservationApi.getLessonsByDate(groupId, dateStr);
      set({ lessonsByDate: response.data });
    } catch (error) {
      console.error('Failed to fetch lessons by date:', error);
    }
  },

  fetchMyReservations: async (groupId) => {
    try {
      const response = await practiceRoomReservationApi.getMyReservations(groupId);
      set({ myUpcomingReservations: response.data });
    } catch (error) {
      console.error('Failed to fetch my reservations:', error);
    }
  },

  setReservationDate: (date) => {
    set({ reservationDate: date });
  },

  setSelectedTime: (start, end) => {
    set({ selectedStartTime: start, selectedEndTime: end });
  },

  createReservation: async (groupId, roomId) => {
    const { reservationDate, selectedStartTime, selectedEndTime, fetchReservations, fetchMyReservations } = get();
    if (!selectedStartTime || !selectedEndTime) {
      return { success: false, message: '시간을 선택해주세요.' };
    }

    try {
      const dateStr = formatDateInput(reservationDate);
      await practiceRoomReservationApi.create(groupId, {
        roomId,
        date: dateStr,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
      });
      set({ selectedStartTime: '', selectedEndTime: '' });
      await fetchReservations(groupId, reservationDate);
      await fetchMyReservations(groupId);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return { success: false, message: err.response?.data?.message || '예약에 실패했습니다.' };
    }
  },

  cancelReservation: async (groupId, reservationId) => {
    try {
      await practiceRoomReservationApi.cancel(groupId, reservationId);
      const { reservationDate, fetchReservations, fetchMyReservations } = get();
      await fetchReservations(groupId, reservationDate);
      await fetchMyReservations(groupId);
      return true;
    } catch {
      return false;
    }
  },

  resetPracticeRoomState: () => {
    set({
      practiceRooms: [],
      practiceRoomsLoading: false,
      reservations: [],
      reservationsLoading: false,
      myUpcomingReservations: [],
      reservationDate: new Date(),
      selectedStartTime: '',
      selectedEndTime: '',
      lessonsByDate: [],
    });
  },
});
