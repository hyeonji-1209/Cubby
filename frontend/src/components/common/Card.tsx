import { HTMLAttributes, ReactNode } from 'react';
import './Card.scss';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const Card = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) => {
  const classNames = [
    'card',
    `card--${variant}`,
    `card--padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
};

export default Card;
