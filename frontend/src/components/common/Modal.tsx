import { ReactNode, MouseEvent } from 'react';
import './Modal.scss';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  size = 'md',
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
        <h2 className="modal__title">{title}</h2>
        {description && <p className="modal__desc">{description}</p>}
        <div className="modal__body">{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
  );
};

export default Modal;
