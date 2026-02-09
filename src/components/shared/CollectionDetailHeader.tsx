import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { SignedImage } from '@/components/SignedImage';
import { ProjectCover } from '@/components/ProjectCoverPicker';
import { ArrowLeft, Settings, ImageOff } from 'lucide-react';
import { formatLocalDateTime } from '@/lib/utils';

interface CollectionDetailHeaderProps {
  backPath?: string;
  useHistoryBack?: boolean;
  fallbackPath?: string;
  title: string;
  date: string;
  dateLabel?: string;
  /** When true, date will include time (e.g., "Feb 21, 2026 · 3:00 PM") */
  dateShowTime?: boolean;
  authorId?: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string | null;
  coverImage?: string | null;
  coverIcon?: ReactNode;
  showSettings?: boolean;
  onSettingsClick?: () => void;
  badges?: ReactNode;
  /** When true, uses ProjectCover which handles icon: prefixed values */
  useProjectCover?: boolean;
  /** Custom actions to render next to the settings button */
  headerActions?: ReactNode;
}

export const CollectionDetailHeader = ({
  backPath,
  useHistoryBack = false,
  fallbackPath = '/working-toward',
  title,
  date,
  dateLabel = 'Created',
  dateShowTime = false,
  authorId,
  authorName,
  authorUsername,
  authorAvatar,
  coverImage,
  coverIcon,
  showSettings = false,
  onSettingsClick,
  badges,
  useProjectCover = false,
  headerActions,
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

  // Render cover based on whether we're using project covers (with icon support)
  const renderCover = () => {
    if (useProjectCover) {
      return <ProjectCover value={coverImage} className="w-16 h-16" iconClassName="w-6 h-6" />;
    }
    
    if (coverImage) {
      return (
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
      );
    }
    
    if (coverIcon) {
      return (
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {coverIcon}
        </div>
      );
    }
    
    return null;
  };

  // Format date with optional time using formatLocalDateTime to preserve local timezone
  const formatDate = () => {
    if (!date) return 'No date specified';
    if (dateShowTime) {
      return `${dateLabel}: ${formatLocalDateTime(date, 'MMM d, yyyy · h:mm a')}`;
    }
    return `${dateLabel}: ${formatLocalDateTime(date, 'MMM d, yyyy')}`;
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
        {headerActions}
        {showSettings && onSettingsClick && (
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Cover image or icon */}
        {renderCover()}

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
            </div>
          )}

          {/* Title - allow up to 2 lines */}
          <h1 className="text-xl font-semibold line-clamp-2">{title}</h1>

          {/* Date and badges */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {formatDate()}
            </p>
            {badges}
          </div>
        </div>
      </div>
    </div>
  );
};
