# Cubby - 모임 통합 관리 앱

다양한 모임을 하나로 관리하는 스마트 플랫폼

## 주요 기능

### 🎓 교육/학원 타입
- 1:1 및 그룹 수업 관리
- QR 출석 체크
- 수업 변경 신청/승인
- 레슨실 예약
- 수강료 납부 관리
- 학부모 연동

### ❤️ 연인/가족 타입
- 공유 캘린더 (색상 구분)
- 기념일 D-day
- 데일리 메시지
- 생리주기 공유 (연인/부부)

### 📌 동호회/종교/기타
- 일정 관리
- 공지사항
- 멤버 관리

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State**: Zustand
- **Mobile**: Capacitor (iOS, Android)
- **Push**: Firebase Cloud Messaging

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env.local`로 복사하고 Supabase 정보를 입력하세요:

```bash
cp .env.example .env.local
```

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `supabase/schema.sql` 파일의 SQL을 Supabase SQL Editor에서 실행
3. Project URL과 Anon Key를 `.env.local`에 입력

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

## 모바일 앱 빌드 (Capacitor)

### iOS

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

### Android

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 인증 필요 페이지
│   │   ├── dashboard/     # 대시보드
│   │   ├── groups/        # 모임 관리
│   │   ├── calendar/      # 캘린더
│   │   └── settings/      # 설정
│   └── auth/              # 인증 페이지
├── components/
│   ├── ui/                # 기본 UI 컴포넌트
│   └── layout/            # 레이아웃 컴포넌트
├── lib/
│   ├── supabase/          # Supabase 클라이언트
│   └── utils.ts           # 유틸리티 함수
├── store/                 # Zustand 상태 관리
└── types/                 # TypeScript 타입
```

## AWS 배포

### Amplify 배포

1. AWS Amplify Console에서 새 앱 연결
2. GitHub 저장소 선택
3. 빌드 설정:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
4. 환경 변수 설정

## 다음 개발 단계

1. [ ] 그룹 상세 페이지
2. [ ] 수업 관리 (레슨 CRUD)
3. [ ] QR 출석 체크
4. [ ] 수업 변경 신청
5. [ ] 캘린더 뷰
6. [ ] 푸시 알림 (FCM)
7. [ ] 연인 매칭 시스템
8. [ ] 생리주기 기록/공유

## 라이선스

Private
