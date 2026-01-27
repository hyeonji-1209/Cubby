import type { User } from '@/types';

// 프로필 섹션
interface ProfileSectionProps {
  user: User | null;
  name: string;
  setName: (name: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  profileSaving: boolean;
  onSaveProfile: () => void;
  // 이메일 인증
  showEmailVerification: boolean;
  newEmail: string;
  setNewEmail: (email: string) => void;
  emailCode: string;
  setEmailCode: (code: string) => void;
  emailCodeSentAt: Date | null;
  emailCountdown: number;
  isSendingEmailCode: boolean;
  isVerifyingEmail: boolean;
  onSendEmailCode: () => void;
  onVerifyEmail: () => void;
  onCancelEmailVerification: () => void;
  onStartEmailVerification: () => void;
  formatCountdown: (seconds: number) => string;
}

export const ProfileSection = ({
  user,
  name,
  setName,
  phone,
  setPhone,
  profileSaving,
  onSaveProfile,
  showEmailVerification,
  newEmail,
  setNewEmail,
  emailCode,
  setEmailCode,
  emailCodeSentAt,
  emailCountdown,
  isSendingEmailCode,
  isVerifyingEmail,
  onSendEmailCode,
  onVerifyEmail,
  onCancelEmailVerification,
  onStartEmailVerification,
  formatCountdown,
}: ProfileSectionProps) => (
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
                onClick={onStartEmailVerification}
              >
                인증하기
              </button>
            )}
          </div>
        </div>

        {showEmailVerification && (
          <EmailVerificationBox
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            emailCode={emailCode}
            setEmailCode={setEmailCode}
            emailCodeSentAt={emailCodeSentAt}
            emailCountdown={emailCountdown}
            isSendingEmailCode={isSendingEmailCode}
            isVerifyingEmail={isVerifyingEmail}
            onSendEmailCode={onSendEmailCode}
            onVerifyEmail={onVerifyEmail}
            onCancel={onCancelEmailVerification}
            formatCountdown={formatCountdown}
          />
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
          onClick={onSaveProfile}
          disabled={profileSaving}
        >
          {profileSaving ? '저장 중...' : '프로필 저장'}
        </button>
      </div>
    </div>
  </div>
);

// 이메일 인증 박스
interface EmailVerificationBoxProps {
  newEmail: string;
  setNewEmail: (email: string) => void;
  emailCode: string;
  setEmailCode: (code: string) => void;
  emailCodeSentAt: Date | null;
  emailCountdown: number;
  isSendingEmailCode: boolean;
  isVerifyingEmail: boolean;
  onSendEmailCode: () => void;
  onVerifyEmail: () => void;
  onCancel: () => void;
  formatCountdown: (seconds: number) => string;
}

const EmailVerificationBox = ({
  newEmail,
  setNewEmail,
  emailCode,
  setEmailCode,
  emailCodeSentAt,
  emailCountdown,
  isSendingEmailCode,
  isVerifyingEmail,
  onSendEmailCode,
  onVerifyEmail,
  onCancel,
  formatCountdown,
}: EmailVerificationBoxProps) => (
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
          onClick={onSendEmailCode}
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
            onClick={onVerifyEmail}
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
      onClick={onCancel}
    >
      취소
    </button>
  </div>
);

// 비밀번호 변경 섹션
interface PasswordSectionProps {
  currentPassword: string;
  setCurrentPassword: (password: string) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  passwordSaving: boolean;
  passwordError: string;
  onChangePassword: () => void;
}

export const PasswordSection = ({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordSaving,
  passwordError,
  onChangePassword,
}: PasswordSectionProps) => (
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
          onClick={onChangePassword}
          disabled={passwordSaving}
        >
          {passwordSaving ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>
    </div>
  </div>
);

// 계정 정보 섹션
interface AccountInfoSectionProps {
  user: User | null;
}

export const AccountInfoSection = ({ user }: AccountInfoSectionProps) => (
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
);

// 위험 구역 섹션
interface DangerZoneSectionProps {
  onLogout: () => void;
  onShowDeleteModal: () => void;
}

export const DangerZoneSection = ({ onLogout, onShowDeleteModal }: DangerZoneSectionProps) => (
  <div className="settings__section settings__section--danger">
    <h2 className="settings__section-title">계정 관리</h2>
    <div className="settings__card">
      <div className="settings__danger-actions">
        <button
          className="settings__btn settings__btn--outline"
          onClick={onLogout}
        >
          로그아웃
        </button>
        <button
          className="settings__btn settings__btn--danger"
          onClick={onShowDeleteModal}
        >
          회원 탈퇴
        </button>
      </div>
      <p className="settings__warning">
        회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
      </p>
    </div>
  </div>
);
