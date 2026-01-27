import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { verificationApi } from '@/api/verification.api';
import './AuthPages.scss';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // 이메일 인증 관련 상태
  const [verificationCode, setVerificationCode] = useState('');
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSentAt, setCodeSentAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null); // 개발용 인증코드

  // 타이머 (5분)
  useEffect(() => {
    if (codeSentAt) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - codeSentAt.getTime()) / 1000);
        const remaining = 300 - elapsed; // 5분 = 300초
        if (remaining <= 0) {
          setCountdown(0);
          setCodeSentAt(null);
          setDevCode(null);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [codeSentAt]);

  // 전화번호 포맷팅
  const formatPhone = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // 이메일이 변경되면 인증 초기화
    if (isEmailVerified) {
      setIsEmailVerified(false);
      setEmailVerificationToken('');
    }
  };

  // 이메일 형식 검증
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 인증 코드 발송
  const handleSendCode = async () => {
    if (!isValidEmail(email)) {
      setLocalError('올바른 이메일 형식을 입력하세요');
      return;
    }

    setIsSendingCode(true);
    setLocalError('');
    setDevCode(null);

    try {
      const response = await verificationApi.sendEmailCodeForSignup(email);
      setCodeSentAt(new Date());
      setVerificationCode('');
      // 개발 환경에서는 인증코드가 응답에 포함됨
      if (response.data?.code) {
        setDevCode(response.data.code);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setLocalError(error?.response?.data?.message || '인증 코드 발송에 실패했습니다');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 인증 코드 확인
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setLocalError('6자리 인증 코드를 입력하세요');
      return;
    }

    setIsVerifying(true);
    setLocalError('');

    try {
      const response = await verificationApi.verifyEmailForSignup(email, verificationCode);
      setEmailVerificationToken(response.data.verificationToken);
      setIsEmailVerified(true);
      setCodeSentAt(null);
      setDevCode(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setLocalError(error?.response?.data?.message || '인증에 실패했습니다');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (!isEmailVerified) {
      setLocalError('이메일 인증을 완료해주세요');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (password.length < 8) {
      setLocalError('비밀번호는 8자 이상이어야 합니다');
      return;
    }

    try {
      await register(email, password, name, phone.replace(/-/g, ''), emailVerificationToken);
      navigate('/dashboard');
    } catch {
      // Error is handled by store
    }
  };

  const displayError = localError || error;

  const formatCountdown = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-page">
      <div className="auth-page__container">
        <div className="auth-page__header">
          <h1 className="auth-page__logo">Cubby</h1>
          <p className="auth-page__subtitle">초대 기반 모임 관리 플랫폼</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="auth-form__title">회원가입</h2>

          {displayError && <div className="auth-form__error">{displayError}</div>}

          <div className="auth-form__field">
            <label className="auth-form__label">이름</label>
            <input
              type="text"
              className="auth-form__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label">이메일</label>
            <div className="auth-form__input-group">
              <input
                type="email"
                className="auth-form__input"
                value={email}
                onChange={handleEmailChange}
                placeholder="이메일을 입력하세요"
                disabled={isEmailVerified}
                required
              />
              {!isEmailVerified && (
                <button
                  type="button"
                  className="auth-form__verify-btn"
                  onClick={handleSendCode}
                  disabled={isSendingCode || !isValidEmail(email)}
                >
                  {isSendingCode
                    ? '발송 중...'
                    : codeSentAt
                    ? '재발송'
                    : '인증코드 발송'}
                </button>
              )}
              {isEmailVerified && (
                <span className="auth-form__verified">인증완료</span>
              )}
            </div>
          </div>

          {codeSentAt && !isEmailVerified && (
            <div className="auth-form__field">
              <label className="auth-form__label">
                인증코드
                {countdown > 0 && (
                  <span className="auth-form__countdown">{formatCountdown(countdown)}</span>
                )}
              </label>
              {devCode && (
                <div className="auth-form__dev-code">
                  개발용 인증코드: <strong>{devCode}</strong>
                </div>
              )}
              <div className="auth-form__input-group">
                <input
                  type="text"
                  className="auth-form__input"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6자리 인증코드"
                  maxLength={6}
                />
                <button
                  type="button"
                  className="auth-form__verify-btn"
                  onClick={handleVerifyCode}
                  disabled={isVerifying || verificationCode.length !== 6}
                >
                  {isVerifying ? '확인 중...' : '확인'}
                </button>
              </div>
            </div>
          )}

          <div className="auth-form__field">
            <label className="auth-form__label">
              휴대폰 번호 <span className="auth-form__optional">(선택)</span>
            </label>
            <input
              type="tel"
              className="auth-form__input"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-1234-5678"
            />
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label">비밀번호</label>
            <input
              type="password"
              className="auth-form__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요 (8자 이상)"
              required
            />
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label">비밀번호 확인</label>
            <input
              type="password"
              className="auth-form__input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-form__submit"
            disabled={isLoading || !isEmailVerified}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </button>

          <p className="auth-form__footer">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
