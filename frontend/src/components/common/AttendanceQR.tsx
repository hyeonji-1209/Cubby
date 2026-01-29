import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { attendanceApi } from '@/api';
import { useToast } from './Toast';
import type { QRToken, Attendance, AttendanceStatus } from '@/types';
import './AttendanceQR.scss';

interface AttendanceQRGeneratorProps {
  groupId: string;
  scheduleId: string;
  scheduleName: string;
  onClose: () => void;
}

// QR 코드 생성 컴포넌트 (관리자용)
export const AttendanceQRGenerator: React.FC<AttendanceQRGeneratorProps> = ({
  groupId,
  scheduleId,
  scheduleName,
  onClose,
}) => {
  const { showToast } = useToast();
  const [qrData, setQrData] = useState<QRToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const generateQR = async () => {
    setLoading(true);
    try {
      const response = await attendanceApi.generateQRToken(groupId, scheduleId);
      setQrData(response.data);
      setTimeLeft(5 * 60); // 5분
    } catch {
      showToast('error', 'QR 코드 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="attendance-qr">
      <div className="attendance-qr__header">
        <h3>출석 QR 코드</h3>
        <p className="attendance-qr__schedule-name">{scheduleName}</p>
      </div>

      <div className="attendance-qr__content">
        {loading ? (
          <div className="attendance-qr__loading">
            <div className="spinner" />
            <p>QR 코드 생성 중...</p>
          </div>
        ) : qrData && timeLeft > 0 ? (
          <>
            <div className="attendance-qr__code">
              <QRCodeSVG
                value={JSON.stringify({ type: 'attendance', token: qrData.token })}
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <div className="attendance-qr__timer">
              <span className={timeLeft < 60 ? 'warning' : ''}>
                남은 시간: {formatTime(timeLeft)}
              </span>
            </div>
            <p className="attendance-qr__hint">
              학생이 이 QR 코드를 스캔하면 출석이 체크됩니다
            </p>
          </>
        ) : (
          <div className="attendance-qr__expired">
            <p>QR 코드가 만료되었습니다</p>
            <button onClick={generateQR} className="attendance-qr__refresh-btn">
              새로 생성하기
            </button>
          </div>
        )}
      </div>

      <div className="attendance-qr__actions">
        {qrData && timeLeft > 0 && (
          <button onClick={generateQR} className="attendance-qr__refresh-btn">
            새로고침
          </button>
        )}
        <button onClick={onClose} className="attendance-qr__close-btn">
          닫기
        </button>
      </div>
    </div>
  );
};

interface AttendanceCheckInProps {
  onSuccess: (attendance: Attendance) => void;
  onClose: () => void;
}

// QR 스캔 결과 처리 컴포넌트 (학생용)
export const AttendanceCheckIn: React.FC<AttendanceCheckInProps> = ({
  onSuccess,
  onClose,
}) => {
  const { showToast } = useToast();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    if (!token.trim()) {
      showToast('error', 'QR 코드를 스캔해주세요');
      return;
    }

    setLoading(true);
    try {
      // QR 데이터 파싱
      let qrToken = token;
      try {
        const parsed = JSON.parse(token);
        if (parsed.type === 'attendance' && parsed.token) {
          qrToken = parsed.token;
        }
      } catch {
        // JSON이 아니면 그대로 사용
      }

      const response = await attendanceApi.checkInByQR(qrToken);
      showToast('success', response.data.status === 'late' ? '지각 처리되었습니다' : '출석 완료!');
      onSuccess(response.data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || '출석 체크에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-checkin">
      <div className="attendance-checkin__header">
        <h3>출석 체크</h3>
      </div>

      <div className="attendance-checkin__content">
        <p className="attendance-checkin__hint">
          선생님이 보여주는 QR 코드를 카메라로 스캔하세요
        </p>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="QR 스캔 결과가 여기에 입력됩니다"
          className="attendance-checkin__input"
        />
      </div>

      <div className="attendance-checkin__actions">
        <button
          onClick={handleCheckIn}
          disabled={loading || !token.trim()}
          className="attendance-checkin__submit-btn"
        >
          {loading ? '처리 중...' : '출석 체크'}
        </button>
        <button onClick={onClose} className="attendance-checkin__close-btn">
          취소
        </button>
      </div>
    </div>
  );
};

interface AttendanceListProps {
  groupId: string;
  scheduleId: string;
  isAdmin: boolean;
  members?: { userId: string; name: string }[];
  onManualCheck?: (userId: string, status: AttendanceStatus) => void;
}

// 출석 목록 컴포넌트
export const AttendanceList: React.FC<AttendanceListProps> = ({
  groupId,
  scheduleId,
  isAdmin,
  members = [],
  onManualCheck,
}) => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendances = async () => {
      try {
        const response = await attendanceApi.getBySchedule(groupId, scheduleId);
        setAttendances(response.data);
      } catch {
        console.error('Failed to fetch attendances');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendances();
  }, [groupId, scheduleId]);

  const getStatusLabel = (status: AttendanceStatus) => {
    const labels: Record<AttendanceStatus, string> = {
      present: '출석',
      late: '지각',
      absent: '결석',
      excused: '사유',
      early_leave: '조퇴',
    };
    return labels[status];
  };

  const getStatusClass = (status: AttendanceStatus) => {
    return `attendance-status--${status}`;
  };

  if (loading) {
    return <div className="attendance-list__loading">불러오는 중...</div>;
  }

  return (
    <div className="attendance-list">
      {attendances.length === 0 ? (
        <p className="attendance-list__empty">출석 기록이 없습니다</p>
      ) : (
        <ul className="attendance-list__items">
          {attendances.map((attendance) => (
            <li key={attendance.id} className="attendance-list__item">
              <span className="attendance-list__name">{attendance.userName}</span>
              <span className={`attendance-list__status ${getStatusClass(attendance.status)}`}>
                {getStatusLabel(attendance.status)}
              </span>
              {attendance.checkedAt && (
                <span className="attendance-list__time">
                  {new Date(attendance.checkedAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              {isAdmin && onManualCheck && (
                <div className="attendance-list__actions">
                  <button
                    onClick={() => onManualCheck(attendance.userId, 'present')}
                    className="attendance-list__btn attendance-list__btn--present"
                    title="출석"
                  >
                    O
                  </button>
                  <button
                    onClick={() => onManualCheck(attendance.userId, 'absent')}
                    className="attendance-list__btn attendance-list__btn--absent"
                    title="결석"
                  >
                    X
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && members.length > 0 && (
        <div className="attendance-list__unrecorded">
          <h4>미기록</h4>
          <ul>
            {members
              .filter((m) => !attendances.find((a) => a.userId === m.userId))
              .map((member) => (
                <li key={member.userId} className="attendance-list__item">
                  <span className="attendance-list__name">{member.name}</span>
                  {onManualCheck && (
                    <div className="attendance-list__actions">
                      <button
                        onClick={() => onManualCheck(member.userId, 'present')}
                        className="attendance-list__btn attendance-list__btn--present"
                      >
                        출석
                      </button>
                      <button
                        onClick={() => onManualCheck(member.userId, 'absent')}
                        className="attendance-list__btn attendance-list__btn--absent"
                      >
                        결석
                      </button>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};
