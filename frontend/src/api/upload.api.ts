import { apiClient } from './client';

export interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

export const uploadApi = {
  // 단일 파일 업로드
  uploadFile: async (file: File): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // 다중 파일 업로드 (최대 5개)
  uploadFiles: async (files: File[]): Promise<UploadedFile[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // 파일 삭제
  deleteFile: async (filename: string): Promise<void> => {
    await apiClient.delete(`/upload/${filename}`);
  },
};
