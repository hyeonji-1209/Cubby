import { useState, useRef, useEffect } from 'react';
import './Dropdown.scss';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const Dropdown = ({
  value,
  options,
  onChange,
  placeholder = '선택하세요',
  disabled = false,
  className = '',
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    const option = options.find((opt) => opt.value === optionValue);
    if (option && !option.disabled) {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  return (
    <div className={`dropdown ${className} ${disabled ? 'dropdown--disabled' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className={`dropdown__trigger ${isOpen ? 'dropdown__trigger--open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="dropdown__value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="dropdown__arrow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="dropdown__menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dropdown__option ${value === option.value ? 'dropdown__option--selected' : ''} ${option.disabled ? 'dropdown__option--disabled' : ''}`}
              onClick={() => handleSelect(option.value)}
              disabled={option.disabled}
            >
              <span className="dropdown__option-label">{option.label}</span>
              {option.description && (
                <span className="dropdown__option-desc">{option.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
