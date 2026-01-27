import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { userApi } from '@/api';
import { verificationApi } from '@/api/verification.api';
import { useToast, Modal } from '@/components';
import './SettingsPage.scss';

const SettingsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout, fetchUser } = useAuthStore();

  // 프로필 수정
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // 이메일 인증
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSentAt, setEmailCodeSentAt] = useState<Date | null>(null);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  // 이메일 인증 타이머
  useEffect(() => {
    if (emailCodeSentAt) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - emailCodeSentAt.getTime()) / 1000);
        const remaining = 300 - elapsed;
        if (remaining <= 0) {
          setEmailCountdown(0);
          setEmailCodeSentAt(null);
        } else {
          setEmailCountdown(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [emailCodeSentAt]);

  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 회원 탈퇴
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 이메일 인증 코드 발송
  const handleSendEmailCode = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('올바른 이메일을 입력해주세요.');
      return;
    }

    setIsSendingEmailCode(true);
    try {
      await verificationApi.sendEmailCode(newEmail);
      setEmailCodeSentAt(new Date());
      setEmailCode('');
      toast.success('인증 코드가 발송되었습니다.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || '인증 코드 발송에 실패했습니다.');
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  // 이메일 인증 확인
  const handleVerifyEmail = async () => {
    if (emailCode.length !== 6) {
      toast.error('6자리 인증 코드를 입력해주세요.');
      return;
    }

    setIsVerifyingEmail(true);
    try {
      await verificationApi.verifyEmail(newEmail, emailCode);
      await fetchUser();
      setShowEmailVerification(false);
      setNewEmail('');
      setEmailCode('');
      setEmailCodeSentAt(null);
      toast.success('이메일이 인증되었습니다.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || '인증에 실패했습니다.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }

    setProfileSaving(true);
    try {
      await userApi.updateMe({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      await fetchUser();
      toast.success('프로필이 저장되었습니다.');
    } catch {
      toast.error('프로필 저장에 실패했습니다.');
    } finally {
      setProfileSaving(false);
    }
  };

  // 비밀번호 변경
  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setPasswordSaving(true);
    try {
      await userApi.updatePassword(currentPassword, newPassword);
      toast.success('비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('현재 비밀번호가 올바르지 않습니다.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // 회원 탈퇴
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }

    setDeleteLoading(true);
    try {
      await userApi.deleteMe(deletePassword);
      toast.success('계정이 삭제되었습니다.');
      logout();
      navigate('/login');
    } catch {
      toast.error('비밀번호가 올바르지 않습니다.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="settings">
      <h1 className="settings__title">설정</h1>

      {/* 프로필 섹션 */}
      <div className="settings__section">
        <h2 className="settings__section-title">프로필</h2>
        <div className="settings__card">
          <div className="settings__avatar">
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} />
            ) : (
              <span>{user?.name?.charAt(0) || '?'}</span>
            )}
          </div>

          <div className="settings__form">
            <div className="settings__field">
              <label className="settings__label">이름</label>
              <input
                type="text"
                className="settings__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div className="settings__field">
              <label className="settings__label">
                이메일
                {user?.emailVerified && (
                  <span className="settings__badge settings__badge--success">인증됨</span>
                )}
              </label>
              <div className="settings__input-row">
                <input
                  type="email"
                  className="settings__input"
                  value={user?.email || ''}
                  disabled
                />
                {!user?.emailVerified && !showEmailVerification && (
                  <button
                    type="button"
                    className="settings__btn settings__btn--small"
                    onClick={() => {
                      setNewEmail(user?.email || '');
                      setShowEmailVerification(true);
                    }}
                  >
                    인증하기
                  </button>
                )}
              </div>
            </div>

            {showEmailVerification && (
              <div className="settings__verification-box">
                <div className="settings__field">
                  <label className="settings__label">이메일 주소 확인</label>
                  <div className="settings__input-row">
                    <input
                      type="email"
                      className="settings__input"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="이메일 주소"
                    />
                    <button
                      type="button"
                      className="settings__btn settings__btn--small"
                      onClick={handleSendEmailCode}
                      disabled={isSendingEmailCode || !newEmail.includes('@')}
                    >
                      {isSendingEmailCode ? '발송 중...' : emailCodeSentAt ? '재발송' : '코드 발송'}
                    </button>
                  </div>
                </div>

                {emailCodeSentAt && (
                  <div className="settings__field">
                    <label className="settings__label">
                      인증 코드
                      {emailCountdown > 0 && (
                        <span className="settings__countdown">{formatCountdown(emailCountdown)}</span>
                      )}
                    </label>
                    <div className="settings__input-row">
                      <input
                        type="text"
                        className="settings__input"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6자리 인증 코드"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        className="settings__btn settings__btn--small settings__btn--primary"
                        onClick={handleVerifyEmail}
                        disabled={isVerifyingEmail || emailCode.length !== 6}
                      >
                        {isVerifyingEmail ? '확인 중...' : '인증'}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="settings__btn settings__btn--text"
                  onClick={() => {
                    setShowEmailVerification(false);
                    setNewEmail('');
                    setEmailCode('');
                    setEmailCodeSentAt(null);
                  }}
                >
                  취소
                </button>
              </div>
            )}

            <div className="settings__field">
              <label className="settings__label">전화번호</label>
              <input
                type="tel"
                className="settings__input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>

            <button
              className="settings__btn settings__btn--primary"
              onClick={handleSaveProfile}
              disabled={profileSaving}
            >
              {profileSaving ? '저장 중...' : '프로필 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 섹션 (소셜 로그인이 아닌 경우만) */}
      {user?.provider === 'local' && (
        <div className="settings__section">
          <h2 className="settings__section-title">비밀번호 변경</h2>
          <div className="settings__card">
            <div className="settings__form">
              {passwordError && (
                <div className="settings__error">{passwordError}</div>
              )}

              <div className="settings__field">
                <label className="settings__label">현재 비밀번호</label>
                <input
                  type="password"
                  className="settings__input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호 입력"
                />
              </div>

              <div className="settings__field">
                <label className="settings__label">새 비밀번호</label>
                <input
                  type="password"
                  className="settings__input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (8자 이상)"
                />
              </div>

              <div className="settings__field">
                <label className="settings__label">새 비밀번호 확인</label>
                <input
                  type="password"
                  className="settings__input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 확인"
                />
              </div>

              <button
                className="settings__btn settings__btn--primary"
                onClick={handleChangePassword}
                disabled={passwordSaving}
              >
                {passwordSaving ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 정보 섹션 */}
      <div className="settings__section">
        <h2 className="settings__section-title">계정 정보</h2>
        <div className="settings__card">
          <div className="settings__info-list">
            <div className="settings__info-item">
              <span className="settings__info-label">로그인 방식</span>
              <span className="settings__info-value">
                {user?.provider === 'local' && '이메일/비밀번호'}
                {user?.provider === 'google' && 'Google'}
                {user?.provider === 'kakao' && 'Kakao'}
              </span>
            </div>
            <div className="settings__info-item">
              <span className="settings__info-label">가입일</span>
              <span className="settings__info-value">
                {user?.createdAt && new Date(user.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className="settings__info-item">
              <span className="settings__info-label">이메일 인증</span>
              <span className={`settings__info-value ${user?.emailVerified ? 'verified' : 'unverified'}`}>
                {user?.emailVerified ? '인증됨' : '미인증'}
              </span>
            </div>
            <div className="settings__info-item">
              <span className="settings__info-label">휴대폰 인증</span>
              <span className={`settings__info-value ${user?.phoneVerified ? 'verified' : 'unverified'}`}>
                {user?.phoneVerified ? '인증됨' : '미인증'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 위험 구역 */}
      <div className="settings__section settings__section--danger">
        <h2 className="settings__section-title">계정 관리</h2>
        <div className="settings__card">
          <div className="settings__danger-actions">
            <button
              className="settings__btn settings__btn--outline"
              onClick={handleLogout}
            >
              로그아웃
            </button>
            <button
              className="settings__btn settings__btn--danger"
              onClick={() => setShowDeleteModal(true)}
            >
              회원 탈퇴
            </button>
          </div>
          <p className="settings__warning">
            회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
          </p>
        </div>
      </div>

      {/* 회원 탈퇴 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="회원 탈퇴"
        description="정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다."
        showCloseButton
        size="sm"
        actions={
          <>
            <button
              className="modal__cancel"
              onClick={() => setShowDeleteModal(false)}
            >
              취소
            </button>
            <button
              className="modal__submit modal__submit--danger"
              onClick={handleDeleteAccount}
              disabled={deleteLoading || (user?.provider === 'local' && !deletePassword)}
            >
              {deleteLoading ? '처리 중...' : '탈퇴하기'}
            </button>
          </>
        }
      >
        {user?.provider === 'local' && (
          <div className="modal__field">
            <label className="modal__label">비밀번호 확인</label>
            <input
              type="password"
              className="modal__input"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SettingsPage;
