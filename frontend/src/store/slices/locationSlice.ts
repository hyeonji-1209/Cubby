import type { StateCreator } from 'zustand';
import { locationApi, type FavoriteLocation } from '@/api';
import type { LocationData } from '@/components';

export interface LocationSlice {
  // State
  favoriteLocations: FavoriteLocation[];
  showLocationModal: boolean;
  editingLocation: FavoriteLocation | null;
  locationForm: LocationData | null;
  locationSaving: boolean;

  // Actions
  fetchFavoriteLocations: (groupId: string) => Promise<void>;
  openLocationModal: (location?: FavoriteLocation) => void;
  closeLocationModal: () => void;
  setLocationForm: (form: LocationData | null) => void;
  saveLocation: (groupId: string) => Promise<void>;
  deleteLocation: (groupId: string, location: FavoriteLocation) => Promise<boolean>;
  resetLocationState: () => void;
}

export const createLocationSlice: StateCreator<LocationSlice, [], [], LocationSlice> = (set, get) => ({
  // Initial State
  favoriteLocations: [],
  showLocationModal: false,
  editingLocation: null,
  locationForm: null,
  locationSaving: false,

  // Actions
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
    const { locationForm, editingLocation, fetchFavoriteLocations, closeLocationModal } = get();
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
      await fetchFavoriteLocations(groupId);
      closeLocationModal();
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

  resetLocationState: () => {
    set({
      favoriteLocations: [],
      showLocationModal: false,
      editingLocation: null,
      locationForm: null,
      locationSaving: false,
    });
  },
});
