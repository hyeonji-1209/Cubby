import { apiClient } from './client';

// 휴일 유형
export type HolidayType = 'regular' | 'specific' | 'range';

export const HOLIDAY_TYPES = {
  REGULAR: 'regular' as HolidayType,
  SPECIFIC: 'specific' as HolidayType,
  RANGE: 'range' as HolidayType,
};

export interface Holiday {
  id: string;
  type: HolidayType;
  name: string;
  description?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  recurringDays?: number[];
  notifyMembers: boolean;
  requiresMakeup: boolean;
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface CreateHolidayRequest {
  type: HolidayType;
  name: string;
  description?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  recurringDays?: number[];
  notifyMembers?: boolean;
  requiresMakeup?: boolean;
}

export interface UpdateHolidayRequest {
  name?: string;
  description?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  recurringDays?: number[];
  notifyMembers?: boolean;
  requiresMakeup?: boolean;
}

export const holidayApi = {
  // 휴일 목록 조회
  getByGroup: async (groupId: string, year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());

    const response = await apiClient.get<{ success: boolean; data: Holiday[] }>(
      `/groups/${groupId}/holidays?${params.toString()}`
    );
    return response.data;
  },

  // 특정 날짜 휴일 확인
  checkDate: async (groupId: string, date: string) => {
    const response = await apiClient.get<{
      success: boolean;
      data: { isHoliday: boolean; holiday: Holiday | null };
    }>(`/groups/${groupId}/holidays/check?date=${date}`);
    return response.data;
  },

  // 휴일 생성
  create: async (groupId: string, data: CreateHolidayRequest) => {
    const response = await apiClient.post<{ success: boolean; data: Holiday; message: string }>(
      `/groups/${groupId}/holidays`,
      data
    );
    return response.data;
  },

  // 휴일 수정
  update: async (groupId: string, holidayId: string, data: UpdateHolidayRequest) => {
    const response = await apiClient.patch<{ success: boolean; data: Holiday; message: string }>(
      `/groups/${groupId}/holidays/${holidayId}`,
      data
    );
    return response.data;
  },

  // 휴일 삭제
  delete: async (groupId: string, holidayId: string) => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/groups/${groupId}/holidays/${holidayId}`
    );
    return response.data;
  },
};
