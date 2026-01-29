import { useCallback } from 'react';
import { groupApi } from '@/api';
import { useToast } from '@/components';
import { useLoading } from '@/hooks';
import type { Group } from '@/types';

/**
 * 초대 코드 관련 로직 훅
 */
export const useInviteCode = (
  groupId: string | undefined,
  currentGroup: Group | null,
  isAdmin: boolean,
  fetchGroup: (id: string) => Promise<void>
) => {
  const toast = useToast();
  const { loading: regeneratingCode, withLoading: withRegeneratingCode } = useLoading();

  const copyInviteCode = useCallback(() => {
    if (currentGroup?.inviteCode) {
      navigator.clipboard.writeText(currentGroup.inviteCode);
      toast.success('초대 코드가 복사되었습니다!');
    }
  }, [currentGroup?.inviteCode, toast]);

  const isInviteCodeExpired = useCallback(() => {
    if (!currentGroup?.inviteCodeExpiresAt) return false;
    return new Date() > new Date(currentGroup.inviteCodeExpiresAt);
  }, [currentGroup?.inviteCodeExpiresAt]);

  const formatExpiryDate = useCallback((dateStr?: string) => {
    if (!dateStr) return '무제한';
    const date = new Date(dateStr);
    const now = new Date();
    if (date < now) return '만료됨';
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}월 ${day}일 ${hours}:${minutes} 만료`;
  }, []);

  const handleRegenerateInviteCode = useCallback(async () => {
    if (!groupId || !isAdmin) return;
    if (!confirm('초대 코드를 재생성하시겠습니까? 기존 코드는 더 이상 사용할 수 없습니다.')) return;

    await withRegeneratingCode(async () => {
      await groupApi.regenerateInviteCode(groupId);
      await fetchGroup(groupId);
      toast.success('초대 코드가 재생성되었습니다.');
    }).catch(() => toast.error('초대 코드 재생성에 실패했습니다.'));
  }, [groupId, isAdmin, withRegeneratingCode, fetchGroup, toast]);

  return {
    regeneratingCode,
    copyInviteCode,
    isInviteCodeExpired,
    formatExpiryDate,
    handleRegenerateInviteCode,
  };
};

export type InviteCodeState = ReturnType<typeof useInviteCode>;
