import { HelpCircle, Music, Clock, FileText, Users, Target, FolderOpen, Trophy, Bell, Timer, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HelpTip {
  feature: string;
  icon: React.ReactNode;
  items: {
    button: string;
    description: string;
  }[];
}

const helpTips: HelpTip[] = [
  {
    feature: 'Practice Session',
    icon: <Clock className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Start Session', description: 'Begin a timed practice session. All notes you capture are automatically linked to this session.' },
      { button: 'Timer in Header', description: 'Shows your active session time. Click to view details or end the session from any page.' },
      { button: 'Pause/Resume', description: 'Pause your session timer during breaks. Time is tracked accurately.' },
      { button: 'End Session', description: 'Finishes your session and prompts you to add a summary note.' },
    ],
  },
  {
    feature: 'Quick Notes',
    icon: <FileText className="w-4 h-4 text-primary" />,
    items: [
      { button: 'New Note (+)', description: 'Capture an idea instantly with audio, video, images, or text.' },
      { button: 'Audio Recorder', description: 'Record audio clips directly. Name them for easy reference later.' },
      { button: 'Link to Project', description: 'Attach a note to a specific project for organized practice logs.' },
      { button: 'Tags', description: 'Add tags to categorize and find your notes later.' },
    ],
  },
  {
    feature: 'Today\'s Focus',
    icon: <Target className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Focus Input', description: 'Set a single goal for today\'s practice. Keeps you intentional.' },
      { button: 'Focus History', description: 'View past daily focuses to track what you worked on.' },
      { button: 'Link to Notes', description: 'Notes created during a focus day are automatically tagged.' },
    ],
  },
  {
    feature: 'Projects',
    icon: <FolderOpen className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Create Project', description: 'Start a new project to organize notes for a song, piece, or long-term goal.' },
      { button: 'Project Timeline', description: 'View all notes linked to a project in chronological order.' },
      { button: 'Cover Image', description: 'Add a visual cover to personalize your project.' },
      { button: 'Collaborators', description: 'Add friends as collaborators to share project progress.' },
    ],
  },
  {
    feature: 'Friends & Sharing',
    icon: <Users className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Add Friend', description: 'Search for musicians by username and send a friend request.' },
      { button: 'Friends Feed', description: 'See notes shared by your friends in a private feed.' },
      { button: 'Share Note', description: 'Share a specific note with selected friends.' },
      { button: 'Mute Friend', description: 'Hide a friend\'s posts from your feed without unfriending.' },
    ],
  },
  {
    feature: 'Groups',
    icon: <Users className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Create Group', description: 'Start a private group for your band, class, or practice circle.' },
      { button: 'Group Posts', description: 'Share notes and updates with all group members.' },
      { button: 'Events', description: 'Create and share events like rehearsals or performances.' },
      { button: 'Mute Notifications', description: 'Mute post or event notifications per group in settings.' },
    ],
  },
  {
    feature: 'Streaks & Rewards',
    icon: <Trophy className="w-4 h-4 text-jazz-gold" />,
    items: [
      { button: 'Streak Counter', description: 'Shows consecutive days you\'ve practiced. Updates daily.' },
      { button: 'Streak Badges', description: 'Earn badges at 10, 30, 90, and 360 day milestones.' },
      { button: 'Badge Count', description: 'Number on badge shows how many times you\'ve earned that milestone.' },
    ],
  },
  {
    feature: 'Practice Timer',
    icon: <Timer className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Set Duration', description: 'Choose a preset time or type a custom duration (1-180 min).' },
      { button: 'Timer Ring', description: 'Visual progress circle shows time remaining.' },
      { button: 'Chime', description: 'Audio alert when timer completes.' },
    ],
  },
  {
    feature: 'Goals',
    icon: <Target className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Create Goal', description: 'Set measurable goals with target dates or step counts.' },
      { button: 'Progress Tracking', description: 'Update progress as you work toward your goal.' },
      { button: 'Complete Goal', description: 'Mark goals complete and add a reflection.' },
    ],
  },
  {
    feature: 'Notifications',
    icon: <Bell className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Bell Icon', description: 'View friend requests, shared notes, and activity alerts.' },
      { button: 'Unread Badge', description: 'Number shows how many new notifications you have.' },
    ],
  },
  {
    feature: 'Profile',
    icon: <Settings className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Edit Profile', description: 'Update your name, bio, instruments, and genres.' },
      { button: 'Profile Picture', description: 'Tap the camera icon while editing to upload a photo.' },
      { button: 'Practice Stats', description: 'View your total practice time and session history (Premium).' },
      { button: 'Manage Plans', description: 'Upgrade to Premium or manage your subscription.' },
    ],
  },
  {
    feature: 'Memory Reminders',
    icon: <Music className="w-4 h-4 text-primary" />,
    items: [
      { button: 'Memory Card', description: 'Resurfaces a random note from 7+ days ago to help you reflect.' },
      { button: 'Refresh', description: 'Get a different memory if the current one doesn\'t resonate.' },
    ],
  },
];

export function HelpTipsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            How Noteshare Works
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] p-4">
          <div className="space-y-6">
            {helpTips.map((section) => (
              <div key={section.feature} className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  {section.icon}
                  <span>{section.feature}</span>
                </div>
                <div className="space-y-1.5 pl-6">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="text-foreground font-medium">{item.button}:</span>{' '}
                      <span className="text-muted-foreground">{item.description}</span>
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
