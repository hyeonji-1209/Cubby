// 입력값 검증 및 보안 유틸리티

/**
 * HTML 태그 및 스크립트 제거
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // HTML 태그 제거
    .replace(/[<>'"&]/g, "") // 특수문자 제거
    .trim();
}

/**
 * 이름 검증
 * - 2~20자
 * - 한글, 영문, 숫자, 공백만 허용
 * - 연속 공백 불가
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(name);

  if (!sanitized) {
    return { valid: false, error: "이름을 입력해주세요." };
  }

  if (sanitized.length < 2) {
    return { valid: false, error: "이름은 2자 이상이어야 합니다." };
  }

  if (sanitized.length > 20) {
    return { valid: false, error: "이름은 20자 이하여야 합니다." };
  }

  // 한글, 영문, 숫자, 공백만 허용
  const nameRegex = /^[가-힣a-zA-Z0-9\s]+$/;
  if (!nameRegex.test(sanitized)) {
    return { valid: false, error: "이름에 특수문자를 사용할 수 없습니다." };
  }

  // 연속 공백 체크
  if (/\s{2,}/.test(sanitized)) {
    return { valid: false, error: "연속된 공백은 사용할 수 없습니다." };
  }

  return { valid: true };
}

/**
 * 이메일 검증
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, error: "이메일을 입력해주세요." };
  }

  // 기본 이메일 형식 검증
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "올바른 이메일 형식이 아닙니다." };
  }

  // 길이 제한
  if (trimmed.length > 254) {
    return { valid: false, error: "이메일이 너무 깁니다." };
  }

  // 위험한 문자 체크
  if (/[<>'"&;]/.test(trimmed)) {
    return { valid: false, error: "이메일에 허용되지 않는 문자가 포함되어 있습니다." };
  }

  return { valid: true };
}

/**
 * 비밀번호 검증
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "비밀번호를 입력해주세요." };
  }

  if (password.length < 6) {
    return { valid: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  if (password.length > 72) {
    return { valid: false, error: "비밀번호는 72자 이하여야 합니다." };
  }

  // 공백만 있는 경우 체크
  if (!password.trim()) {
    return { valid: false, error: "비밀번호에 공백만 사용할 수 없습니다." };
  }

  return { valid: true };
}

/**
 * 전화번호 검증 (한국)
 * - 010, 011, 016, 017, 018, 019로 시작
 * - 숫자만 허용 (하이픈 자동 제거)
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  // 숫자만 추출
  const digitsOnly = phone.replace(/\D/g, "");

  if (!digitsOnly) {
    return { valid: false, error: "전화번호를 입력해주세요." };
  }

  // 한국 휴대폰 번호 형식 (10-11자리)
  const phoneRegex = /^01[016789]\d{7,8}$/;
  if (!phoneRegex.test(digitsOnly)) {
    return { valid: false, error: "올바른 전화번호 형식이 아닙니다. (예: 01012345678)" };
  }

  return { valid: true };
}

/**
 * 전화번호 정규화 (숫자만)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * 전화번호 포맷 (010-1234-5678)
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

/**
 * 비밀번호 강도 체크 (선택적)
 */
export function checkPasswordStrength(password: string): "weak" | "medium" | "strong" {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 2) return "weak";
  if (strength <= 4) return "medium";
  return "strong";
}
