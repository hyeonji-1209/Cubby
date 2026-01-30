import './EmptyState.scss';

interface EmptyStateProps {
  title?: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <div className="empty-state">
      {title && <h3 className="empty-state__title">{title}</h3>}
      <p className="empty-state__description">{description}</p>
      {action && (
        <button className="empty-state__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
