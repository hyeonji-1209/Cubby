import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): admin.app.App | null => {
  // Firebase 설정이 없으면 초기화하지 않음 (개발 모드)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.log('[Firebase] 환경 변수 미설정 - FCM 비활성화 (개발 모드)');
    return null;
  }

  if (admin.apps.length > 0) {
    firebaseApp = admin.apps[0]!;
    return firebaseApp;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    console.log('[Firebase] Admin SDK 초기화 완료');
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] 초기화 실패:', error);
    return null;
  }
};

export const getFirebaseApp = (): admin.app.App | null => {
  return firebaseApp;
};

export const getMessaging = (): admin.messaging.Messaging | null => {
  if (!firebaseApp) return null;
  return admin.messaging(firebaseApp);
};
