import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Disc3, Calendar, Compass } from 'lucide-react';
import { Project, PromoPostWithAuthor, Goal } from '@/types';
import { usePremium } from '@/contexts/PremiumContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type LinkType = 'project' | 'gig' | 'goal' | null;

export interface LinkSelection {
  type: LinkType;
  id: string;
  title: string;
}

interface LinkToPickerProps {
  projects?: Project[];
  gigs?: PromoPostWithAuthor[];
  goals?: Goal[];
  selectedLink: LinkSelection | null;
  onLinkChange: (link: LinkSelection | null) => void;
  className?: string;
}

export function LinkToPicker({
  projects = [],
  gigs = [],
  goals = [],
  selectedLink,
  onLinkChange,
  className = '',
}: LinkToPickerProps) {
  const [linkType, setLinkType] = useState<LinkType>(selectedLink?.type || null);
  const [open, setOpen] = useState(false);
  const { isPremium, isLoading: isPremiumLoading } = usePremium();
  const { toast } = useToast();

  const hasItems = projects.length > 0 || gigs.length > 0 || goals.length > 0;

  // For free users, always show the button (amber colored) to indicate it's a Pro feature
  // For premium users, only show if there are items to link to
  if (!hasItems && isPremium) return null;

  const handleOpenChange = (newOpen: boolean) => {
    // If lite user tries to open, show toast and block
    if (newOpen && !isPremiumLoading && !isPremium) {
      toast({
        title: "Pro Feature",
        description: "Linking notes to goals, projects, and gigs is available for Pro users.",
      });
      return;
    }
    // If premium but no items, don't open (nothing to show)
    if (newOpen && !hasItems) {
      return;
    }
    setOpen(newOpen);
  };

  // Filter to only active (non-completed) goals
  const activeGoals = goals.filter(g => !g.is_completed);

  const handleTypeSelect = (type: LinkType) => {
    setLinkType(type);
    // Clear selection when switching types
    onLinkChange(null);
  };

  const handleItemSelect = (id: string) => {
    if (id === 'none') {
      onLinkChange(null);
      return;
    }

    let title = '';
    if (linkType === 'project') {
      title = projects.find(p => p.id === id)?.title || '';
    } else if (linkType === 'gig') {
      title = gigs.find(g => g.id === id)?.title || '';
    } else if (linkType === 'goal') {
      const goal = activeGoals.find(g => g.id === id);
      title = goal?.title || goal?.content || '';
    }

    onLinkChange({
      type: linkType,
      id,
      title,
    });
  };

  const handleClear = () => {
    setLinkType(null);
    onLinkChange(null);
  };

  const getItems = () => {
    if (linkType === 'project') return projects;
    if (linkType === 'gig') return gigs;
    if (linkType === 'goal') return activeGoals;
    return [];
  };

  const getItemLabel = (item: Project | PromoPostWithAuthor | Goal) => {
    if ('title' in item && item.title) return item.title;
    if ('content' in item) return (item as Goal).content;
    return 'Untitled';
  };

  const items = getItems();
  const isSelected = !!selectedLink;

  const hasGoals = activeGoals.length > 0;
  const hasProjects = projects.length > 0;
  const hasGigs = gigs.length > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8",
                isSelected ? 'text-primary' : '',
                // Grey out for free users to indicate premium feature
                !isPremiumLoading && !isPremium && 'text-muted-foreground opacity-50',
                className
              )}
            >
              <Target className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Link to goal, project, or gig</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-3 bg-popover" align="start">
        <div className="space-y-3">
          {/* Step 1: Type selection buttons */}
          {!linkType && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Link to</p>
              <div className="flex flex-col gap-1">
                {hasGoals && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-9"
                    onClick={() => handleTypeSelect('goal')}
                  >
                    <Compass className="w-4 h-4 mr-2" />
                    Goal
                  </Button>
                )}
                {hasProjects && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-9"
                    onClick={() => handleTypeSelect('project')}
                  >
                    <Disc3 className="w-4 h-4 mr-2" />
                    Project
                  </Button>
                )}
                {hasGigs && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-9"
                    onClick={() => handleTypeSelect('gig')}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Gig
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Item selection */}
          {linkType && items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground capitalize flex items-center gap-1.5">
                  {linkType === 'goal' && <Compass className="w-3 h-3" />}
                  {linkType === 'project' && <Disc3 className="w-3 h-3" />}
                  {linkType === 'gig' && <Calendar className="w-3 h-3" />}
                  Select {linkType}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                >
                  Back
                </Button>
              </div>
              <Select 
                value={selectedLink?.id || 'none'} 
                onValueChange={handleItemSelect}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder={`Choose ${linkType}...`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="truncate">{getItemLabel(item)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Show linked item */}
          {selectedLink && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs">
                {selectedLink.type === 'goal' && <Compass className="w-3 h-3 text-primary" />}
                {selectedLink.type === 'project' && <Disc3 className="w-3 h-3 text-primary" />}
                {selectedLink.type === 'gig' && <Calendar className="w-3 h-3 text-primary" />}
                <span className="text-muted-foreground">Linked to:</span>
                <span className="font-medium truncate">{selectedLink.title}</span>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
