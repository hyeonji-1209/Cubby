import { useEffect } from 'react';
import ReactCalendar from 'react-calendar';
import { EmptyState } from '@/components';
import { useGroupDetailStore } from '@/store';
import { useToast } from '@/components';
import type { PracticeRoomsTabProps } from './types';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const PracticeRoomsTab: React.FC<PracticeRoomsTabProps> = ({
  groupId,
  currentGroup,
  isAdmin,
}) => {
  const { showToast } = useToast();

  const {
    practiceRooms,
    practiceRoomsLoading,
    reservations,
    reservationsLoading,
    myUpcomingReservations,
    reservationDate,
    selectedStartTime,
    selectedEndTime,
    fetchPracticeRooms,
    fetchReservations,
    fetchMyReservations,
    setReservationDate,
    setSelectedTime,
    createReservation,
    cancelReservation,
  } = useGroupDetailStore();

  useEffect(() => {
    if (groupId) {
      fetchPracticeRooms(groupId);
      fetchMyReservations(groupId);
    }
  }, [groupId, fetchPracticeRooms, fetchMyReservations]);

  useEffect(() => {
    if (groupId && reservationDate) {
      fetchReservations(groupId, reservationDate);
    }
  }, [groupId, reservationDate, fetchReservations]);

  // 시간에 분 추가하는 헬퍼 함수
  const addMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // 시간을 분으로 변환
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // 시간 슬롯 생성 (종료 시간 포함 여부 옵션)
  const generateTimeSlots = (includeClose = false): string[] => {
    if (!currentGroup?.practiceRoomSettings) return [];
    const { openTime, closeTime, slotMinutes } = currentGroup.practiceRoomSettings;
    const slots: string[] = [];
    let current = openTime;
    while (current < closeTime) {
      slots.push(current);
      current = addMinutes(current, slotMinutes);
    }
    if (includeClose) {
      slots.push(closeTime);
    }
    return slots;
  };

  // 종료 시간이 1일 최대 시간을 초과하는지 확인
  const isEndTimeExceedingMax = (endTime: string): boolean => {
    if (!selectedStartTime || !currentGroup?.practiceRoomSettings) return false;
    const { maxHoursPerDay } = currentGroup.practiceRoomSettings;
    const duration = timeToMinutes(endTime) - timeToMinutes(selectedStartTime);
    return duration > maxHoursPerDay * 60;
  };

  // 연습실이 선택한 시간에 예약 가능한지 확인
  const isRoomAvailable = (roomId: string): boolean => {
    if (!selectedStartTime || !selectedEndTime) return true;
    return !reservations.some(
      (r) =>
        r.roomId === roomId &&
        r.startTime < selectedEndTime &&
        r.endTime > selectedStartTime
    );
  };

  const handleCreateReservation = async (roomId: string) => {
    const result = await createReservation(groupId, roomId);
    if (result.success) {
      showToast('success', '예약이 완료되었습니다.');
    } else {
      showToast('error', result.message || '예약에 실패했습니다.');
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (window.confirm('예약을 취소하시겠습니까?')) {
      const success = await cancelReservation(groupId, reservationId);
      if (success) {
        showToast('success', '예약이 취소되었습니다.');
      } else {
        showToast('error', '예약 취소에 실패했습니다.');
      }
    }
  };

  const handleDateChange = (value: Date | null | [Date | null, Date | null]) => {
    if (value instanceof Date) {
      setReservationDate(value);
    }
  };

  const handleTimeClick = (time: string) => {
    if (!selectedStartTime) {
      setSelectedTime(time, '');
    } else if (!selectedEndTime) {
      if (time > selectedStartTime && !isEndTimeExceedingMax(time)) {
        setSelectedTime(selectedStartTime, time);
      } else if (time <= selectedStartTime) {
        setSelectedTime(time, '');
      }
    } else {
      setSelectedTime(time, '');
    }
  };

  const handleClearTime = () => {
    setSelectedTime('', '');
  };

  return (
    <div className="group-detail__practicerooms">
      <div className="group-detail__section-header">
        <h2>연습실 예약</h2>
      </div>

      {/* 운영 정보 */}
      {currentGroup.practiceRoomSettings && (
        <div className="group-detail__practiceroom-info">
          <div className="group-detail__practiceroom-info-item">
            <span className="label">운영 시간</span>
            <span className="value">
              {currentGroup.practiceRoomSettings.openTime} ~ {currentGroup.practiceRoomSettings.closeTime}
            </span>
          </div>
          <div className="group-detail__practiceroom-info-item">
            <span className="label">예약 단위</span>
            <span className="value">{currentGroup.practiceRoomSettings.slotMinutes}분</span>
          </div>
          <div className="group-detail__practiceroom-info-item">
            <span className="label">1일 최대</span>
            <span className="value">{currentGroup.practiceRoomSettings.maxHoursPerDay}시간</span>
          </div>
        </div>
      )}

      {/* 내 예약 목록 */}
      {myUpcomingReservations.length > 0 && (
        <div className="group-detail__practiceroom-my-reservations">
          <h3>내 예약</h3>
          <div className="group-detail__practiceroom-my-list">
            {myUpcomingReservations.map((reservation) => {
              const resDate = new Date(reservation.date);
              const month = resDate.getMonth() + 1;
              const day = resDate.getDate();
              return (
                <div key={reservation.id} className="group-detail__practiceroom-my-item">
                  <span className="date">{month}/{day}</span>
                  <span className="room">{reservation.roomName}</span>
                  <span className="time">{reservation.startTime.slice(0, 5)} ~ {reservation.endTime.slice(0, 5)}</span>
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
        </div>
      )}

      {/* 날짜 및 시간 선택 */}
      <div className="group-detail__practiceroom-selector">
        <div className="group-detail__practiceroom-calendar">
          <ReactCalendar
            value={reservationDate}
            onChange={handleDateChange}
            minDate={new Date()}
            locale="ko-KR"
            calendarType="gregory"
            formatDay={(_, date) => date.getDate().toString()}
          />
        </div>
        <div className="group-detail__practiceroom-time-panel">
          <div className="group-detail__practiceroom-selected-date">
            <span className="date">{reservationDate.getMonth() + 1}월 {reservationDate.getDate()}일 ({DAYS[reservationDate.getDay()]})</span>
          </div>
          <p className="group-detail__practiceroom-time-hint">
            {!selectedStartTime
              ? '시작 시간을 선택하세요'
              : !selectedEndTime
                ? `종료 시간을 선택하세요 (최대 ${currentGroup?.practiceRoomSettings?.maxHoursPerDay || 2}시간)`
                : ''}
          </p>
          <div className="group-detail__practiceroom-time-slots">
            <div className="buttons">
              {generateTimeSlots(true).map((time) => {
                const isStart = selectedStartTime === time;
                const isEnd = selectedEndTime === time;
                const isInRange = selectedStartTime && selectedEndTime && time > selectedStartTime && time < selectedEndTime;
                const isDisabled = !!(selectedStartTime && !selectedEndTime && time > selectedStartTime && isEndTimeExceedingMax(time));
                return (
                  <button
                    key={time}
                    className={`time-btn ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''} ${isInRange ? 'in-range' : ''}`}
                    disabled={isDisabled}
                    onClick={() => handleTimeClick(time)}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
          {selectedStartTime && selectedEndTime && (
            <div className="group-detail__practiceroom-selected-time">
              <span className="time-range">{selectedStartTime} ~ {selectedEndTime}</span>
              <span className="duration">
                ({Math.floor((timeToMinutes(selectedEndTime) - timeToMinutes(selectedStartTime)) / 60)}시간
                {(timeToMinutes(selectedEndTime) - timeToMinutes(selectedStartTime)) % 60 > 0 &&
                  ` ${(timeToMinutes(selectedEndTime) - timeToMinutes(selectedStartTime)) % 60}분`})
              </span>
              <button
                className="clear-btn"
                onClick={handleClearTime}
              >
                초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 연습실 목록 및 예약 */}
      <div className="group-detail__practiceroom-list">
        <h3>연습실 선택</h3>
        {practiceRoomsLoading || reservationsLoading ? (
          <p className="group-detail__loading-text">불러오는 중...</p>
        ) : practiceRooms.length === 0 ? (
          <EmptyState
            icon="🚪"
            title="등록된 연습실이 없습니다"
            description="설정에서 연습실을 추가해주세요."
          />
        ) : (
          <div className="group-detail__practiceroom-cards">
            {practiceRooms.map((room) => {
              const roomReservations = reservations.filter(r => r.roomId === room.id);
              const isAvailable = isRoomAvailable(room.id);
              const canReserve = room.isActive && isAvailable && selectedStartTime && selectedEndTime;
              return (
                <div key={room.id} className={`group-detail__practiceroom-card ${!isAvailable ? 'unavailable' : ''}`}>
                  <div className="group-detail__practiceroom-card-header">
                    <span className="group-detail__practiceroom-card-name">{room.name}</span>
                    <span className={`group-detail__practiceroom-card-status ${room.isActive && isAvailable ? 'available' : 'unavailable'}`}>
                      {!room.isActive ? '이용 불가' : !isAvailable ? '예약됨' : '예약 가능'}
                    </span>
                  </div>

                  {/* 해당 연습실의 예약 목록 */}
                  {roomReservations.length > 0 && (
                    <div className="group-detail__practiceroom-reservations">
                      {roomReservations.map((reservation) => (
                        <div key={reservation.id} className={`group-detail__practiceroom-reservation ${reservation.isOwn ? 'own' : ''}`}>
                          <span className="time">{reservation.startTime.slice(0, 5)} ~ {reservation.endTime.slice(0, 5)}</span>
                          {isAdmin && <span className="user">{reservation.userName}</span>}
                          {reservation.isOwn && (
                            <button
                              className="cancel-btn"
                              onClick={() => handleCancelReservation(reservation.id)}
                              title="예약 취소"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className="group-detail__practiceroom-reserve-btn"
                    disabled={!canReserve}
                    onClick={() => handleCreateReservation(room.id)}
                  >
                    {!selectedStartTime || !selectedEndTime ? '시간을 선택하세요' : !isAvailable ? '예약 불가' : '예약하기'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeRoomsTab;
