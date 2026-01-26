import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { userApi } from '@/api';
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
              <label className="settings__label">이메일</label>
              <input
                type="email"
                className="settings__input settings__input--disabled"
                value={user?.email || ''}
                disabled
              />
              <span className="settings__hint">이메일은 변경할 수 없습니다</span>
            </div>

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
