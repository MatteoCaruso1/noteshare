import { cn } from '@/lib/utils';
import { FeedTab } from '@/types';
import { Flame, Clock, TrendingUp, MapPin } from 'lucide-react';

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

const tabs: { id: FeedTab; label: string; icon: React.ReactNode }[] = [
  { id: 'for-you', label: 'For You', icon: <Flame className="h-4 w-4" /> },
  { id: 'latest', label: 'Latest', icon: <Clock className="h-4 w-4" /> },
  { id: 'trending', label: 'Trending', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'near-you', label: 'Near You', icon: <MapPin className="h-4 w-4" /> },
];

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-lg border border-border/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-card text-jazz-gold shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          )}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
