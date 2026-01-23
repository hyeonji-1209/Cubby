import { AppDataSource } from '../config/database';
import { DeviceToken, DevicePlatform } from '../models/DeviceToken';
import { Notification, NotificationType } from '../models/Notification';
import { getMessaging, initializeFirebase } from '../config/firebase';
import type { MulticastMessage, BatchResponse } from 'firebase-admin/messaging';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class PushService {
  private deviceTokenRepository = AppDataSource.getRepository(DeviceToken);
  private notificationRepository = AppDataSource.getRepository(Notification);
  private isInitialized = false;

  // FCM 초기화 (서버 시작 시 호출)
  initialize(): void {
    const app = initializeFirebase();
    this.isInitialized = app !== null;
  }

  // 디바이스 토큰 등록/업데이트
  async registerToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceName?: string
  ): Promise<DeviceToken> {
    // 플랫폼 문자열을 enum으로 변환
    const platformMap: Record<string, DevicePlatform> = {
      ios: DevicePlatform.IOS,
      android: DevicePlatform.ANDROID,
      web: DevicePlatform.WEB,
    };

    // 기존 토큰 확인
    let deviceToken = await this.deviceTokenRepository.findOne({
      where: { userId, token },
    });

    if (deviceToken) {
      // 기존 토큰 업데이트
      deviceToken.isActive = true;
      deviceToken.deviceName = deviceName || deviceToken.deviceName;
    } else {
      // 새 토큰 등록
      deviceToken = this.deviceTokenRepository.create({
        userId,
        token,
        platform: platformMap[platform],
        deviceName,
        isActive: true,
      });
    }

    return this.deviceTokenRepository.save(deviceToken);
  }

  // 디바이스 토큰 삭제 (로그아웃 시)
  async removeToken(userId: string, token: string): Promise<void> {
    await this.deviceTokenRepository.update({ userId, token }, { isActive: false });
  }

  // 사용자의 활성 토큰 조회
  async getUserTokens(userId: string): Promise<string[]> {
    const tokens = await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
    });
    return tokens.map((t) => t.token);
  }

  // 단일 사용자에게 푸시 발송
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await this.getUserTokens(userId);
    if (tokens.length === 0) return;

    await this.sendToTokens(tokens, payload);
  }

  // 여러 사용자에게 푸시 발송
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    const allTokens: string[] = [];

    for (const userId of userIds) {
      const tokens = await this.getUserTokens(userId);
      allTokens.push(...tokens);
    }

    if (allTokens.length === 0) return;

    await this.sendToTokens(allTokens, payload);
  }

  // 토큰들에 푸시 발송
  private async sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
    const messaging = getMessaging();

    // Firebase가 초기화되지 않았으면 개발 모드로 로그만 출력
    if (!messaging) {
      console.log(`[Push-Dev] To ${tokens.length} devices:`, payload);
      return;
    }

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'cubby_default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
        },
      },
    };

    try {
      const response: BatchResponse = await messaging.sendEachForMulticast(message);
      console.log(`[FCM] ${response.successCount} 성공, ${response.failureCount} 실패`);

      // 실패한 토큰 처리
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // 유효하지 않은 토큰은 비활성화
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            this.deviceTokenRepository.update({ token: tokens[idx] }, { isActive: false });
            console.log(`[FCM] 토큰 비활성화: ${tokens[idx].substring(0, 20)}...`);
          }
        }
      });
    } catch (error) {
      console.error('[FCM] 발송 실패:', error);
    }
  }

  // 알림 생성 + 푸시 발송 통합
  async notifyWithPush(params: {
    userId: string;
    groupId?: string;
    type: NotificationType;
    title: string;
    message?: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    // DB에 알림 저장
    const notification = this.notificationRepository.create(params);
    await this.notificationRepository.save(notification);

    // 푸시 발송
    await this.sendToUser(params.userId, {
      title: params.title,
      body: params.message || '',
      data: {
        type: params.type,
        notificationId: notification.id,
        groupId: params.groupId || '',
        ...Object.fromEntries(
          Object.entries(params.data || {}).map(([k, v]) => [k, String(v)])
        ),
      },
    });
  }
}

export const pushService = new PushService();
