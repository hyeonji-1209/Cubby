import { apiClient } from './client';

export interface FavoriteLocation {
  id: string;
  groupId: string;
  name: string;
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  sortOrder: number;
  detail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationDto {
  name: string;
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  detail?: string;
}

export interface UpdateLocationDto {
  name?: string;
  address?: string;
  sortOrder?: number;
  detail?: string;
}

export const locationApi = {
  // 그룹의 자주 쓰는 장소 목록 조회
  getByGroup: async (groupId: string) => {
    const response = await apiClient.get<{ success: boolean; data: FavoriteLocation[] }>(
      `/groups/${groupId}/locations`
    );
    return response.data.data;
  },

  // 자주 쓰는 장소 추가
  create: async (groupId: string, data: CreateLocationDto) => {
    const response = await apiClient.post<{ success: boolean; data: FavoriteLocation }>(
      `/groups/${groupId}/locations`,
      data
    );
    return response.data.data;
  },

  // 자주 쓰는 장소 수정
  update: async (groupId: string, locationId: string, data: UpdateLocationDto) => {
    const response = await apiClient.patch<{ success: boolean; data: FavoriteLocation }>(
      `/groups/${groupId}/locations/${locationId}`,
      data
    );
    return response.data.data;
  },

  // 자주 쓰는 장소 삭제
  delete: async (groupId: string, locationId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/groups/${groupId}/locations/${locationId}`
    );
    return response.data;
  },
};
