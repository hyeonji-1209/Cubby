import { apiClient } from './client';
import type { AxiosRequestConfig } from 'axios';

/**
 * API 응답 타입
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * CRUD API 팩토리
 * 기본적인 CRUD 엔드포인트를 자동 생성합니다.
 */
export interface CrudApi<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  getAll: (config?: AxiosRequestConfig) => Promise<ApiResponse<T[]>>;
  getById: (id: string, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  create: (data: CreateDto, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  update: (id: string, data: UpdateDto, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  delete: (id: string, config?: AxiosRequestConfig) => Promise<ApiResponse<void>>;
}

export const createCrudApi = <T, CreateDto = Partial<T>, UpdateDto = Partial<T>>(
  basePath: string
): CrudApi<T, CreateDto, UpdateDto> => ({
  getAll: (config) => apiClient.get(`${basePath}`, config),
  getById: (id, config) => apiClient.get(`${basePath}/${id}`, config),
  create: (data, config) => apiClient.post(`${basePath}`, data, config),
  update: (id, data, config) => apiClient.patch(`${basePath}/${id}`, data, config),
  delete: (id, config) => apiClient.delete(`${basePath}/${id}`, config),
});

/**
 * 그룹 종속 리소스용 CRUD API 팩토리
 * /groups/:groupId/resources 형태의 엔드포인트를 자동 생성합니다.
 */
export interface GroupResourceApi<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  getAll: (groupId: string, config?: AxiosRequestConfig) => Promise<ApiResponse<T[]>>;
  getById: (groupId: string, id: string, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  create: (groupId: string, data: CreateDto, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  update: (groupId: string, id: string, data: UpdateDto, config?: AxiosRequestConfig) => Promise<ApiResponse<T>>;
  delete: (groupId: string, id: string, config?: AxiosRequestConfig) => Promise<ApiResponse<void>>;
}

export const createGroupResourceApi = <T, CreateDto = Partial<T>, UpdateDto = Partial<T>>(
  resourcePath: string
): GroupResourceApi<T, CreateDto, UpdateDto> => ({
  getAll: (groupId, config) =>
    apiClient.get(`/groups/${groupId}/${resourcePath}`, config),
  getById: (groupId, id, config) =>
    apiClient.get(`/groups/${groupId}/${resourcePath}/${id}`, config),
  create: (groupId, data, config) =>
    apiClient.post(`/groups/${groupId}/${resourcePath}`, data, config),
  update: (groupId, id, data, config) =>
    apiClient.patch(`/groups/${groupId}/${resourcePath}/${id}`, data, config),
  delete: (groupId, id, config) =>
    apiClient.delete(`/groups/${groupId}/${resourcePath}/${id}`, config),
});

/**
 * API 응답 추출 헬퍼
 * axios 응답에서 data를 추출합니다.
 */
export const extractData = <T>(response: { data: ApiResponse<T> }): T => {
  return response.data.data;
};

/**
 * 에러 메시지 추출 헬퍼
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
  }
  return '알 수 없는 오류가 발생했습니다.';
};

/**
 * API 호출 래퍼 (에러 처리 포함)
 */
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  fallback?: T
): Promise<{ data: T | undefined; error: string | null }> => {
  try {
    const data = await apiCall();
    return { data, error: null };
  } catch (error) {
    return { data: fallback, error: getErrorMessage(error) };
  }
};
