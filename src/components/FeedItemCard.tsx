import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Disc3, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ProjectCover } from '@/components/ProjectCoverPicker';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { cn } from '@/lib/utils';
import type { Project, PromoPost, Profile } from '@/types';

export type FeedItemType = 'project' | 'gig';

export interface FeedItem {
  type: FeedItemType;
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  eventDate?: string | null;
  owner: Profile;
}

interface FeedItemCardProps {
  item: FeedItem;
}

export const FeedItemCard = memo(function FeedItemCard({ item }: FeedItemCardProps) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (item.type === 'project') {
      navigate(`/projects/${item.id}`);
    } else {
      navigate(`/gigs/${item.id}`);
    }
  };

  const isGig = item.type === 'gig';
  const Icon = isGig ? Calendar : Disc3;
  const label = isGig ? 'Gig' : 'Project';
  const badgeColor = isGig ? 'bg-violet-500/10 text-violet-400' : 'bg-blue-500/10 text-blue-400';

  return (
    <Card 
      className="group cursor-pointer transition-all hover:bg-accent/50 active:scale-[0.99]"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Cover Image/Icon */}
          <div className="flex-shrink-0">
            <ProjectCover 
              value={item.coverImage} 
              className="w-16 h-16 rounded-lg"
              iconClassName="w-6 h-6"
            />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header with badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                badgeColor
              )}>
                <Icon className="w-3 h-3" />
                {label}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(item.createdAt), 'MMM d')}
              </span>
            </div>
            
            {/* Title */}
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            
            {/* Description - truncated */}
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {item.description}
              </p>
            )}
            
            {/* Event date for gigs */}
            {isGig && item.eventDate && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(item.eventDate), 'MMM d, yyyy · h:mm a')}
              </p>
            )}
          </div>
          
          {/* Arrow indicator */}
          <div className="flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        
        {/* Author row */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <ClickableAvatar
            profileId={item.owner.id}
            avatar={item.owner.avatar}
            name={item.owner.name}
            size="xs"
          />
          <span className="text-xs text-muted-foreground">
            Created by <span className="font-medium text-foreground">{item.owner.name}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

// Helper function to convert project to FeedItem
export function projectToFeedItem(project: Project & { owner: Profile }): FeedItem {
  return {
    type: 'project',
    id: project.id,
    title: project.title,
    description: project.description,
    coverImage: project.cover_image,
    createdAt: project.created_at,
    owner: project.owner,
  };
}

// Helper function to convert gig/promo post to FeedItem
export function gigToFeedItem(gig: PromoPost & { author: Profile }): FeedItem {
  return {
    type: 'gig',
    id: gig.id,
    title: gig.title,
    description: gig.description,
    coverImage: gig.image,
    createdAt: gig.created_at,
    eventDate: gig.event_date,
    owner: gig.author,
  };
}
