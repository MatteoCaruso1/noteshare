import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CollectionEmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const CollectionEmptyState = ({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: CollectionEmptyStateProps) => {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-secondary/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">{subtitle}</p>
      {actionLabel && onAction && (
        <Button
          className="bg-gradient-primary text-primary-foreground"
          onClick={onAction}
        >
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
