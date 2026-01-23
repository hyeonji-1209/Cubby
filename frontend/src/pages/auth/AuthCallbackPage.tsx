import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store';
import './AuthPages.scss';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, fetchUser } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage('소셜 로그인에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      if (accessToken && refreshToken) {
        try {
          // 토큰 저장
          setTokens(accessToken, refreshToken);

          // 사용자 정보 가져오기
          await fetchUser();

          // 대시보드로 이동
          navigate('/dashboard', { replace: true });
        } catch {
          setStatus('error');
          setErrorMessage('로그인 처리 중 오류가 발생했습니다.');
        }
      } else {
        setStatus('error');
        setErrorMessage('인증 정보를 받지 못했습니다.');
      }
    };

    handleCallback();
  }, [searchParams, setTokens, fetchUser, navigate]);

  if (status === 'error') {
    return (
      <div className="auth-page">
        <div className="auth-page__container">
          <div className="auth-callback">
            <div className="auth-callback__icon auth-callback__icon--error">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h2 className="auth-callback__title">로그인 실패</h2>
            <p className="auth-callback__message">{errorMessage}</p>
            <button
              className="auth-callback__button"
              onClick={() => navigate('/login', { replace: true })}
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-page__container">
        <div className="auth-callback">
          <div className="auth-callback__spinner" />
          <h2 className="auth-callback__title">로그인 중...</h2>
          <p className="auth-callback__message">잠시만 기다려주세요.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
