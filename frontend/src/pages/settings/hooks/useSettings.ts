import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { userApi } from '@/api';
import { verificationApi } from '@/api/verification.api';
import { useToast } from '@/components';

export const useSettings = () => {
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

  const formatCountdown = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

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

  const cancelEmailVerification = () => {
    setShowEmailVerification(false);
    setNewEmail('');
    setEmailCode('');
    setEmailCodeSentAt(null);
  };

  const startEmailVerification = () => {
    setNewEmail(user?.email || '');
    setShowEmailVerification(true);
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
    if (!deletePassword && user?.provider === 'local') {
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

  return {
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
  };
};
