import { useState, useEffect } from 'react';
import { HelpCircle, Mic, Target, Music, Timer, ClipboardList, Save, List, FileText, Share2, Users, Calendar, UserPlus, Compass, FolderOpen, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClappingHandsIcon } from '@/components/icons/ClappingHandsIcon';

const HELP_VIEWED_KEY = 'noteshare_help_viewed';

interface HelpItem {
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface HelpSection {
  feature: string;
  featureIcon: React.ReactNode;
  definition: string;
  items: HelpItem[];
}

const helpSections: HelpSection[] = [
  {
    feature: 'Practice Session',
    featureIcon: <Timer className="w-4 h-4 text-foreground" />,
    definition: 'A timed workflow that tracks your practice, provides helpful tools, and saves your practice history',
    items: [
      { icon: <Mic className="w-4 h-4" />, label: 'Record Audio', description: 'Record clips directly within your practice session' },
      { icon: <Target className="w-4 h-4" />, label: 'Link to Pursuit', description: 'Tie your session to a pursuit for organized practicing' },
      { icon: <Music className="w-4 h-4" />, label: 'Metronome', description: 'Built-in precision metronome with adjustable BPM' },
      { icon: <Timer className="w-4 h-4" />, label: 'Practice Timer', description: 'Set a countdown timer with audio chime when complete' },
      { icon: <ClipboardList className="w-4 h-4" />, label: 'Link to Practice Board', description: 'Connect your session to your cross-session focus' },
    ],
  },
  {
    feature: 'Practice Board',
    featureIcon: <ClipboardList className="w-4 h-4 text-foreground" />,
    definition: 'Document your cross-session focus areas to maintain intentionality across sessions',
    items: [
      { icon: <Save className="w-4 h-4" />, label: 'Save to Backlog', description: 'Save Practice Boards to revisit later' },
      { icon: <List className="w-4 h-4" />, label: 'View Backlog', description: 'Revisit saved focuses' },
    ],
  },
  {
    feature: 'Notes',
    featureIcon: <FileText className="w-4 h-4 text-foreground" />,
    definition: 'Your personal practice journal entries, either from Practice Sessions or Quick Notes',
    items: [
      { icon: <Share2 className="w-4 h-4" />, label: 'Share Your Practice', description: 'Send a note to selected friends, either within or outside Noteshare' },
      { icon: <ClappingHandsIcon className="w-4 h-4" />, label: 'Applause (on friend\'s notes)', description: 'Show appreciation for a friend\'s practice' },
    ],
  },
  {
    feature: 'Groups',
    featureIcon: <Users className="w-4 h-4 text-foreground" />,
    definition: 'Spaces to find and bring together your musical community',
    items: [
      { icon: <Calendar className="w-4 h-4" />, label: 'Events', description: 'Create and share group events like jam sessions, rehearsals, or shows' },
      { icon: <UserPlus className="w-4 h-4" />, label: 'Invite / Share', description: 'Invite friends, either within or outside Noteshare, to join your group / event' },
    ],
  },
  {
    feature: 'Pursuits',
    featureIcon: <Compass className="w-4 h-4 text-foreground" />,
    definition: 'Long-term musical efforts you\'re working toward',
    items: [
      { icon: <Target className="w-4 h-4" />, label: 'Musical Goals', description: 'Set your musical goals for consistent reference' },
      { icon: <FolderOpen className="w-4 h-4" />, label: 'Projects', description: 'Group notes together for albums, recitals, you name it' },
      { icon: <CalendarDays className="w-4 h-4" />, label: 'Gigs', description: 'Track, share, and tie notes to upcoming musical events' },
    ],
  },
];

export function HelpTipsDialog() {
  const [hasViewed, setHasViewed] = useState(() => {
    return localStorage.getItem(HELP_VIEWED_KEY) === 'true';
  });

  const handleOpenChange = (open: boolean) => {
    if (open && !hasViewed) {
      localStorage.setItem(HELP_VIEWED_KEY, 'true');
      setHasViewed(true);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-tour="help-tips">
          <HelpCircle 
            className={`w-5 h-5 ${hasViewed ? 'text-foreground' : 'text-primary animate-pulse'}`} 
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2 font-bold">
            <HelpCircle className="w-5 h-5 text-foreground" />
            Noteshare Quick Tips
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-4">
          <div className="space-y-6">
            {helpSections.map((section) => (
              <div key={section.feature} className="space-y-3">
                {/* Feature header */}
                <div className="flex items-center gap-2 font-bold text-sm">
                  {section.featureIcon}
                  <span>{section.feature}</span>
                </div>
                
                {/* Feature definition */}
                <p className="text-sm text-muted-foreground pl-6">
                  {section.definition}
                </p>
                
                {/* Items */}
                <div className="space-y-2 pl-6">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-foreground mt-0.5 shrink-0">{item.icon}</span>
                      <div>
                        <span className="text-foreground font-bold">{item.label}:</span>{' '}
                        <span className="text-muted-foreground">{item.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Questions? Reach out to matteo.m.caruso1@gmail.com
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
