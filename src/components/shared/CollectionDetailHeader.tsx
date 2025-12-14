import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface CollectionDetailHeaderProps {
  backPath: string;
  title: string;
  date: string;
  dateLabel?: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string | null;
  coverImage?: string | null;
  coverIcon?: ReactNode;
  showSettings?: boolean;
  onSettingsClick?: () => void;
  badges?: ReactNode;
}

export const CollectionDetailHeader = ({
  backPath,
  title,
  date,
  dateLabel = 'Created',
  authorName,
  authorUsername,
  authorAvatar,
  coverImage,
  coverIcon,
  showSettings = false,
  onSettingsClick,
  badges,
}: CollectionDetailHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1" />
        {showSettings && onSettingsClick && (
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Cover image or icon */}
        {coverImage ? (
          <img
            src={coverImage}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : coverIcon ? (
          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            {coverIcon}
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          {/* Author info */}
          {authorName && (
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="w-5 h-5">
                <AvatarImage src={authorAvatar || ''} />
                <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{authorName}</span>
              {authorUsername && (
                <span className="text-xs text-muted-foreground">@{authorUsername}</span>
              )}
            </div>
          )}

          {/* Title */}
          <h1 className="text-xl font-semibold truncate">{title}</h1>

          {/* Date and badges */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {dateLabel} {format(new Date(date), 'MMM d, yyyy')}
            </p>
            {badges}
          </div>
        </div>
      </div>
    </div>
  );
};
