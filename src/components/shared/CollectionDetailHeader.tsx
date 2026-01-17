import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { SignedImage } from '@/components/SignedImage';
import { ArrowLeft, Settings, ImageOff } from 'lucide-react';
import { format } from 'date-fns';

interface CollectionDetailHeaderProps {
  backPath?: string;
  useHistoryBack?: boolean;
  fallbackPath?: string;
  title: string;
  date: string;
  dateLabel?: string;
  authorId?: string;
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
  useHistoryBack = false,
  fallbackPath = '/working-toward',
  title,
  date,
  dateLabel = 'Created',
  authorId,
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

  const handleBack = () => {
    if (useHistoryBack) {
      // Check if we have history to go back to, otherwise use fallback
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(fallbackPath, { replace: true });
      }
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
      <div className="flex items-center gap-3 mb-4">
        <button 
          onClick={handleBack}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary/80 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
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
          <SignedImage
            src={coverImage}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            fallback={
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {coverIcon || <ImageOff className="w-6 h-6 text-muted-foreground" />}
              </div>
            }
          />
        ) : coverIcon ? (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            {coverIcon}
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          {/* Author info */}
          {authorName && (
            <div className="flex items-center gap-2 mb-1">
              <ClickableAvatar
                profileId={authorId || ''}
                avatar={authorAvatar}
                name={authorName}
                size="sm"
              />
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
              {date ? `${dateLabel}: ${format(new Date(date), 'MMM d, yyyy')}` : 'No date specified'}
            </p>
            {badges}
          </div>
        </div>
      </div>
    </div>
  );
};
