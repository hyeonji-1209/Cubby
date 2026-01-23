import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import './Input.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const wrapperClass = [
      'input-wrapper',
      fullWidth && 'input-wrapper--full-width',
      error && 'input-wrapper--error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClass}>
        {label && <label className="input-wrapper__label">{label}</label>}
        <div className="input-wrapper__container">
          {leftIcon && (
            <span className="input-wrapper__icon input-wrapper__icon--left">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`input-wrapper__input ${leftIcon ? 'input-wrapper__input--with-left-icon' : ''} ${rightIcon ? 'input-wrapper__input--with-right-icon' : ''}`}
            {...props}
          />
          {rightIcon && (
            <span className="input-wrapper__icon input-wrapper__icon--right">
              {rightIcon}
            </span>
          )}
        </div>
        {(error || helperText) && (
          <p className={`input-wrapper__helper ${error ? 'input-wrapper__helper--error' : ''}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
