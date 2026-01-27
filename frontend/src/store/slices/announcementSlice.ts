import type { StateCreator } from 'zustand';
import { announcementApi, uploadApi } from '@/api';
import type { Announcement, AnnouncementFormData } from '@/types';

interface AttachmentFile {
  id: string;
  file?: File;
  name?: string;
  url?: string;
  preview?: string;
  type: 'image' | 'file' | string;
}

export interface AnnouncementSlice {
  // State
  announcements: Announcement[];
  announcementsLoading: boolean;
  announcementWriteMode: boolean;
  selectedAnnouncement: Announcement | null;
  editingAnnouncement: Announcement | null;
  announcementForm: AnnouncementFormData;
  attachments: AttachmentFile[];
  announcementSaving: boolean;
  announcementLikeState: { isLiked: boolean; likeCount: number } | null;

  // Actions
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
  resetAnnouncementState: () => void;
}

export const initialAnnouncementForm: AnnouncementFormData = {
  title: '',
  content: '',
  isPinned: false,
  isAdminOnly: false,
};

export const createAnnouncementSlice: StateCreator<AnnouncementSlice, [], [], AnnouncementSlice> = (set, get) => ({
  // Initial State
  announcements: [],
  announcementsLoading: false,
  announcementWriteMode: false,
  selectedAnnouncement: null,
  editingAnnouncement: null,
  announcementForm: { ...initialAnnouncementForm },
  attachments: [],
  announcementSaving: false,
  announcementLikeState: null,

  // Actions
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
    const { announcementForm, attachments, editingAnnouncement, fetchAnnouncements, closeAnnouncementWriteMode } = get();
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

      await fetchAnnouncements(groupId);
      closeAnnouncementWriteMode();
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

  resetAnnouncementState: () => {
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
    });
  },
});
