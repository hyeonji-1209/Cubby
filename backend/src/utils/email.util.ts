import nodemailer from 'nodemailer';

// Gmail SMTP 설정
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass, // Gmail 앱 비밀번호 사용
    },
  });
};

/**
 * 이메일 발송
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  const transporter = createTransporter();

  // 환경변수가 없으면 개발 모드로 간주
  if (!transporter) {
    console.log(`[DEV MODE] Email to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${html}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"Cubby" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

/**
 * 인증번호 이메일 발송
 */
export const sendVerificationEmail = async (
  email: string,
  code: string
): Promise<boolean> => {
  const subject = '[Cubby] 이메일 인증 코드';
  const html = `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #3b82f6; font-size: 28px; margin-bottom: 30px;">Cubby</h1>
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">안녕하세요!</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 30px;">회원가입을 위한 인증 코드입니다.</p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
      </div>
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">이 코드는 5분 동안 유효합니다.</p>
      <p style="font-size: 14px; color: #666;">본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">이 이메일은 Cubby에서 자동 발송되었습니다.</p>
    </div>
  `;

  return sendEmail(email, subject, html);
};
