import { useState, useRef, useEffect } from 'react';
import { PICKER_ICONS } from '@/assets/icons';
import './IconPicker.scss';

const GROUP_COLORS = [
  'transparent',
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#a855f7',
];

interface IconPickerProps {
  icon: string;
  color: string;
  image?: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  onImageChange?: (image: string | undefined) => void;
}

const IconPicker = ({ icon, color, image, onIconChange, onColorChange, onImageChange }: IconPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'icon' | 'color'>('icon');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageChange) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onImageChange(result);
      onIconChange('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    if (onImageChange) {
      onImageChange(undefined);
      onIconChange('users');
    }
  };

  const isTransparent = color === 'transparent';
  const previewStyle = isTransparent
    ? { background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' }
    : { backgroundColor: color };

  const selectedIcon = PICKER_ICONS.find((i) => i.id === icon);

  return (
    <div className="icon-picker" ref={pickerRef}>
      <button
        type="button"
        className="icon-picker__preview"
        onClick={() => setShowPicker(!showPicker)}
        style={previewStyle}
      >
        {image ? (
          <img src={image} alt="icon" className="icon-picker__image" />
        ) : selectedIcon ? (
          <img src={selectedIcon.icon} alt={selectedIcon.label} className="icon-picker__svg" />
        ) : (
          <span className="icon-picker__icon">{icon}</span>
        )}
      </button>

      {showPicker && (
        <div className="icon-picker__dropdown">
          <div className="icon-picker__tabs">
            <button
              type="button"
              className={`icon-picker__tab ${activeTab === 'icon' ? 'icon-picker__tab--active' : ''}`}
              onClick={() => setActiveTab('icon')}
            >
              아이콘
            </button>
            <button
              type="button"
              className={`icon-picker__tab ${activeTab === 'color' ? 'icon-picker__tab--active' : ''}`}
              onClick={() => setActiveTab('color')}
            >
              색상
            </button>
          </div>

          {activeTab === 'icon' && (
            <div className="icon-picker__content">
              {onImageChange && (
                <div className="icon-picker__upload-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  {image ? (
                    <div className="icon-picker__image-preview">
                      <img src={image} alt="uploaded" />
                      <button type="button" onClick={handleRemoveImage}>삭제</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="icon-picker__upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      이미지 업로드
                    </button>
                  )}
                </div>
              )}
              <div className="icon-picker__icons">
                {PICKER_ICONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`icon-picker__item ${icon === item.id && !image ? 'icon-picker__item--selected' : ''}`}
                    onClick={() => {
                      onIconChange(item.id);
                      if (onImageChange) onImageChange(undefined);
                    }}
                    title={item.label}
                  >
                    <img src={item.icon} alt={item.label} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'color' && (
            <div className="icon-picker__colors">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`icon-picker__color ${color === c ? 'icon-picker__color--selected' : ''} ${c === 'transparent' ? 'icon-picker__color--transparent' : ''}`}
                  style={c === 'transparent' ? undefined : { backgroundColor: c }}
                  onClick={() => onColorChange(c)}
                  title={c === 'transparent' ? '투명' : c}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IconPicker;
