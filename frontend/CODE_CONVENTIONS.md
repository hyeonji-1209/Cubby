# Cubby Frontend Code Conventions

## 1. 파일 구조

```
src/
├── api/              # API 클라이언트 (리소스별 분리)
├── components/       # 재사용 컴포넌트
│   ├── common/      # 공통 UI (Button, Modal, Toast 등)
│   └── layout/      # 레이아웃 (Header, Sidebar 등)
├── constants/        # 상수 정의 (labels, config)
├── hooks/           # Custom Hooks
├── pages/           # 페이지 컴포넌트 (폴더별 그룹)
├── store/           # Zustand 스토어
├── styles/          # 전역 SCSS
├── types/           # TypeScript 타입
└── utils/           # 유틸리티 함수
```

## 2. 네이밍 컨벤션

### 파일명
- **컴포넌트**: PascalCase (`UserCard.tsx`)
- **훅**: camelCase with `use` prefix (`useAuth.ts`)
- **유틸리티**: camelCase (`dateFormat.ts`)
- **상수**: camelCase (`labels.ts`)
- **스타일**: 컴포넌트와 동일 (`UserCard.scss`)

### 변수/함수명
```typescript
// 상수: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 1024 * 1024;

// 변수: camelCase
const userName = 'John';

// 함수: camelCase (동사로 시작)
const fetchUserData = async () => {};
const handleClick = () => {};

// 컴포넌트: PascalCase
const UserCard = () => {};

// 타입/인터페이스: PascalCase
interface UserProfile {}
type ButtonVariant = 'primary' | 'secondary';
```

### CSS 클래스명 (BEM)
```scss
.component-name {
  &__element {
    // 요소
  }

  &--modifier {
    // 변형
  }
}

// 예시
.card {
  &__header {}
  &__body {}
  &__footer {}
  &--highlighted {}
  &--compact {}
}
```

## 3. 컴포넌트 구조

```typescript
// 1. imports (외부 → 내부 순서)
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '@/store';
import { Button, Modal } from '@/components/common';
import { formatDate } from '@/utils/dateFormat';
import { ROLE_LABELS } from '@/constants/labels';
import type { User } from '@/types';

import './ComponentName.scss';

// 2. 타입 정의
interface ComponentNameProps {
  title: string;
  onSubmit: (data: FormData) => void;
}

// 3. 컴포넌트
const ComponentName = ({ title, onSubmit }: ComponentNameProps) => {
  // 3-1. hooks (상태, 스토어, 라우터 순)
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  // 3-2. derived state
  const isAdmin = user?.role === 'admin';

  // 3-3. effects
  useEffect(() => {
    // ...
  }, []);

  // 3-4. handlers
  const handleSubmit = async () => {
    // ...
  };

  // 3-5. render
  return (
    <div className="component-name">
      {/* ... */}
    </div>
  );
};

export default ComponentName;
```

## 4. 상태 관리

### 로컬 상태 vs 전역 상태
```typescript
// 로컬 상태: 컴포넌트 내부에서만 사용
const [isOpen, setIsOpen] = useState(false);

// 전역 상태: 여러 컴포넌트에서 공유 (Zustand)
const { user, logout } = useAuthStore();
```

### 비동기 상태 패턴
```typescript
// useAsync 훅 사용 권장
const { data, isLoading, error, execute } = useAsync(fetchData);

// 또는 표준 패턴
const [data, setData] = useState<Data | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

## 5. API 호출

### API 파일 구조
```typescript
// api/user.api.ts
import { apiClient } from './client';
import type { User, ApiResponse } from '@/types';

export const userApi = {
  getMe: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  updateMe: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
  },
};
```

### 에러 처리
```typescript
// toast 사용 (alert 금지)
import { toast } from '@/components/common/Toast';

try {
  await api.updateUser(data);
  toast.success('저장되었습니다.');
} catch (error) {
  toast.error('저장에 실패했습니다.');
}
```

## 6. 스타일링

### SCSS 변수 사용
```scss
@use '@/styles/variables' as *;

.component {
  // 색상
  color: $gray-900;
  background-color: $primary-50;

  // 간격
  padding: $spacing-md;
  margin-bottom: $spacing-lg;

  // 타이포그래피
  font-size: $font-size-base;
  font-weight: $font-weight-medium;

  // 그림자/둥글기
  border-radius: $radius-md;
  box-shadow: $shadow-sm;
}
```

### 반응형 브레이크포인트
```scss
// 모바일 우선 (mobile-first)
.component {
  padding: $spacing-sm;

  @media (min-width: 768px) {
    padding: $spacing-md;
  }

  @media (min-width: 1024px) {
    padding: $spacing-lg;
  }
}
```

## 7. 폼 처리

### 공통 폼 필드 패턴
```typescript
<FormField
  label="이름"
  required
  error={errors.name}
>
  <Input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="이름을 입력하세요"
  />
</FormField>
```

### 유효성 검사
```typescript
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};

  if (!name.trim()) {
    newErrors.name = '이름을 입력해주세요.';
  }

  if (password && password.length < 8) {
    newErrors.password = '비밀번호는 8자 이상이어야 합니다.';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

## 8. 접근성

### 필수 속성
```typescript
// 버튼에 aria-label
<button aria-label="알림 열기">
  <BellIcon />
</button>

// 이미지에 alt
<img src={url} alt="프로필 이미지" />

// 폼 필드에 label 연결
<label htmlFor="email">이메일</label>
<input id="email" type="email" />
```

## 9. 성능 최적화

### 메모이제이션
```typescript
// 비용이 큰 계산
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// 콜백 함수
const handleClick = useCallback(() => {
  // ...
}, [dependency]);
```

### 조건부 렌더링
```typescript
// 단순 조건
{isVisible && <Component />}

// 삼항 연산자 (간단한 경우만)
{isLoading ? <Spinner /> : <Content />}

// 복잡한 조건은 early return
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <Content data={data} />;
```

## 10. 금지 사항

```typescript
// ❌ alert(), confirm(), prompt() 사용 금지
alert('저장되었습니다');  // 금지

// ✅ Toast 사용
toast.success('저장되었습니다');

// ❌ 인라인 스타일 (특수한 경우 제외)
<div style={{ color: 'red' }}>  // 금지

// ✅ CSS 클래스 사용
<div className="text-error">

// ❌ any 타입 사용 금지
const data: any = {};  // 금지

// ✅ 적절한 타입 정의
const data: UserData = {};

// ❌ console.log 프로덕션 코드에 남기기
console.log(data);  // 금지

// ✅ 개발 환경에서만 또는 제거
if (import.meta.env.DEV) console.log(data);
```
