import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import './AuthPages.scss';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (password.length < 8) {
      setLocalError('비밀번호는 8자 이상이어야 합니다');
      return;
    }

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch {
      // Error is handled by store
    }
  };

  const displayError = localError || error;

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
            <input
              type="email"
              className="auth-form__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              required
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
            disabled={isLoading}
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
