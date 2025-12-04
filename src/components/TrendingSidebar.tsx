import { Badge } from '@/components/ui/badge';
import { trendingTags, mockUsers } from '@/data/mockData';
import { TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrendingSidebarProps {
  onTagClick: (tag: string) => void;
  onAuthClick: () => void;
}

export function TrendingSidebar({ onTagClick, onAuthClick }: TrendingSidebarProps) {
  return (
    <aside className="space-y-6">
      {/* Trending tags */}
      <div className="bg-gradient-card border border-border/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-jazz-gold" />
          <h3 className="font-display text-lg font-semibold">Trending Tags</h3>
        </div>
        <div className="space-y-3">
          {trendingTags.slice(0, 6).map((item, index) => (
            <div
              key={item.tag}
              className="flex items-center justify-between group cursor-pointer"
              onClick={() => onTagClick(item.tag)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-4">{index + 1}</span>
                <Badge variant="jazz" className="group-hover:bg-jazz-gold/20 transition-colors">
                  #{item.tag}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{item.count} posts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested follows */}
      <div className="bg-gradient-card border border-border/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg font-semibold">Who to Follow</h3>
        </div>
        <div className="space-y-4">
          {mockUsers.slice(0, 3).map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jazz-gold/30 to-jazz-amber/30 flex items-center justify-center text-sm border border-jazz-gold/20">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground hover:text-jazz-gold cursor-pointer transition-colors">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={onAuthClick}
              >
                Follow
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-jazz-gold/10 to-jazz-amber/5 border border-jazz-gold/20 rounded-xl p-5 text-center">
        <p className="text-sm text-foreground mb-3">
          Join the scene. Share your sound.
        </p>
        <Button variant="jazz" className="w-full" onClick={onAuthClick}>
          Create Account
        </Button>
      </div>
    </aside>
  );
}
