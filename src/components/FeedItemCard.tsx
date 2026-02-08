import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Disc3, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ProjectCover, PRESET_ICONS } from '@/components/ProjectCoverPicker';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { cn } from '@/lib/utils';
import type { Project, PromoPost, Profile } from '@/types';

export type FeedItemType = 'project' | 'gig';

export interface FeedItemOwner {
  id: string;
  name: string;
  avatar: string | null;
}

export interface FeedItem {
  type: FeedItemType;
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  eventDate?: string | null;
  owner: FeedItemOwner;
}

interface FeedItemCardProps {
  item: FeedItem;
}

// Map Tailwind bg classes to badge-friendly versions (10% opacity bg + solid text)
const getBadgeColorFromPreset = (bgClass: string): string => {
  // Extract color from bg-{color}-{shade} pattern
  const match = bgClass.match(/bg-(\w+)-(\d+)/);
  if (!match) return 'bg-blue-500/10 text-blue-400';
  
  const [, color, shade] = match;
  return `bg-${color}-500/10 text-${color}-400`;
};

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
  
  // Determine badge color based on cover image
  const getGigBadgeColor = (): string => {
    if (!item.coverImage) return 'bg-blue-500/10 text-blue-400';
    
    // Check if it's a preset icon
    if (item.coverImage.startsWith('icon:')) {
      const presetId = item.coverImage.replace('icon:', '');
      const preset = PRESET_ICONS.find(p => p.id === presetId);
      if (preset) {
        return getBadgeColorFromPreset(preset.bgClass);
      }
    }
    
    // Custom upload - use noteshare blue
    return 'bg-blue-500/10 text-blue-400';
  };
  
  const badgeColor = isGig ? getGigBadgeColor() : 'bg-blue-500/10 text-blue-400';

  return (
    <Card 
      className="group cursor-pointer transition-all hover:bg-muted/50 active:scale-[0.99] bg-background text-foreground border border-border"
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
            {/* Title */}
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            
            {/* Description - truncated to one line */}
            {item.description && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {item.description}
              </p>
            )}
            
            {/* Bottom row: Event date, badge, created by - all inline */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {isGig && item.eventDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(item.eventDate), 'MMM d, yyyy')}
                </span>
              )}
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                badgeColor
              )}>
                <Icon className="w-3 h-3" />
                {label}
              </span>
              <span className="text-xs text-muted-foreground">
                Created by <span className="font-medium text-foreground">{item.owner.name}</span>
              </span>
            </div>
          </div>
          
          {/* Arrow indicator */}
          <div className="flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
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
    owner: {
      id: project.owner.id,
      name: project.owner.name,
      avatar: project.owner.avatar,
    },
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
    owner: {
      id: gig.author.id,
      name: gig.author.name,
      avatar: gig.author.avatar,
    },
  };
}
