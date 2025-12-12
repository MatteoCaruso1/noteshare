import { PracticeSession } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveSessionBannerProps {
  session: PracticeSession;
}

export function ActiveSessionBanner({ session }: ActiveSessionBannerProps) {
  const navigate = useNavigate();
  const duration = formatDistanceToNow(new Date(session.started_at), { addSuffix: false });

  return (
    <div
      className="bg-green-500/20 border-b border-green-500/30 cursor-pointer"
      onClick={() => navigate('/practice')}
    >
      <div className="container max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 recording-pulse" />
          <span className="text-sm font-medium text-green-400">Session Active</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {duration}
          </span>
        </div>
      </div>
    </div>
  );
}
