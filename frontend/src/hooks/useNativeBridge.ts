import { useEffect, useState, useCallback } from 'react';
import {
  isNativeApp,
  getPlatform,
  getFcmToken,
  share,
  copyToClipboard,
  openExternalUrl,
  showToast,
  vibrate,
  refreshFcmToken,
  openImagePicker,
  authenticateBiometric,
  onNativeReady,
  onFcmTokenRefreshed,
  onImageSelected,
  onImageSelectionCancelled,
  onBiometricAuthResult,
} from '@/utils/nativeBridge';

interface UseNativeBridgeReturn {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  fcmToken: string | null;
  isReady: boolean;
  share: typeof share;
  copyToClipboard: typeof copyToClipboard;
  openExternalUrl: typeof openExternalUrl;
  showToast: typeof showToast;
  vibrate: typeof vibrate;
  refreshFcmToken: typeof refreshFcmToken;
  pickImage: (source: 'camera' | 'gallery') => Promise<{
    base64: string;
    mimeType: string;
    fileName: string;
  } | null>;
  authenticate: () => Promise<boolean>;
}

export const useNativeBridge = (): UseNativeBridgeReturn => {
  const [isReady, setIsReady] = useState(isNativeApp());
  const [fcmToken, setFcmToken] = useState<string | null>(getFcmToken());

  useEffect(() => {
    const cleanupReady = onNativeReady((detail) => {
      setIsReady(true);
      setFcmToken(detail.fcmToken || null);
    });

    const cleanupToken = onFcmTokenRefreshed((token) => {
      setFcmToken(token);
    });

    return () => {
      cleanupReady();
      cleanupToken();
    };
  }, []);

  // 이미지 선택 (Promise 기반)
  const pickImage = useCallback(
    (
      source: 'camera' | 'gallery'
    ): Promise<{ base64: string; mimeType: string; fileName: string } | null> => {
      return new Promise((resolve) => {
        if (!isNativeApp()) {
          // 웹에서는 input 사용
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          if (source === 'camera') {
            input.capture = 'environment';
          }

          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({
                  base64,
                  mimeType: file.type,
                  fileName: file.name,
                });
              };
              reader.readAsDataURL(file);
            } else {
              resolve(null);
            }
          };

          input.click();
          return;
        }

        // 네이티브 앱에서
        let cleanupSelected: (() => void) | null = null;
        let cleanupCancelled: (() => void) | null = null;

        const cleanup = () => {
          cleanupSelected?.();
          cleanupCancelled?.();
        };

        cleanupSelected = onImageSelected((data) => {
          cleanup();
          resolve(data);
        });

        cleanupCancelled = onImageSelectionCancelled(() => {
          cleanup();
          resolve(null);
        });

        openImagePicker(source);
      });
    },
    []
  );

  // 생체 인증 (Promise 기반)
  const authenticate = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!isNativeApp()) {
        // 웹에서는 항상 성공 처리
        resolve(true);
        return;
      }

      const cleanup = onBiometricAuthResult((success) => {
        cleanup();
        resolve(success);
      });

      authenticateBiometric();
    });
  }, []);

  return {
    isNative: isNativeApp(),
    platform: getPlatform(),
    fcmToken,
    isReady,
    share,
    copyToClipboard,
    openExternalUrl,
    showToast,
    vibrate,
    refreshFcmToken,
    pickImage,
    authenticate,
  };
};

export default useNativeBridge;
