import { useState, useEffect, useCallback } from 'react';
import ReactCalendar from 'react-calendar';
import { EmptyState, useToast } from '@/components';
import { lessonRoomApi } from '@/api';
import type { LessonRoom, LessonRoomReservation, AvailableSlotsResponse } from '@/api/lessonRoom.api';

interface LessonRoomReservationsTabProps {
  groupId: string;
  isAdmin: boolean;
  operatingHours?: {
    openTime: string;
    closeTime: string;
  };
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 최대 예약 가능 주
const MAX_WEEKS_ADVANCE = 3;

const LessonRoomReservationsTab: React.FC<LessonRoomReservationsTabProps> = ({
  groupId,
  isAdmin,
  operatingHours = { openTime: '09:00', closeTime: '22:00' },
}) => {
  const toast = useToast();

  // 상태
  const [lessonRooms, setLessonRooms] = useState<LessonRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<LessonRoom | null>(null);
  const [reservationDate, setReservationDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotsResponse | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [myReservations, setMyReservations] = useState<LessonRoomReservation[]>([]);
  const [myReservationsLoading, setMyReservationsLoading] = useState(false);

  // 시간 선택 상태
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [reservationLoading, setReservationLoading] = useState(false);

  // 최대 예약 가능 날짜
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_WEEKS_ADVANCE * 7);

  // 수업실 목록 조회
  const fetchLessonRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const response = await lessonRoomApi.getByGroup(groupId);
      const rooms = (response.data || []).filter(r => r.isActive);
      setLessonRooms(rooms);
      if (rooms.length > 0 && !selectedRoom) {
        setSelectedRoom(rooms[0]);
      }
    } catch (error) {
      console.error('Failed to fetch lesson rooms:', error);
      toast.error('수업실 목록을 불러오는데 실패했습니다.');
    } finally {
      setRoomsLoading(false);
    }
  }, [groupId, selectedRoom, toast]);

  // 예약 가능 시간 조회
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedRoom) return;
    setSlotsLoading(true);
    try {
      const dateStr = reservationDate.toISOString().split('T')[0];
      const response = await lessonRoomApi.getAvailableSlots(groupId, selectedRoom.id, dateStr);
      setAvailableSlots(response.data);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
    } finally {
      setSlotsLoading(false);
    }
  }, [groupId, selectedRoom, reservationDate]);

  // 내 예약 목록 조회
  const fetchMyReservations = useCallback(async () => {
    setMyReservationsLoading(true);
    try {
      const response = await lessonRoomApi.getMyReservations(groupId);
      setMyReservations(response.data || []);
    } catch (error) {
      console.error('Failed to fetch my reservations:', error);
    } finally {
      setMyReservationsLoading(false);
    }
  }, [groupId]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchLessonRooms();
    fetchMyReservations();
  }, [fetchLessonRooms, fetchMyReservations]);

  // 수업실 또는 날짜 변경 시 가능 시간 조회
  useEffect(() => {
    if (selectedRoom) {
      fetchAvailableSlots();
    }
  }, [selectedRoom, reservationDate, fetchAvailableSlots]);

  // 시간 슬롯 생성 (30분 단위)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const { openTime, closeTime } = availableSlots?.operatingHours || operatingHours;

    let current = openTime;
    while (current <= closeTime) {
      slots.push(current);
      // 30분 추가
      const [h, m] = current.split(':').map(Number);
      const totalMinutes = h * 60 + m + 30;
      const newH = Math.floor(totalMinutes / 60);
      const newM = totalMinutes % 60;
      current = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    return slots;
  };

  // 시간이 예약되어 있는지 확인
  const isTimeSlotReserved = (time: string): boolean => {
    if (!availableSlots) return false;

    // 기존 예약 확인
    const hasReservation = availableSlots.reservations.some(
      (r) => time >= r.startTime && time < r.endTime
    );

    // 정기 수업 확인
    const hasRegularSchedule = availableSlots.regularSchedules.some(
      (r) => time >= r.startTime && time < r.endTime
    );

    return hasReservation || hasRegularSchedule;
  };

  // 시간 클릭 핸들러
  const handleTimeClick = (time: string) => {
    if (isTimeSlotReserved(time)) return;

    if (!selectedStartTime) {
      setSelectedStartTime(time);
      setSelectedEndTime('');
    } else if (!selectedEndTime) {
      if (time > selectedStartTime) {
        // 선택한 범위 내에 예약이 있는지 확인
        const hasConflict = generateTimeSlots().some(
          (t) => t >= selectedStartTime && t < time && isTimeSlotReserved(t)
        );
        if (hasConflict) {
          toast.error('선택한 시간 범위 내에 다른 예약이 있습니다.');
          setSelectedStartTime(time);
          return;
        }
        setSelectedEndTime(time);
      } else {
        setSelectedStartTime(time);
      }
    } else {
      setSelectedStartTime(time);
      setSelectedEndTime('');
    }
  };

  // 시간 초기화
  const handleClearTime = () => {
    setSelectedStartTime('');
    setSelectedEndTime('');
  };

  // 예약 생성
  const handleCreateReservation = async () => {
    if (!selectedRoom || !selectedStartTime || !selectedEndTime) return;

    setReservationLoading(true);
    try {
      const dateStr = reservationDate.toISOString().split('T')[0];
      await lessonRoomApi.createReservation(groupId, {
        roomId: selectedRoom.id,
        date: dateStr,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
      });
      toast.success('예약이 완료되었습니다.');
      handleClearTime();
      fetchAvailableSlots();
      fetchMyReservations();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '예약에 실패했습니다.');
    } finally {
      setReservationLoading(false);
    }
  };

  // 예약 취소
  const handleCancelReservation = async (reservationId: string) => {
    if (!window.confirm('예약을 취소하시겠습니까?')) return;

    try {
      await lessonRoomApi.cancelReservation(groupId, reservationId);
      toast.success('예약이 취소되었습니다.');
      fetchAvailableSlots();
      fetchMyReservations();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '예약 취소에 실패했습니다.');
    }
  };

  // 날짜 변경 핸들러
  const handleDateChange = (value: Date | null | [Date | null, Date | null]) => {
    if (value instanceof Date) {
      setReservationDate(value);
      handleClearTime();
    }
  };

  // 시간 범위 계산
  const getSelectedDuration = (): string => {
    if (!selectedStartTime || !selectedEndTime) return '';
    const [sh, sm] = selectedStartTime.split(':').map(Number);
    const [eh, em] = selectedEndTime.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}시간${minutes > 0 ? ` ${minutes}분` : ''}` : `${minutes}분`;
  };

  return (
    <div className="group-detail__lessonroom-reservations">
      <div className="group-detail__section-header">
        <h2>수업실 예약</h2>
        <p className="group-detail__section-desc">
          최대 {MAX_WEEKS_ADVANCE}주 이내의 수업실을 예약할 수 있습니다.
        </p>
      </div>

      {/* 내 예약 목록 */}
      {myReservations.length > 0 && (
        <div className="group-detail__practiceroom-my-reservations">
          <h3>내 예약</h3>
          {myReservationsLoading ? (
            <p className="group-detail__loading-text">불러오는 중...</p>
          ) : (
            <div className="group-detail__practiceroom-my-list">
              {myReservations.map((reservation) => {
                const resDate = new Date(reservation.date);
                const month = resDate.getMonth() + 1;
                const day = resDate.getDate();
                const dayOfWeek = DAYS[resDate.getDay()];
                return (
                  <div key={reservation.id} className="group-detail__practiceroom-my-item">
                    <span className="date">{month}/{day} ({dayOfWeek})</span>
                    <span className="room">{reservation.roomName}</span>
                    <span className="time">{reservation.startTime?.slice(0, 5)} ~ {reservation.endTime?.slice(0, 5)}</span>
                    <button
                      className="cancel-btn"
                      onClick={() => handleCancelReservation(reservation.id)}
                    >
                      취소
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 수업실 선택 */}
      {roomsLoading ? (
        <p className="group-detail__loading-text">수업실 목록 불러오는 중...</p>
      ) : lessonRooms.length === 0 ? (
        <EmptyState
          icon="🚪"
          title="등록된 수업실이 없습니다"
          description={isAdmin ? '설정에서 수업실을 추가해주세요.' : '관리자에게 문의해주세요.'}
        />
      ) : (
        <>
          {/* 수업실 탭 */}
          <div className="group-detail__lessonroom-tabs">
            {lessonRooms.map((room) => (
              <button
                key={room.id}
                className={`group-detail__lessonroom-tab ${selectedRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRoom(room);
                  handleClearTime();
                }}
                style={room.color ? { borderColor: selectedRoom?.id === room.id ? room.color : 'transparent' } : undefined}
              >
                {room.name}
              </button>
            ))}
          </div>

          {/* 날짜 및 시간 선택 */}
          <div className="group-detail__practiceroom-selector">
            <div className="group-detail__practiceroom-calendar">
              <ReactCalendar
                value={reservationDate}
                onChange={handleDateChange}
                minDate={new Date()}
                maxDate={maxDate}
                locale="ko-KR"
                calendarType="gregory"
                formatDay={(_, date) => date.getDate().toString()}
              />
            </div>
            <div className="group-detail__practiceroom-time-panel">
              <div className="group-detail__practiceroom-selected-date">
                <span className="date">
                  {reservationDate.getMonth() + 1}월 {reservationDate.getDate()}일 ({DAYS[reservationDate.getDay()]})
                </span>
              </div>

              {slotsLoading ? (
                <p className="group-detail__loading-text">시간 정보 불러오는 중...</p>
              ) : (
                <>
                  <p className="group-detail__practiceroom-time-hint">
                    {!selectedStartTime
                      ? '시작 시간을 선택하세요'
                      : !selectedEndTime
                        ? '종료 시간을 선택하세요'
                        : ''}
                  </p>
                  <div className="group-detail__practiceroom-time-slots">
                    <div className="buttons">
                      {generateTimeSlots().map((time) => {
                        const isReserved = isTimeSlotReserved(time);
                        const isStart = selectedStartTime === time;
                        const isEnd = selectedEndTime === time;
                        const isInRange = selectedStartTime && selectedEndTime && time > selectedStartTime && time < selectedEndTime;
                        return (
                          <button
                            key={time}
                            className={`time-btn ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''} ${isInRange ? 'in-range' : ''} ${isReserved ? 'reserved' : ''}`}
                            disabled={isReserved}
                            onClick={() => handleTimeClick(time)}
                            title={isReserved ? '예약됨' : undefined}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 정기 수업 안내 */}
                  {availableSlots?.regularSchedules && availableSlots.regularSchedules.length > 0 && (
                    <div className="group-detail__lessonroom-regular-schedules">
                      <p className="label">정기 수업:</p>
                      {availableSlots.regularSchedules.map((schedule, idx) => (
                        <span key={idx} className="schedule">
                          {schedule.startTime}~{schedule.endTime} ({schedule.name})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 선택된 시간 표시 및 예약 버튼 */}
                  {selectedStartTime && selectedEndTime && (
                    <div className="group-detail__practiceroom-selected-time">
                      <span className="time-range">{selectedStartTime} ~ {selectedEndTime}</span>
                      <span className="duration">({getSelectedDuration()})</span>
                      <button className="clear-btn" onClick={handleClearTime}>
                        초기화
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 예약 버튼 */}
          <div className="group-detail__lessonroom-reserve-section">
            <button
              className="group-detail__lessonroom-reserve-btn"
              disabled={!selectedStartTime || !selectedEndTime || reservationLoading}
              onClick={handleCreateReservation}
            >
              {reservationLoading ? '예약 중...' : '예약하기'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LessonRoomReservationsTab;
