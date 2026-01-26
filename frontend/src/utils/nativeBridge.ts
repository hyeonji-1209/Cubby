/**
 * Cubby Native Bridge
 * Flutter WebView와 통신하기 위한 유틸리티
 */

declare global {
  interface Window {
    CubbyNative?: {
      platform: 'ios' | 'android';
      fcmToken: string;
      postMessage: (action: string, data: Record<string, unknown>) => void;
      share: (title: string, text: string, url: string) => void;
      copyToClipboard: (text: string) => void;
      openExternalUrl: (url: string) => void;
      showToast: (message: string) => void;
      vibrate: () => void;
      refreshFcmToken: () => void;
      openImagePicker: (source: 'camera' | 'gallery') => void;
      authenticateBiometric: () => void;
    };
  }
}

// 네이티브 앱 내에서 실행 중인지 확인
export const isNativeApp = (): boolean => {
  return typeof window.CubbyNative !== 'undefined';
};

// 플랫폼 확인
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (isNativeApp()) {
    return window.CubbyNative!.platform;
  }
  return 'web';
};

// FCM 토큰 가져오기
export const getFcmToken = (): string | null => {
  if (isNativeApp() && window.CubbyNative!.fcmToken) {
    return window.CubbyNative!.fcmToken;
  }
  return null;
};

// 공유 결과 타입
export type ShareResult = {
  method: 'native' | 'webShare' | 'clipboard';
  success: boolean;
};

// 공유하기
export const share = async (title: string, text: string, url: string): Promise<ShareResult> => {
  if (isNativeApp()) {
    window.CubbyNative!.share(title, text, url);
    return { method: 'native', success: true };
  } else if (navigator.share) {
    // Web Share API (지원하는 브라우저에서)
    await navigator.share({ title, text, url });
    return { method: 'webShare', success: true };
  } else {
    // 대체: 클립보드에 복사
    await navigator.clipboard.writeText(url || text);
    return { method: 'clipboard', success: true };
  }
};

// 클립보드에 복사
export const copyToClipboard = async (text: string): Promise<void> => {
  if (isNativeApp()) {
    window.CubbyNative!.copyToClipboard(text);
  } else {
    await navigator.clipboard.writeText(text);
  }
};

// 외부 URL 열기
export const openExternalUrl = (url: string): void => {
  if (isNativeApp()) {
    window.CubbyNative!.openExternalUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// 토스트 메시지 표시
export const showToast = (message: string): void => {
  if (isNativeApp()) {
    window.CubbyNative!.showToast(message);
  } else {
    // 웹에서는 간단한 알림 사용 또는 토스트 라이브러리 사용
    console.log('Toast:', message);
  }
};

// 진동
export const vibrate = (): void => {
  if (isNativeApp()) {
    window.CubbyNative!.vibrate();
  } else if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }
};

// FCM 토큰 갱신 요청
export const refreshFcmToken = (): void => {
  if (isNativeApp()) {
    window.CubbyNative!.refreshFcmToken();
  }
};

// 이미지 피커 열기
export const openImagePicker = (source: 'camera' | 'gallery'): void => {
  if (isNativeApp()) {
    window.CubbyNative!.openImagePicker(source);
  }
};

// 생체 인증
export const authenticateBiometric = (): void => {
  if (isNativeApp()) {
    window.CubbyNative!.authenticateBiometric();
  }
};

// 네이티브 브릿지 준비 완료 이벤트 리스너
export const onNativeReady = (
  callback: (detail: { platform: string; fcmToken: string }) => void
): (() => void) => {
  const handler = (event: CustomEvent<{ platform: string; fcmToken: string }>) => {
    callback(event.detail);
  };

  window.addEventListener('CubbyNativeReady', handler as EventListener);

  // 이미 준비되어 있으면 바로 콜백 호출
  if (isNativeApp()) {
    callback({
      platform: window.CubbyNative!.platform,
      fcmToken: window.CubbyNative!.fcmToken,
    });
  }

  // cleanup 함수 반환
  return () => {
    window.removeEventListener('CubbyNativeReady', handler as EventListener);
  };
};

// FCM 토큰 갱신 이벤트 리스너
export const onFcmTokenRefreshed = (
  callback: (token: string) => void
): (() => void) => {
  const handler = (event: CustomEvent<{ token: string }>) => {
    callback(event.detail.token);
  };

  window.addEventListener('fcmTokenRefreshed', handler as EventListener);

  return () => {
    window.removeEventListener('fcmTokenRefreshed', handler as EventListener);
  };
};

// 이미지 선택 이벤트 리스너
export const onImageSelected = (
  callback: (data: { base64: string; mimeType: string; fileName: string }) => void
): (() => void) => {
  const handler = (
    event: CustomEvent<{ base64: string; mimeType: string; fileName: string }>
  ) => {
    callback(event.detail);
  };

  window.addEventListener('imageSelected', handler as EventListener);

  return () => {
    window.removeEventListener('imageSelected', handler as EventListener);
  };
};

// 이미지 선택 취소 이벤트 리스너
export const onImageSelectionCancelled = (callback: () => void): (() => void) => {
  window.addEventListener('imageSelectionCancelled', callback);

  return () => {
    window.removeEventListener('imageSelectionCancelled', callback);
  };
};

// 생체 인증 결과 이벤트 리스너
export const onBiometricAuthResult = (
  callback: (success: boolean) => void
): (() => void) => {
  const handler = (event: CustomEvent<{ success: boolean }>) => {
    callback(event.detail.success);
  };

  window.addEventListener('biometricAuthResult', handler as EventListener);

  return () => {
    window.removeEventListener('biometricAuthResult', handler as EventListener);
  };
};
