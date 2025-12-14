import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  className = ''
}: ClickableAvatarProps) {
  const navigate = useNavigate();

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/user/${profileId}`);
  };

  return (
    <Avatar 
      className={`${sizeClasses[size]} cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${className}`}
      onClick={handleClick}
    >
      <AvatarImage src={avatar || ''} />
      <AvatarFallback>
        <User className={iconSizes[size]} />
      </AvatarFallback>
    </Avatar>
  );
}
