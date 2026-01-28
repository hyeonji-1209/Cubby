import axios from 'axios';
import { apiClient } from './client';
import type { ApiResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const verificationApi = {
  // ============ 회원가입용 (비로그인 - 직접 axios 호출) ============

  // 회원가입용 이메일 인증 코드 발송
  sendEmailCodeForSignup: async (
    email: string
  ): Promise<ApiResponse<{ code?: string }>> => {
    // 인증 없이 직접 호출 (apiClient 인터셉터 우회)
    const response = await axios.post(`${API_BASE_URL}/verification/signup/email/send`, { email });
    return response.data;
  },

  // 회원가입용 이메일 인증 확인
  verifyEmailForSignup: async (
    email: string,
    code: string
  ): Promise<ApiResponse<{ email: string; verificationToken: string }>> => {
    // 인증 없이 직접 호출 (apiClient 인터셉터 우회)
    const response = await axios.post(`${API_BASE_URL}/verification/signup/email/verify`, {
      email,
      code,
    });
    return response.data;
  },

  // ============ 로그인 사용자용 ============

  // 이메일 인증 코드 발송
  sendEmailCode: async (email: string): Promise<ApiResponse<{ code?: string }>> => {
    const response = await apiClient.post('/verification/email/send', { email });
    return response.data;
  },

  // 이메일 인증 확인
  verifyEmail: async (
    email: string,
    code: string
  ): Promise<ApiResponse<{ email: string; emailVerified: boolean }>> => {
    const response = await apiClient.post('/verification/email/verify', { email, code });
    return response.data;
  },

  // 휴대폰 인증 코드 발송 (프로필 수정용)
  sendPhoneCode: async (phone: string): Promise<ApiResponse<{ code?: string }>> => {
    const response = await apiClient.post('/verification/phone/send', { phone });
    return response.data;
  },

  // 휴대폰 인증 확인 (프로필 수정용)
  verifyPhone: async (
    phone: string,
    code: string
  ): Promise<ApiResponse<{ phone: string; phoneVerified: boolean }>> => {
    const response = await apiClient.post('/verification/phone/verify', { phone, code });
    return response.data;
  },
};
