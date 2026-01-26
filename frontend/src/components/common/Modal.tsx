import { ReactNode, MouseEvent } from 'react';
import './Modal.scss';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  size = 'md',
  showCloseButton = false,
}: ModalProps) => {
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    onClose();
  };

  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal modal--${size}`} onClick={handleContentClick}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          {showCloseButton && (
            <button className="modal__close" onClick={onClose} aria-label="닫기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        {description && <p className="modal__desc">{description}</p>}
        {children && <div className="modal__body">{children}</div>}
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
  );
};

export default Modal;
