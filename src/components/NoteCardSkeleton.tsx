import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function NoteCardSkeleton() {
  return (
    <Card className="p-3 sm:p-4 bg-note border-border border-l-2 border-l-primary/20">
      {/* Type Badge Row */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Author info */}
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Text content */}
      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Audio waveform placeholder */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Footer with comments */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
      </div>
    </Card>
  );
}
