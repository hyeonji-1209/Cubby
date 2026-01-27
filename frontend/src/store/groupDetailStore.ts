import { create } from 'zustand';
import { announcementApi, scheduleApi, practiceRoomApi, practiceRoomReservationApi, locationApi, uploadApi } from '@/api';
import type { FavoriteLocation } from '@/api';
import type { Announcement, AnnouncementFormData, Schedule, ScheduleFormData, PracticeRoom, PracticeRoomReservation } from '@/types';
import type { LocationData } from '@/components';

interface AttachmentFile {
  id: string;
  file?: File;
  name?: string;
  url?: string;
  preview?: string;
  type: 'image' | 'file' | string;
}

interface GroupDetailState {
  // === Announcements ===
  announcements: Announcement[];
  announcementsLoading: boolean;
  announcementWriteMode: boolean;
  selectedAnnouncement: Announcement | null;
  editingAnnouncement: Announcement | null;
  announcementForm: AnnouncementFormData;
  attachments: AttachmentFile[];
  announcementSaving: boolean;
  announcementLikeState: { isLiked: boolean; likeCount: number } | null;

  // === Schedules ===
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
  };
  scheduleSaving: boolean;

  // === Locations ===
  favoriteLocations: FavoriteLocation[];
  showLocationModal: boolean;
  editingLocation: FavoriteLocation | null;
  locationForm: LocationData | null;
  locationSaving: boolean;

  // === Practice Rooms ===
  practiceRooms: PracticeRoom[];
  practiceRoomsLoading: boolean;
  reservations: PracticeRoomReservation[];
  reservationsLoading: boolean;
  myUpcomingReservations: PracticeRoomReservation[];
  reservationDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;

  // === Actions ===
  // Announcements
  fetchAnnouncements: (groupId: string) => Promise<void>;
  openAnnouncementWriteMode: () => void;
  closeAnnouncementWriteMode: () => void;
  selectAnnouncement: (announcement: Announcement) => Promise<void>;
  closeAnnouncementDetail: () => void;
  setAnnouncementForm: (form: Partial<AnnouncementFormData>) => void;
  addAttachment: (files: File[]) => void;
  removeAttachment: (id: string) => void;
  saveAnnouncement: (groupId: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<boolean>;
  togglePin: (id: string) => Promise<void>;
  toggleLike: () => Promise<void>;
  editAnnouncement: (announcement: Announcement) => Promise<void>;

  // Schedules
  fetchSchedules: (groupId: string) => Promise<void>;
  openNewScheduleModal: () => void;
  openEditScheduleModal: (scheduleId: string) => Promise<void>;
  closeScheduleModal: () => void;
  setScheduleForm: (form: Partial<GroupDetailState['scheduleForm']>) => void;
  saveSchedule: (groupId: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<boolean>;

  // Locations
  fetchFavoriteLocations: (groupId: string) => Promise<void>;
  openLocationModal: (location?: FavoriteLocation) => void;
  closeLocationModal: () => void;
  setLocationForm: (form: LocationData | null) => void;
  saveLocation: (groupId: string) => Promise<void>;
  deleteLocation: (groupId: string, location: FavoriteLocation) => Promise<boolean>;

  // Practice Rooms
  fetchPracticeRooms: (groupId: string) => Promise<void>;
  fetchReservations: (groupId: string, date: Date) => Promise<void>;
  fetchMyReservations: (groupId: string) => Promise<void>;
  setReservationDate: (date: Date) => void;
  setSelectedTime: (start: string, end: string) => void;
  createReservation: (groupId: string, roomId: string) => Promise<{ success: boolean; message?: string }>;
  cancelReservation: (groupId: string, reservationId: string) => Promise<boolean>;

  // Reset
  reset: () => void;
}

const initialAnnouncementForm: AnnouncementFormData = {
  title: '',
  content: '',
  isPinned: false,
  isAdminOnly: false,
};

const initialScheduleForm = {
  title: '',
  description: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  isAllDay: false,
  locationData: null as LocationData | null,
  color: '#3b82f6',
};

export const useGroupDetailStore = create<GroupDetailState>((set, get) => ({
  // === Initial State ===
  announcements: [],
  announcementsLoading: false,
  announcementWriteMode: false,
  selectedAnnouncement: null,
  editingAnnouncement: null,
  announcementForm: { ...initialAnnouncementForm },
  attachments: [],
  announcementSaving: false,
  announcementLikeState: null,

  schedules: [],
  schedulesLoading: false,
  showScheduleModal: false,
  editingSchedule: null,
  scheduleForm: { ...initialScheduleForm },
  scheduleSaving: false,

  favoriteLocations: [],
  showLocationModal: false,
  editingLocation: null,
  locationForm: null,
  locationSaving: false,

  practiceRooms: [],
  practiceRoomsLoading: false,
  reservations: [],
  reservationsLoading: false,
  myUpcomingReservations: [],
  reservationDate: new Date(),
  selectedStartTime: '',
  selectedEndTime: '',

  // === Announcement Actions ===
  fetchAnnouncements: async (groupId) => {
    set({ announcementsLoading: true });
    try {
      const response = await announcementApi.getByGroup(groupId);
      set({ announcements: response.data });
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      set({ announcementsLoading: false });
    }
  },

  openAnnouncementWriteMode: () => {
    set({
      announcementWriteMode: true,
      editingAnnouncement: null,
      announcementForm: { ...initialAnnouncementForm },
      attachments: [],
    });
  },

  closeAnnouncementWriteMode: () => {
    const { attachments } = get();
    attachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    set({
      announcementWriteMode: false,
      editingAnnouncement: null,
      announcementForm: { ...initialAnnouncementForm },
      attachments: [],
    });
  },

  selectAnnouncement: async (announcement) => {
    try {
      const response = await announcementApi.getById(announcement.id);
      set({
        selectedAnnouncement: response.data,
        announcementLikeState: {
          isLiked: response.data.isLiked ?? false,
          likeCount: response.data.likeCount ?? 0,
        },
      });
    } catch (error) {
      console.error('Failed to fetch announcement:', error);
      throw error;
    }
  },

  closeAnnouncementDetail: () => {
    set({ selectedAnnouncement: null, announcementLikeState: null });
  },

  setAnnouncementForm: (form) => {
    set((state) => ({
      announcementForm: { ...state.announcementForm, ...form },
    }));
  },

  addAttachment: (files) => {
    const newAttachments: AttachmentFile[] = files.map((file) => {
      const isImage = file.type.startsWith('image/');
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type: isImage ? 'image' : 'file',
        preview: isImage ? URL.createObjectURL(file) : undefined,
      };
    });
    set((state) => ({ attachments: [...state.attachments, ...newAttachments] }));
  },

  removeAttachment: (id) => {
    set((state) => {
      const attachment = state.attachments.find((a) => a.id === id);
      if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
      return { attachments: state.attachments.filter((a) => a.id !== id) };
    });
  },

  saveAnnouncement: async (groupId) => {
    const { announcementForm, attachments, editingAnnouncement } = get();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;

    set({ announcementSaving: true });
    try {
      const newFiles = attachments.filter((a) => a.file).map((a) => a.file!);
      let uploadedAttachments: { name: string; url: string; type: string }[] = [];
      if (newFiles.length > 0) {
        uploadedAttachments = await uploadApi.uploadFiles(newFiles);
      }

      const existingAttachments = attachments
        .filter((a) => a.url)
        .map((a) => ({ name: a.name!, url: a.url!, type: a.type }));
      const allAttachments = [...existingAttachments, ...uploadedAttachments];

      const formData = {
        ...announcementForm,
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
      };

      if (editingAnnouncement) {
        await announcementApi.update(editingAnnouncement.id, formData);
      } else {
        await announcementApi.create(groupId, formData);
      }

      await get().fetchAnnouncements(groupId);
      get().closeAnnouncementWriteMode();
    } finally {
      set({ announcementSaving: false });
    }
  },

  deleteAnnouncement: async (id) => {
    try {
      await announcementApi.delete(id);
      set((state) => ({
        announcements: state.announcements.filter((a) => a.id !== id),
      }));
      return true;
    } catch {
      return false;
    }
  },

  togglePin: async (id) => {
    try {
      await announcementApi.togglePin(id);
      set((state) => ({
        announcements: state.announcements.map((a) =>
          a.id === id ? { ...a, isPinned: !a.isPinned } : a
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      throw error;
    }
  },

  toggleLike: async () => {
    const { selectedAnnouncement } = get();
    if (!selectedAnnouncement) return;

    try {
      const response = await announcementApi.toggleLike(selectedAnnouncement.id);
      set({ announcementLikeState: response.data });
    } catch (error) {
      console.error('Failed to toggle like:', error);
      throw error;
    }
  },

  editAnnouncement: async (announcement) => {
    try {
      const response = await announcementApi.getById(announcement.id);
      const full = response.data;
      set({
        editingAnnouncement: full,
        announcementForm: {
          title: full.title || '',
          content: full.content || '',
          isPinned: full.isPinned ?? false,
          isAdminOnly: full.isAdminOnly ?? false,
        },
        attachments: (full.attachments || []).map((att, idx) => ({
          id: `existing-${idx}`,
          name: att.name,
          url: att.url,
          type: att.type,
        })),
        announcementWriteMode: true,
      });
    } catch (error) {
      console.error('Failed to load announcement:', error);
      throw error;
    }
  },

  // === Schedule Actions ===
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

  openNewScheduleModal: () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 0;
    const roundedHour = minutes < 30 ? now.getHours() : now.getHours() + 1;

    const startDate = new Date(now);
    if (roundedHour >= 24) {
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
    const { scheduleForm, editingSchedule } = get();
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

      await get().fetchSchedules(groupId);
      get().closeScheduleModal();
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

  // === Location Actions ===
  fetchFavoriteLocations: async (groupId) => {
    try {
      const data = await locationApi.getByGroup(groupId);
      set({ favoriteLocations: data });
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  },

  openLocationModal: (location) => {
    if (location) {
      set({
        showLocationModal: true,
        editingLocation: location,
        locationForm: {
          name: location.name,
          address: location.address,
          detail: location.detail,
          placeId: location.placeId,
          lat: location.lat,
          lng: location.lng,
        },
      });
    } else {
      set({
        showLocationModal: true,
        editingLocation: null,
        locationForm: null,
      });
    }
  },

  closeLocationModal: () => {
    set({ showLocationModal: false, editingLocation: null, locationForm: null });
  },

  setLocationForm: (form) => {
    set({ locationForm: form });
  },

  saveLocation: async (groupId) => {
    const { locationForm, editingLocation } = get();
    if (!locationForm) return;

    set({ locationSaving: true });
    try {
      if (editingLocation) {
        await locationApi.update(groupId, editingLocation.id, {
          name: locationForm.name,
          address: locationForm.address,
          detail: locationForm.detail,
        });
      } else {
        await locationApi.create(groupId, {
          name: locationForm.name,
          address: locationForm.address,
          detail: locationForm.detail,
          placeId: locationForm.placeId,
          lat: locationForm.lat,
          lng: locationForm.lng,
        });
      }
      await get().fetchFavoriteLocations(groupId);
      get().closeLocationModal();
    } finally {
      set({ locationSaving: false });
    }
  },

  deleteLocation: async (groupId, location) => {
    try {
      await locationApi.delete(groupId, location.id);
      set((state) => ({
        favoriteLocations: state.favoriteLocations.filter((l) => l.id !== location.id),
      }));
      return true;
    } catch {
      return false;
    }
  },

  // === Practice Room Actions ===
  fetchPracticeRooms: async (groupId) => {
    set({ practiceRoomsLoading: true });
    try {
      const response = await practiceRoomApi.getList(groupId);
      set({ practiceRooms: response.data });
    } catch (error) {
      console.error('Failed to fetch practice rooms:', error);
    } finally {
      set({ practiceRoomsLoading: false });
    }
  },

  fetchReservations: async (groupId, date) => {
    set({ reservationsLoading: true });
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await practiceRoomReservationApi.getByDate(groupId, dateStr);
      set({ reservations: response.data });
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      set({ reservationsLoading: false });
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
    const { reservationDate, selectedStartTime, selectedEndTime } = get();
    if (!selectedStartTime || !selectedEndTime) {
      return { success: false, message: '시간을 선택해주세요.' };
    }

    try {
      const dateStr = reservationDate.toISOString().split('T')[0];
      await practiceRoomReservationApi.create(groupId, {
        roomId,
        date: dateStr,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
      });
      set({ selectedStartTime: '', selectedEndTime: '' });
      await get().fetchReservations(groupId, reservationDate);
      await get().fetchMyReservations(groupId);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return { success: false, message: err.response?.data?.message || '예약에 실패했습니다.' };
    }
  },

  cancelReservation: async (groupId, reservationId) => {
    try {
      await practiceRoomReservationApi.cancel(groupId, reservationId);
      const { reservationDate } = get();
      await get().fetchReservations(groupId, reservationDate);
      await get().fetchMyReservations(groupId);
      return true;
    } catch {
      return false;
    }
  },

  // === Reset ===
  reset: () => {
    const { attachments } = get();
    attachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    set({
      announcements: [],
      announcementsLoading: false,
      announcementWriteMode: false,
      selectedAnnouncement: null,
      editingAnnouncement: null,
      announcementForm: { ...initialAnnouncementForm },
      attachments: [],
      announcementSaving: false,
      announcementLikeState: null,
      schedules: [],
      schedulesLoading: false,
      showScheduleModal: false,
      editingSchedule: null,
      scheduleForm: { ...initialScheduleForm },
      scheduleSaving: false,
      favoriteLocations: [],
      showLocationModal: false,
      editingLocation: null,
      locationForm: null,
      locationSaving: false,
      practiceRooms: [],
      practiceRoomsLoading: false,
      reservations: [],
      reservationsLoading: false,
      myUpcomingReservations: [],
      reservationDate: new Date(),
      selectedStartTime: '',
      selectedEndTime: '',
    });
  },
}));
