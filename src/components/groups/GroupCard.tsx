import { memo, useCallback } from 'react';
import { Group, useGroupMembership, useJoinGroup } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Users, MapPin, Lock, Globe, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SignedImage } from '@/components/SignedImage';
import { getPresetHeader } from './GroupHeaderPicker';

interface GroupCardProps {
  group: Group & { myRole?: string };
  onClick?: () => void;
  /** Pre-computed membership status from parent (avoids extra API call) */
  knownMemberStatus?: 'active' | 'pending' | null;
  /** Whether user has been invited to this group */
  hasInvite?: boolean;
}

const focusTypeIcons: Record<string, React.ReactNode> = {
  general: <Music className="w-4 h-4" />,
  genre: <Music className="w-4 h-4" />,
  instrument: <Music className="w-4 h-4" />,
  venue: <MapPin className="w-4 h-4" />,
  practice: <Music className="w-4 h-4" />,
};

export const GroupCard = memo(function GroupCard({ group, onClick, knownMemberStatus, hasInvite }: GroupCardProps) {
  // Only fetch membership if not provided by parent (optimization for N+1 queries)
  const shouldFetchMembership = knownMemberStatus === undefined && !group.myRole;
  const { data: membership, isLoading: membershipLoading } = useGroupMembership(
    shouldFetchMembership ? group.id : undefined
  );
  const joinGroup = useJoinGroup();
  
  // Derive membership status from either parent prop, myRole, or fetched data
  const derivedStatus = knownMemberStatus ?? (group.myRole ? 'active' : (membership?.status as 'active' | 'pending' | null));
  const isMember = derivedStatus === 'active';
  const isPending = derivedStatus === 'pending';
  const isPrivate = group.privacy === 'private';
  
  const handleJoin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      joinGroup.mutate({ 
        groupId: group.id, 
        isPrivate, 
        hasInvite 
      });
    } catch (error) {
      console.error('[GroupCard] Join error:', error);
      toast.error('Failed to join group');
    }
  }, [joinGroup, group.id, isPrivate, hasInvite]);
  
  // For private groups, only show limited info if not a member
  const showFullDetails = !isPrivate || isMember || isPending;
  
  return (
    <div 
      className="p-4 border border-border rounded-lg bg-card hover:bg-secondary/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Group Image/Icon */}
        <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
          {(() => {
            if (!showFullDetails) {
              return <Music className="w-6 h-6 text-muted-foreground" />;
            }
            // Priority: profile_image > custom cover_image > preset header > default icon
            const imageToShow = group.profile_image || group.cover_image;
            const preset = getPresetHeader(imageToShow);
            
            if (preset) {
              return <div className={`w-full h-full ${preset.gradient}`} />;
            }
            if (imageToShow && !imageToShow.startsWith('header:')) {
              return (
                <SignedImage 
                  src={imageToShow} 
                  alt={group.name} 
                  className="w-full h-full object-cover"
                  fallback={<Music className="w-6 h-6 text-muted-foreground" />}
                />
              );
            }
            return <Music className="w-6 h-6 text-muted-foreground" />;
          })()}
        </div>
        
        {/* Group Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{group.name}</h3>
            {isPrivate && (
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground mt-1">
            {showFullDetails ? (
              <>
                {focusTypeIcons[group.focus_type]}
                <span className="capitalize">{group.focus_type}</span>
                <span className="text-border">•</span>
                <Users className="w-3 h-3" />
                <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
                {group.city && (
                  <>
                    <span className="text-border">•</span>
                    <MapPin className="w-3 h-3" />
                    <span>{group.city}</span>
                  </>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Private group</span>
            )}
          </div>
        </div>
        
        {/* Join Button */}
        <div className="shrink-0">
          {isMember ? (
            <Badge variant="secondary" className="gap-1">
              <Check className="w-3 h-3" />
              Joined
            </Badge>
          ) : isPending ? (
            <Badge variant="outline" className="text-muted-foreground">
              Pending
            </Badge>
          ) : hasInvite ? (
            <Button
              size="sm"
              variant="default"
              onClick={handleJoin}
              disabled={joinGroup.isPending}
              className="h-7 text-xs"
            >
              Accept
            </Button>
          ) : (
            <Button
              size="sm"
              variant={isPrivate ? "outline" : "default"}
              onClick={handleJoin}
              disabled={joinGroup.isPending || (shouldFetchMembership && membershipLoading)}
              className="h-7 text-xs"
            >
              {isPrivate ? 'Request' : 'Join'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Description - only for public groups or members */}
      {group.description && showFullDetails && (
        <p className="text-sm text-foreground/70 mt-3 pt-3 border-t border-border/50 line-clamp-2">
          {group.description}
        </p>
      )}
    </div>
  );
});
