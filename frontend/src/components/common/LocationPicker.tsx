import { useState, useEffect, useRef } from 'react';
import './LocationPicker.scss';

export interface LocationData {
  name: string;           // 장소 이름 (ex: 스타벅스 강남점)
  address: string;        // 주소
  detail?: string;        // 하위 장소/상세 위치 (ex: 2층 회의실)
}

interface LocationPickerProps {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
  favoriteLocations?: LocationData[];  // 모임 장소 목록
}

// Daum 우편번호 서비스 타입
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        onclose?: () => void;
      }) => { open: () => void };
    };
  }
}

interface DaumPostcodeData {
  zonecode: string;       // 우편번호
  address: string;        // 기본 주소
  addressType: string;    // 주소 타입 (R: 도로명, J: 지번)
  roadAddress: string;    // 도로명 주소
  jibunAddress: string;   // 지번 주소
  buildingName: string;   // 건물명
  apartment: string;      // 아파트 여부 (Y/N)
}

const LocationPicker = ({
  value,
  onChange,
  placeholder = '장소 이름',
  favoriteLocations = [],
}: LocationPickerProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [nameInput, setNameInput] = useState(value?.name || '');
  const [addressInput, setAddressInput] = useState(value?.address || '');
  const [detailInput, setDetailInput] = useState(value?.detail || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Daum 우편번호 스크립트 로드
  useEffect(() => {
    const script = document.getElementById('daum-postcode-script');
    if (!script) {
      const newScript = document.createElement('script');
      newScript.id = 'daum-postcode-script';
      newScript.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      newScript.async = true;
      document.head.appendChild(newScript);
    }
  }, []);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // value 변경 시 input 업데이트
  useEffect(() => {
    setNameInput(value?.name || '');
    setAddressInput(value?.address || '');
    setDetailInput(value?.detail || '');
  }, [value]);

  // Daum 주소 검색 팝업 열기
  const openAddressSearch = () => {
    if (!window.daum?.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeData) => {
        // 도로명 주소 우선, 없으면 지번 주소
        const address = data.roadAddress || data.jibunAddress;
        // 건물명이 있으면 장소 이름으로 사용
        const name = data.buildingName || '';

        setAddressInput(address);
        if (name) {
          setNameInput(name);
        }

        onChange({
          name: name || nameInput,
          address,
          detail: detailInput || undefined,
        });
      },
    }).open();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNameInput(newName);
    if (newName || addressInput) {
      onChange({ name: newName, address: addressInput, detail: detailInput || undefined });
    } else {
      onChange(null);
    }
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDetail = e.target.value;
    setDetailInput(newDetail);
    if (nameInput || addressInput) {
      onChange({ name: nameInput, address: addressInput, detail: newDetail || undefined });
    }
  };

  const handleSelectFavorite = (location: LocationData) => {
    setNameInput(location.name);
    setAddressInput(location.address);
    setDetailInput(location.detail || '');
    onChange({ ...location });
    setShowDropdown(false);
  };

  const handleClear = () => {
    setNameInput('');
    setAddressInput('');
    setDetailInput('');
    onChange(null);
  };

  return (
    <div className="location-picker" ref={containerRef}>
      <div className="location-picker__inputs">
        <div className="location-picker__input-row">
          <svg className="location-picker__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <input
            type="text"
            className="location-picker__input"
            placeholder={placeholder}
            value={nameInput}
            onChange={handleNameChange}
            onFocus={() => setShowDropdown(true)}
          />
          {(nameInput || addressInput) && (
            <button
              type="button"
              className="location-picker__clear"
              onClick={handleClear}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="location-picker__address-row">
          <input
            type="text"
            className="location-picker__input location-picker__input--address"
            placeholder="주소 검색을 클릭하세요"
            value={addressInput}
            readOnly
            onClick={openAddressSearch}
          />
          <button
            type="button"
            className="location-picker__search-btn"
            onClick={openAddressSearch}
          >
            주소 검색
          </button>
        </div>
        {(nameInput || addressInput) && (
          <input
            type="text"
            className="location-picker__input location-picker__input--detail"
            placeholder="상세 위치 (예: 2층 회의실)"
            value={detailInput}
            onChange={handleDetailChange}
          />
        )}
      </div>

      {/* 모임 장소 드롭다운 */}
      {showDropdown && favoriteLocations.length > 0 && (
        <div className="location-picker__dropdown">
          <div className="location-picker__dropdown-header">모임 장소</div>
          {favoriteLocations.map((loc, index) => (
            <button
              key={index}
              type="button"
              className="location-picker__dropdown-item"
              onClick={() => handleSelectFavorite(loc)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div className="location-picker__dropdown-item-info">
                <span className="location-picker__dropdown-item-name">{loc.name}</span>
                <span className="location-picker__dropdown-item-address">{loc.address}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
