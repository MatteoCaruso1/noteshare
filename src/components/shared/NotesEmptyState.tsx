import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface NotesEmptyStateProps {
  canAddNotes?: boolean;
  contextLabel?: string;
}

export const NotesEmptyState = ({ 
  canAddNotes = false,
  contextLabel = 'this collection'
}: NotesEmptyStateProps) => {
  return (
    <Card className="p-8 text-center bg-card border-border">
      <div className="w-14 h-14 mx-auto rounded-full bg-secondary/50 flex items-center justify-center mb-4">
        <FileText className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground font-medium">No notes yet</p>
      {canAddNotes && (
        <p className="text-sm text-muted-foreground mt-2">
          Add audio, videos, photos, or notes to {contextLabel}
        </p>
      )}
    </Card>
  );
};
