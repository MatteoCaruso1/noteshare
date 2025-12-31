import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCallback, useMemo, useState } from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface ClickableAvatarProps {
  profileId: string;
  avatar?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ClickableAvatar({
  profileId,
  avatar,
  name,
  size = 'md',
  className = '',
}: ClickableAvatarProps) {
  const navigate = useNavigate();
  const { signedUrl, loading } = useSignedUrl(avatar);
  const [imgError, setImgError] = useState(false);

  const placeholderSrc = useMemo(() => '/placeholder.svg', []);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!profileId || profileId === 'undefined' || profileId === 'null') {
        console.warn('[ClickableAvatar] Invalid profileId:', profileId);
        return;
      }

      navigate(`/user/${profileId}`);
    },
    [navigate, profileId]
  );

  const showRealImage = !!signedUrl && !loading && !imgError;

  const imageEl = showRealImage ? (
    <img
      src={signedUrl!}
      alt={name || 'Profile picture'}
      className="h-full w-full object-cover"
      onError={() => setImgError(true)}
    />
  ) : (
    <img
      src={placeholderSrc}
      alt="Profile picture placeholder"
      className="h-full w-full object-cover"
    />
  );

  // Non-clickable avatar if no valid profileId
  if (!profileId || profileId === 'undefined' || profileId === 'null') {
    return <Avatar className={`${sizeClasses[size]} ${className}`}>{imageEl}</Avatar>;
  }

  return (
    <Avatar
      className={`${sizeClasses[size]} cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${className}`}
      onClick={handleClick}
    >
      {showRealImage ? (
        imageEl
      ) : (
        <>
          {imageEl}
          <AvatarFallback>
            <User className={iconSizes[size]} />
          </AvatarFallback>
        </>
      )}
    </Avatar>
  );
}
