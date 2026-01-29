import type { StateCreator } from 'zustand';
import { scheduleApi, attendanceApi } from '@/api';
import type { Schedule, ScheduleFormData, AttendanceStatus } from '@/types';
import type { LocationData } from '@/components';

export interface ScheduleSlice {
  // State
  schedules: Schedule[];
  schedulesLoading: boolean;
  showScheduleModal: boolean;
  editingSchedule: Schedule | null;
  scheduleForm: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    isAllDay: boolean;
    locationData: LocationData | null;
    color: string;
    requiresMakeup: boolean; // 보강 필요 여부
  };
  scheduleSaving: boolean;
  // 출석 상태 (scheduleId -> status)
  myAttendanceMap: Record<string, AttendanceStatus>;

  // Actions
  fetchSchedules: (groupId: string) => Promise<void>;
  fetchMyAttendances: (groupId: string) => Promise<void>;
  openNewScheduleModal: (date?: Date) => void;
  openEditScheduleModal: (scheduleId: string) => Promise<void>;
  closeScheduleModal: () => void;
  setScheduleForm: (form: Partial<ScheduleSlice['scheduleForm']>) => void;
  saveSchedule: (groupId: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<boolean>;
  resetScheduleState: () => void;
}

export const initialScheduleForm = {
  title: '',
  description: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  isAllDay: false,
  locationData: null as LocationData | null,
  color: '#3b82f6',
  requiresMakeup: false,
};

export const createScheduleSlice: StateCreator<ScheduleSlice, [], [], ScheduleSlice> = (set, get) => ({
  // Initial State
  schedules: [],
  schedulesLoading: false,
  showScheduleModal: false,
  editingSchedule: null,
  scheduleForm: { ...initialScheduleForm },
  scheduleSaving: false,
  myAttendanceMap: {},

  // Actions
  fetchSchedules: async (groupId) => {
    set({ schedulesLoading: true });
    try {
      const response = await scheduleApi.getByGroup(groupId);
      set({ schedules: response.data });
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      set({ schedulesLoading: false });
    }
  },

  fetchMyAttendances: async (groupId) => {
    try {
      const response = await attendanceApi.getMyAllAttendances(groupId);
      const map: Record<string, AttendanceStatus> = {};
      response.data.forEach((a) => {
        map[a.scheduleId] = a.status;
      });
      set({ myAttendanceMap: map });
    } catch (error) {
      console.error('Failed to fetch my attendances:', error);
    }
  },

  openNewScheduleModal: (selectedDate?: Date) => {
    const now = new Date();
    const baseDate = selectedDate || now;

    // 시간 계산 (30분 단위로 반올림)
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 0;
    const roundedHour = minutes < 30 ? now.getHours() : now.getHours() + 1;

    const startDate = new Date(baseDate);
    if (selectedDate) {
      // 특정 날짜가 선택된 경우 해당 날짜의 09:00으로 설정
      startDate.setHours(9, 0, 0, 0);
    } else if (roundedHour >= 24) {
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(roundedHour, roundedMinutes, 0, 0);
    }

    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const formatTime = (date: Date) =>
      `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const formatDateStr = (date: Date) => date.toISOString().split('T')[0];

    set({
      showScheduleModal: true,
      editingSchedule: null,
      scheduleForm: {
        title: '',
        description: '',
        startDate: formatDateStr(startDate),
        startTime: formatTime(startDate),
        endDate: formatDateStr(endDate),
        endTime: formatTime(endDate),
        isAllDay: false,
        locationData: null,
        color: '#3b82f6',
        requiresMakeup: false,
      },
    });
  },

  openEditScheduleModal: async (scheduleId) => {
    try {
      const response = await scheduleApi.getById(scheduleId);
      const schedule = response.data;
      set({
        showScheduleModal: true,
        editingSchedule: schedule,
        scheduleForm: {
          title: schedule.title,
          description: schedule.description || '',
          startDate: schedule.startAt.slice(0, 10),
          startTime: schedule.startAt.slice(11, 16) || '09:00',
          endDate: schedule.endAt.slice(0, 10),
          endTime: schedule.endAt.slice(11, 16) || '10:00',
          isAllDay: schedule.isAllDay,
          locationData: schedule.locationData || null,
          color: schedule.color || '#3b82f6',
          requiresMakeup: (schedule as Schedule & { requiresMakeup?: boolean }).requiresMakeup || false,
        },
      });
    } catch (error) {
      console.error('Failed to load schedule:', error);
      throw error;
    }
  },

  closeScheduleModal: () => {
    set({
      showScheduleModal: false,
      editingSchedule: null,
      scheduleForm: { ...initialScheduleForm },
    });
  },

  setScheduleForm: (form) => {
    set((state) => ({ scheduleForm: { ...state.scheduleForm, ...form } }));
  },

  saveSchedule: async (groupId) => {
    const { scheduleForm, editingSchedule, fetchSchedules, closeScheduleModal } = get();
    if (!scheduleForm.title.trim() || !scheduleForm.startDate || !scheduleForm.endDate) return;

    set({ scheduleSaving: true });
    try {
      const startAt = scheduleForm.isAllDay
        ? `${scheduleForm.startDate}T00:00`
        : `${scheduleForm.startDate}T${scheduleForm.startTime}`;
      const endAt = scheduleForm.isAllDay
        ? `${scheduleForm.endDate}T23:59`
        : `${scheduleForm.endDate}T${scheduleForm.endTime}`;

      const locationStr = scheduleForm.locationData
        ? scheduleForm.locationData.detail
          ? `${scheduleForm.locationData.name} (${scheduleForm.locationData.detail})`
          : scheduleForm.locationData.name
        : undefined;

      const formData: ScheduleFormData = {
        title: scheduleForm.title,
        description: scheduleForm.description,
        startAt,
        endAt,
        isAllDay: scheduleForm.isAllDay,
        location: locationStr,
        locationData: scheduleForm.locationData || undefined,
        color: scheduleForm.color,
      };

      if (editingSchedule) {
        await scheduleApi.update(editingSchedule.id, formData);
      } else {
        await scheduleApi.create(groupId, formData);
      }

      await fetchSchedules(groupId);
      closeScheduleModal();
    } finally {
      set({ scheduleSaving: false });
    }
  },

  deleteSchedule: async (id) => {
    try {
      await scheduleApi.delete(id);
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
      }));
      return true;
    } catch {
      return false;
    }
  },

  resetScheduleState: () => {
    set({
      schedules: [],
      schedulesLoading: false,
      showScheduleModal: false,
      editingSchedule: null,
      scheduleForm: { ...initialScheduleForm },
      scheduleSaving: false,
      myAttendanceMap: {},
    });
  },
});
