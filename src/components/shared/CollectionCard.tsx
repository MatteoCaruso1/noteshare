import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { SignedImage } from '@/components/SignedImage';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { Calendar, ImageOff } from 'lucide-react';
import { format } from 'date-fns';

interface CollectionCardProps {
  id: string;
  path: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  coverIcon: ReactNode;
  date: string;
  releaseDate?: string | null;
  showOwner?: boolean;
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: string | null;
  badges?: ReactNode;
  actions?: ReactNode;
  dateLabel?: string;
}

export const CollectionCard = ({
  id,
  path,
  title,
  description,
  coverImage,
  coverIcon,
  date,
  releaseDate,
  showOwner = false,
  ownerId,
  ownerName,
  ownerAvatar,
  badges,
  actions,
  dateLabel,
}: CollectionCardProps) => {
  const navigate = useNavigate();

  // Prefer release date if available, otherwise use created date
  const displayDate = releaseDate || date;
  const displayLabel = releaseDate ? 'Release' : (dateLabel || 'Created');

  return (
    <Card
      className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`${path}/${id}`)}
    >
      <div className="flex items-start gap-4">
        {coverImage ? (
          <SignedImage
            src={coverImage}
            alt={`${title} cover`}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            fallback={
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {coverIcon || <ImageOff className="w-6 h-6 text-muted-foreground" />}
              </div>
            }
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            {coverIcon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <h3 className="font-semibold truncate">{title}</h3>
              {badges}
            </div>
            {actions && (
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {actions}
              </div>
            )}
          </div>
          
          {showOwner && ownerName && (
            <div className="flex items-center gap-2 mt-1">
              <ClickableAvatar
                profileId={ownerId || ''}
                avatar={ownerAvatar}
                name={ownerName}
                size="sm"
              />
              <span className="text-xs text-muted-foreground">{ownerName}</span>
            </div>
          )}
          
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-6 mt-1 break-words overflow-hidden whitespace-pre-line">
              {description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{displayLabel}:</span>
            {format(new Date(displayDate), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
    </Card>
  );
};
