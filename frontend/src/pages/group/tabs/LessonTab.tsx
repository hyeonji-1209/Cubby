import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { lessonRecordApi, attendanceApi } from '@/api';
import type { LessonRecord, LessonQRToken } from '@/api';
import type { Attendance, LessonSchedule } from '@/types';
import { DAYS_OF_WEEK } from '@/constants/labels';
import type { LessonTabProps } from './types';
import './LessonTab.scss';

const LessonTab = ({
  groupId,
  member,
  onEarlyLeave,
}: LessonTabProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 오늘 수업 정보
  const [todayRecord, setTodayRecord] = useState<LessonRecord | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<LessonSchedule | null>(null);
  const [isLessonTime, setIsLessonTime] = useState(false);

  // QR 토큰
  const [qrToken, setQrToken] = useState<LessonQRToken | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // 수업 기록 폼
  const [currentContent, setCurrentContent] = useState('');
  const [homework, setHomework] = useState('');
  const [note, setNote] = useState('');

  // 이전 수업 기록 목록
  const [previousRecords, setPreviousRecords] = useState<LessonRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 활성 탭
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  const memberId = member?.userId || member?.user?.id;

  // 수업 시간 체크
  const checkLessonTime = useCallback((schedule: LessonSchedule | null) => {
    if (!schedule) return false;
    const now = new Date();
    const todayDayOfWeek = now.getDay();
    if (schedule.dayOfWeek !== todayDayOfWeek) return false;

    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

    const lessonStart = new Date(now);
    lessonStart.setHours(startHour, startMin, 0, 0);

    const lessonEnd = new Date(now);
    lessonEnd.setHours(endHour, endMin, 0, 0);

    const tenMinutesBefore = new Date(lessonStart.getTime() - 10 * 60 * 1000);

    return now >= tenMinutesBefore && now <= lessonEnd;
  }, []);

  // 오늘 수업 데이터 로드
  const loadTodayLesson = useCallback(async () => {
    if (!groupId || !memberId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await lessonRecordApi.getTodayOrCreate(groupId, memberId);
      if (response.success && response.data) {
        setTodayRecord(response.data.record);
        setTodayAttendance(response.data.attendance);
        setTodaySchedule(response.data.lessonSchedule);
        setCurrentContent(response.data.record.currentContent || '');
        setHomework(response.data.record.homework || '');
        setNote(response.data.record.note || '');
        setIsLessonTime(checkLessonTime(response.data.lessonSchedule));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '오늘 수업이 없습니다';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [groupId, memberId, checkLessonTime]);

  // 수업 기록 히스토리 로드
  const loadHistory = useCallback(async () => {
    if (!groupId || !memberId) return;

    setHistoryLoading(true);
    try {
      const response = await lessonRecordApi.getByMember(groupId, memberId, { limit: 20 });
      if (response.success && response.data) {
        setPreviousRecords(response.data.items);
      }
    } catch {
      // 에러 무시
    } finally {
      setHistoryLoading(false);
    }
  }, [groupId, memberId]);

  // QR 토큰 생성
  const generateQR = useCallback(async () => {
    if (!groupId || !memberId) return;

    setQrLoading(true);
    try {
      const response = await attendanceApi.generateLessonQRToken(groupId, memberId);
      if (response.success && response.data) {
        setQrToken(response.data);
      }
    } catch {
      // 에러 무시
    } finally {
      setQrLoading(false);
    }
  }, [groupId, memberId]);

  // 저장
  const handleSave = async () => {
    if (!groupId || !memberId || !todayRecord) return;

    setSaving(true);
    try {
      await lessonRecordApi.save(groupId, memberId, {
        lessonDate: todayRecord.lessonDate,
        lessonStartTime: todayRecord.lessonStartTime,
        lessonEndTime: todayRecord.lessonEndTime,
        currentContent,
        homework,
        note,
      });
    } catch {
      // 에러 무시
    } finally {
      setSaving(false);
    }
  };

  // 조퇴 처리
  const handleEarlyLeave = async () => {
    if (!todayAttendance?.id || !onEarlyLeave) return;
    await onEarlyLeave(todayAttendance.id);
    // 출석 정보 갱신
    loadTodayLesson();
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (member) {
      loadTodayLesson();
      loadHistory();
    }
  }, [member, loadTodayLesson, loadHistory]);

  // 수업 시간일 때 QR 자동 생성
  useEffect(() => {
    if (isLessonTime && !qrToken && !todayAttendance) {
      generateQR();
    }
  }, [isLessonTime, qrToken, todayAttendance, generateQR]);

  // 수업 시간 체크 주기적 갱신
  useEffect(() => {
    if (!todaySchedule) return;
    const interval = setInterval(() => {
      setIsLessonTime(checkLessonTime(todaySchedule));
    }, 60000); // 1분마다 체크
    return () => clearInterval(interval);
  }, [todaySchedule, checkLessonTime]);

  const memberName = member?.nickname || member?.user?.name || '학생';

  return (
    <div className="lesson-tab">
      <div className="lesson-tab__header">
        <h2 className="lesson-tab__title">{memberName} 수업</h2>
        {isLessonTime && <span className="lesson-tab__live-badge">수업 중</span>}
      </div>

      {loading ? (
        <div className="lesson-tab__loading">로딩 중...</div>
      ) : error ? (
        <div className="lesson-tab__error">{error}</div>
      ) : (
        <div className="lesson-tab__content">
          {/* 탭 */}
          <div className="lesson-tab__tabs">
            <button
              className={`lesson-tab__tab ${activeTab === 'today' ? 'active' : ''}`}
              onClick={() => setActiveTab('today')}
            >
              오늘 수업
            </button>
            <button
              className={`lesson-tab__tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              수업 기록
            </button>
          </div>

          {activeTab === 'today' && todayRecord && (
            <div className="lesson-tab__today">
              <div className="lesson-tab__columns">
                {/* 왼쪽: 수업 정보, 출석, QR */}
                <div className="lesson-tab__left">
                  {/* 수업 정보 */}
                  <div className="lesson-tab__info-card">
                    <div className="lesson-tab__schedule-info">
                      <span className="lesson-tab__day">
                        {todaySchedule && DAYS_OF_WEEK[todaySchedule.dayOfWeek]}요일
                      </span>
                      <span className="lesson-tab__time">
                        {todayRecord.lessonStartTime} - {todayRecord.lessonEndTime}
                      </span>
                    </div>

                    {/* 출석 상태 */}
                    <div className="lesson-tab__attendance">
                      {todayAttendance ? (
                        <div className={`lesson-tab__status lesson-tab__status--${todayAttendance.status}`}>
                          {todayAttendance.status === 'present' && '출석 완료'}
                          {todayAttendance.status === 'late' && '지각'}
                          {todayAttendance.status === 'early_leave' && '조퇴'}
                          {todayAttendance.checkedAt && (
                            <span className="lesson-tab__check-time">
                              {new Date(todayAttendance.checkedAt).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="lesson-tab__status lesson-tab__status--pending">
                          출석 대기
                        </div>
                      )}

                      {/* 조퇴 버튼 */}
                      {todayAttendance &&
                        todayAttendance.status !== 'early_leave' &&
                        todayAttendance.status !== 'absent' && (
                          <button
                            className="lesson-tab__early-leave-btn"
                            onClick={handleEarlyLeave}
                          >
                            조퇴 처리
                          </button>
                        )}
                    </div>
                  </div>

                  {/* QR 코드 (수업 시간 + 미출석) */}
                  {isLessonTime && !todayAttendance && (
                    <div className="lesson-tab__qr">
                      {qrLoading ? (
                        <div className="lesson-tab__qr-loading">QR 생성 중...</div>
                      ) : qrToken ? (
                        <>
                          <QRCodeSVG
                            value={`${window.location.origin}/attendance/checkin?token=${qrToken.token}`}
                            size={200}
                            level="M"
                            marginSize={2}
                          />
                          <p className="lesson-tab__qr-hint">
                            학생이 스캔하여 출석 체크
                          </p>
                        </>
                      ) : (
                        <button
                          className="lesson-tab__qr-generate"
                          onClick={generateQR}
                        >
                          QR 생성
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 오른쪽: 수업 기록 */}
                <div className="lesson-tab__right">
                  {/* 지난 수업 내용 (읽기 전용) */}
                  {todayRecord.previousContent && (
                    <div className="lesson-tab__section">
                      <label className="lesson-tab__label">지난 수업 내용</label>
                      <div className="lesson-tab__readonly">
                        {todayRecord.previousContent}
                      </div>
                    </div>
                  )}

                  {/* 이번 수업 내용 */}
                  <div className="lesson-tab__section">
                    <label className="lesson-tab__label">이번 수업 내용</label>
                    <textarea
                      className="lesson-tab__textarea"
                      placeholder="오늘 수업에서 다룬 내용을 입력하세요..."
                      value={currentContent}
                      onChange={(e) => setCurrentContent(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {/* 과제 */}
                  <div className="lesson-tab__section">
                    <label className="lesson-tab__label">과제</label>
                    <textarea
                      className="lesson-tab__textarea"
                      placeholder="과제 내용을 입력하세요..."
                      value={homework}
                      onChange={(e) => setHomework(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* 비고 */}
                  <div className="lesson-tab__section">
                    <label className="lesson-tab__label">비고</label>
                    <textarea
                      className="lesson-tab__textarea"
                      placeholder="특이사항이 있으면 입력하세요..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* 저장 버튼 */}
                  <button
                    className="lesson-tab__save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="lesson-tab__history">
              {historyLoading ? (
                <div className="lesson-tab__loading">로딩 중...</div>
              ) : previousRecords.length === 0 ? (
                <div className="lesson-tab__empty">수업 기록이 없습니다.</div>
              ) : (
                <div className="lesson-tab__history-list">
                  {previousRecords.map((record) => (
                    <div key={record.id} className="lesson-tab__history-item">
                      <div className="lesson-tab__history-header">
                        <span className="lesson-tab__history-date">
                          {record.lessonDate}
                        </span>
                        <span className="lesson-tab__history-time">
                          {record.lessonStartTime} - {record.lessonEndTime}
                        </span>
                      </div>
                      {record.currentContent && (
                        <div className="lesson-tab__history-content">
                          <strong>수업 내용:</strong> {record.currentContent}
                        </div>
                      )}
                      {record.homework && (
                        <div className="lesson-tab__history-homework">
                          <strong>과제:</strong> {record.homework}
                        </div>
                      )}
                      {record.note && (
                        <div className="lesson-tab__history-note">
                          <strong>비고:</strong> {record.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonTab;
