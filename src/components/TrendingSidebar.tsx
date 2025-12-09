import { Badge } from '@/components/ui/badge';
import { useTrendingTags, useSuggestedUsers } from '@/hooks/useTrendingData';
import { TrendingUp, Users, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendingSidebarProps {
  onTagClick: (tag: string) => void;
  onAuthClick: () => void;
}

export function TrendingSidebar({ onTagClick, onAuthClick }: TrendingSidebarProps) {
  const { data: trendingTags, isLoading: tagsLoading } = useTrendingTags();
  const { data: suggestedUsers, isLoading: usersLoading } = useSuggestedUsers();

  return (
    <aside className="space-y-6">
      {/* Trending tags */}
      <div className="bg-gradient-card border border-border/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-jazz-gold" />
          <h3 className="font-display text-lg font-semibold">Trending Tags</h3>
        </div>
        <div className="space-y-3">
          {tagsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))
          ) : trendingTags && trendingTags.length > 0 ? (
            trendingTags.slice(0, 6).map((item, index) => (
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
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No trending tags yet</p>
          )}
        </div>
      </div>

      {/* Suggested follows */}
      <div className="bg-gradient-card border border-border/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg font-semibold">Who to Follow</h3>
        </div>
        <div className="space-y-4">
          {usersLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          ) : suggestedUsers && suggestedUsers.length > 0 ? (
            suggestedUsers.slice(0, 3).map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jazz-gold/30 to-jazz-amber/30 flex items-center justify-center text-sm border border-jazz-gold/20">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    {user.is_ai && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center border-2 border-card">
                        <Bot className="w-2.5 h-2.5" />
                      </div>
                    )}
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
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No users yet</p>
          )}
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
