import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, FolderOpen, Calendar, Flag } from 'lucide-react';
import { Project, PromoPostWithAuthor, Goal } from '@/types';

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

  const hasItems = projects.length > 0 || gigs.length > 0 || goals.length > 0;

  if (!hasItems) return null;

  // Filter to only active (non-completed) goals
  const activeGoals = goals.filter(g => !g.is_completed);

  const handleTypeChange = (type: string) => {
    if (type === 'none') {
      setLinkType(null);
      onLinkChange(null);
    } else {
      setLinkType(type as LinkType);
      // Clear selection when switching types
      onLinkChange(null);
    }
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isSelected ? 'text-primary' : ''} ${className}`}
            >
              <Target className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Link to goal, project, or gig</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-3 bg-popover" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Link type</p>
            <Select value={linkType || 'none'} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full h-8">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">None</span>
                </SelectItem>
                {activeGoals.length > 0 && (
                  <SelectItem value="goal">
                    <div className="flex items-center gap-2">
                      <Flag className="w-3 h-3" />
                      Goal
                    </div>
                  </SelectItem>
                )}
                {projects.length > 0 && (
                  <SelectItem value="project">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3 h-3" />
                      Project
                    </div>
                  </SelectItem>
                )}
                {gigs.length > 0 && (
                  <SelectItem value="gig">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Gig
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {linkType && items.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground capitalize">Select {linkType}</p>
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

          {selectedLink && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs">
                {selectedLink.type === 'goal' && <Flag className="w-3 h-3 text-primary" />}
                {selectedLink.type === 'project' && <FolderOpen className="w-3 h-3 text-primary" />}
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
