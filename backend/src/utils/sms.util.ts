import axios from 'axios';

interface SmsResponse {
  result_code: string;
  message: string;
  msg_id?: string;
  success_cnt?: number;
  error_cnt?: number;
}

/**
 * 알리고 SMS 발송 유틸리티
 * https://smartsms.aligo.in/admin/api/spec.html
 */
export const sendSms = async (phone: string, message: string): Promise<boolean> => {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;

  // 환경변수가 없으면 개발 모드로 간주
  if (!apiKey || !userId || !sender) {
    console.log(`[DEV MODE] SMS to ${phone}: ${message}`);
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('user_id', userId);
    formData.append('sender', sender);
    formData.append('receiver', phone.replace(/-/g, ''));
    formData.append('msg', message);
    formData.append('testmode_yn', process.env.NODE_ENV === 'production' ? 'N' : 'Y');

    const response = await axios.post<SmsResponse>(
      'https://apis.aligo.in/send/',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.result_code === '1') {
      console.log(`SMS sent successfully to ${phone}`);
      return true;
    } else {
      console.error('SMS send failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('SMS send error:', error);
    return false;
  }
};

/**
 * 인증번호 SMS 발송
 */
export const sendVerificationSms = async (phone: string, code: string): Promise<boolean> => {
  const message = `[Cubby] 인증번호는 [${code}]입니다. 5분 내에 입력해주세요.`;
  return sendSms(phone, message);
};
