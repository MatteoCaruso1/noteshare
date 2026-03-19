import { useState, useEffect } from 'react';
import { HelpCircle, Mic, Target, Timer, ListTodo, Save, FileText, Share, Waypoints, Calendar, UserPlus, ClipboardList, FolderOpen, CalendarDays, Lock, ToggleRight, Settings, Upload } from 'lucide-react';
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
import { MetronomeIcon } from '@/components/Metronome';
import { useAuth } from '@/hooks/useAuth';

const HELP_VIEWED_KEY_PREFIX = 'noteshare_help_viewed_';

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

// Combined icon for Practice Routine + Toggle
const PracticeBoardToggleIcon = () => (
  <span className="inline-flex items-center gap-0.5 -ml-5">
    <ListTodo className="w-4 h-4" />
    <ToggleRight className="w-4 h-4" />
  </span>
);

// Combined icon for Settings + Upload
const SettingsUploadIcon = () => (
  <span className="inline-flex items-center gap-0.5 -ml-5">
    <Settings className="w-4 h-4" />
    <Upload className="w-4 h-4" />
  </span>
);

const helpSections: HelpSection[] = [
  {
    feature: 'Practice Session',
    featureIcon: <Timer className="w-4 h-4 text-foreground" />,
    definition: 'A timed workflow that tracks your practice, provides helpful tools, and saves your practice history',
    items: [
      { icon: <Mic className="w-4 h-4" />, label: 'Record Audio', description: 'Record clips directly within your practice session' },
      { icon: <Target className="w-4 h-4" />, label: 'Link to Organize', description: 'Tie your session to a goal, folder, or gig for organized practicing' },
      { icon: <MetronomeIcon className="w-4 h-4" />, label: 'Metronome', description: 'Built-in precision metronome with adjustable BPM' },
      { icon: <Timer className="w-4 h-4" />, label: 'Practice Timer', description: 'Set a countdown timer with audio chime when complete' },
      { icon: <Lock className="w-4 h-4" />, label: 'Unlock Screen', description: 'Keep your mobile screen unlocked while practicing' },
      { icon: <PracticeBoardToggleIcon />, label: 'Link to Practice Routine', description: 'Connect your session to your cross-session focus' },
      { icon: <SettingsUploadIcon />, label: 'Upload Media', description: 'Upload audio or image files (found within Settings)' },
    ],
  },
  {
    feature: 'Practice Routine',
    featureIcon: <ListTodo className="w-4 h-4 text-foreground" />,
    definition: 'Document your cross-session focus areas to maintain intentionality across sessions',
    items: [
      { icon: <Save className="w-4 h-4" />, label: 'Save to Backlog', description: 'Save Practice Routines to revisit later' },
      { icon: <FolderOpen className="w-4 h-4" />, label: 'View Backlog', description: 'Revisit saved focuses' },
    ],
  },
  {
    feature: 'Notes',
    featureIcon: <FileText className="w-4 h-4 text-foreground" />,
    definition: 'Your personal practice journal entries, either from Practice Sessions or Quick Notes',
    items: [
      { icon: <Share className="w-4 h-4" />, label: 'Share Your Practice', description: 'Send a note to selected friends, either within or outside Noteshare' },
      { icon: <ClappingHandsIcon className="w-4 h-4" />, label: 'Applause (on friend\'s notes)', description: 'Show appreciation for a friend\'s practice' },
    ],
  },
  {
    feature: 'Groups',
    featureIcon: <Waypoints className="w-4 h-4 text-foreground" />,
    definition: 'Spaces to find and bring together your musical community',
    items: [
      { icon: <Calendar className="w-4 h-4" />, label: 'Events', description: 'Create and share group events like jam sessions, rehearsals, or shows' },
      { icon: <UserPlus className="w-4 h-4" />, label: 'Invite / Share', description: 'Invite friends, either within or outside Noteshare, to join your group / event' },
    ],
  },
  {
    feature: 'Organize',
    featureIcon: <ClipboardList className="w-4 h-4 text-foreground" />,
    definition: 'Long-term musical efforts you\'re working toward',
    items: [
      { icon: <Target className="w-4 h-4" />, label: 'Musical Goals', description: 'Set your musical goals for consistent reference' },
      { icon: <FolderOpen className="w-4 h-4" />, label: 'Folders', description: 'Group notes together for albums, recitals, you name it' },
      { icon: <CalendarDays className="w-4 h-4" />, label: 'Gigs', description: 'Track, share, and tie notes to upcoming musical events' },
    ],
  },
];

export function HelpTipsDialog() {
  const { profile } = useAuth();
  const userId = profile?.id;
  
  const [hasViewed, setHasViewed] = useState(() => {
    if (!userId) return false;
    return localStorage.getItem(`${HELP_VIEWED_KEY_PREFIX}${userId}`) === 'true';
  });

  // Update hasViewed state when user changes
  useEffect(() => {
    if (userId) {
      const viewed = localStorage.getItem(`${HELP_VIEWED_KEY_PREFIX}${userId}`) === 'true';
      setHasViewed(viewed);
    }
  }, [userId]);

  const handleOpenChange = (open: boolean) => {
    if (open && !hasViewed && userId) {
      localStorage.setItem(`${HELP_VIEWED_KEY_PREFIX}${userId}`, 'true');
      setHasViewed(true);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-tour="help-tips">
          <HelpCircle 
            className="w-5 h-5 text-foreground" 
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
                      <span className="text-foreground mt-0.5 shrink-0 w-5 flex justify-start">{item.icon}</span>
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
                Questions? Reach out to notesharemusic@gmail.com
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
