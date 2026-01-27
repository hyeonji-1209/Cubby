import { Modal } from '@/components';
import { useSettings } from './hooks';
import { ProfileSection, PasswordSection, AccountInfoSection, DangerZoneSection } from './components';
import './SettingsPage.scss';

const SettingsPage = () => {
  const {
    user,
    // Profile
    name,
    setName,
    phone,
    setPhone,
    profileSaving,
    handleSaveProfile,
    // Email verification
    showEmailVerification,
    newEmail,
    setNewEmail,
    emailCode,
    setEmailCode,
    emailCodeSentAt,
    emailCountdown,
    isSendingEmailCode,
    isVerifyingEmail,
    handleSendEmailCode,
    handleVerifyEmail,
    cancelEmailVerification,
    startEmailVerification,
    formatCountdown,
    // Password
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordSaving,
    passwordError,
    handleChangePassword,
    // Delete account
    showDeleteModal,
    setShowDeleteModal,
    deletePassword,
    setDeletePassword,
    deleteLoading,
    handleDeleteAccount,
    // Logout
    handleLogout,
  } = useSettings();

  return (
    <div className="settings">
      <h1 className="settings__title">설정</h1>

      {/* 프로필 섹션 */}
      <ProfileSection
        user={user}
        name={name}
        setName={setName}
        phone={phone}
        setPhone={setPhone}
        profileSaving={profileSaving}
        onSaveProfile={handleSaveProfile}
        showEmailVerification={showEmailVerification}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        emailCode={emailCode}
        setEmailCode={setEmailCode}
        emailCodeSentAt={emailCodeSentAt}
        emailCountdown={emailCountdown}
        isSendingEmailCode={isSendingEmailCode}
        isVerifyingEmail={isVerifyingEmail}
        onSendEmailCode={handleSendEmailCode}
        onVerifyEmail={handleVerifyEmail}
        onCancelEmailVerification={cancelEmailVerification}
        onStartEmailVerification={startEmailVerification}
        formatCountdown={formatCountdown}
      />

      {/* 비밀번호 변경 섹션 (소셜 로그인이 아닌 경우만) */}
      {user?.provider === 'local' && (
        <PasswordSection
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          passwordSaving={passwordSaving}
          passwordError={passwordError}
          onChangePassword={handleChangePassword}
        />
      )}

      {/* 계정 정보 섹션 */}
      <AccountInfoSection user={user} />

      {/* 위험 구역 */}
      <DangerZoneSection
        onLogout={handleLogout}
        onShowDeleteModal={() => setShowDeleteModal(true)}
      />

      {/* 회원 탈퇴 모달 */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        isLocalProvider={user?.provider === 'local'}
        deletePassword={deletePassword}
        setDeletePassword={setDeletePassword}
        deleteLoading={deleteLoading}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
};

// 회원 탈퇴 모달 컴포넌트
interface DeleteAccountModalProps {
  isOpen: boolean;
  isLocalProvider?: boolean;
  deletePassword: string;
  setDeletePassword: (password: string) => void;
  deleteLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAccountModal = ({
  isOpen,
  isLocalProvider,
  deletePassword,
  setDeletePassword,
  deleteLoading,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="회원 탈퇴"
    description="정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다."
    showCloseButton
    size="sm"
    actions={
      <>
        <button className="modal__cancel" onClick={onClose}>
          취소
        </button>
        <button
          className="modal__submit modal__submit--danger"
          onClick={onConfirm}
          disabled={deleteLoading || (isLocalProvider && !deletePassword)}
        >
          {deleteLoading ? '처리 중...' : '탈퇴하기'}
        </button>
      </>
    }
  >
    {isLocalProvider && (
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
);

export default SettingsPage;
