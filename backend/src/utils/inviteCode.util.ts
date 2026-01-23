const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동하기 쉬운 문자 제외 (0, O, I, 1)

// 기본 유효기간: 7일
export const INVITE_CODE_EXPIRY_DAYS = 7;

export const generateInviteCode = (length: number = 8): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return result;
};

export const getInviteCodeExpiryDate = (days: number = INVITE_CODE_EXPIRY_DAYS): Date => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};

export const isInviteCodeExpired = (expiresAt: Date | null): boolean => {
  if (!expiresAt) return false; // 만료일 없으면 영구 유효
  return new Date() > new Date(expiresAt);
};
