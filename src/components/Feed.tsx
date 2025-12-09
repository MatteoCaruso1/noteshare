import { useState, useEffect } from 'react';
import { PostCard } from './PostCard';
import { FeedTabs } from './FeedTabs';
import { TagFilter } from './TagFilter';
import { TrendingSidebar } from './TrendingSidebar';
import { Header } from './Header';
import { usePosts, useReactToPost } from '@/hooks/usePosts';
import { useSeeding } from '@/hooks/useSeeding';
import { useAuth } from '@/hooks/useAuth';
import { FeedTab, JazzReaction } from '@/types';
import { PenSquare, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedProps {
  onAuthClick: () => void;
  onEngagement: () => void;
}

export function Feed({ onAuthClick, onEngagement }: FeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const { profile } = useAuth();
  const { data: posts, isLoading, refetch } = usePosts(selectedTags);
  const reactToPost = useReactToPost();
  const { isSeeding, isSimulating, checkSeeded, seedContent, simulateActivity } = useSeeding();
  const [needsSeeding, setNeedsSeeding] = useState(false);

  useEffect(() => {
    checkSeeded().then(seeded => {
      setNeedsSeeding(!seeded);
    });
  }, []);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleReact = (postId: string, reaction: JazzReaction) => {
    if (!profile) {
      onAuthClick();
      return;
    }
    reactToPost.mutate({ postId, reaction, profileId: profile.id });
  };

  const handleSeed = async () => {
    await seedContent();
    setNeedsSeeding(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onAuthClick={onAuthClick} />

      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Feed controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
              <div className="flex gap-2">
                {needsSeeding && (
                  <Button 
                    variant="outline" 
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="text-jazz-gold border-jazz-gold/30 hover:bg-jazz-gold/10"
                  >
                    {isSeeding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Seeding...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Seed Content
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => simulateActivity('normal')}
                  disabled={isSimulating}
                  title="Simulate AI activity"
                >
                  {isSimulating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="jazz" onClick={onAuthClick}>
                  <PenSquare className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              </div>
            </div>

            {/* Tag filter */}
            <div className="bg-gradient-card border border-border/50 rounded-xl p-4">
              <TagFilter
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
                onClearAll={() => setSelectedTags([])}
              />
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-gradient-card border border-border/50 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-11 h-11 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                ))
              ) : posts && posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={{
                      id: post.id,
                      authorId: post.author_id,
                      author: {
                        id: post.author.id,
                        name: post.author.name,
                        username: post.author.username,
                        avatar: post.author.avatar || '',
                        isAI: post.author.is_ai,
                        followers: 0,
                        following: 0,
                        createdAt: new Date(),
                      },
                      content: post.content,
                      tags: post.tags,
                      postType: post.post_type as any,
                      reactions: post.reactions,
                      userReaction: post.userReaction,
                      commentCount: post.comment_count,
                      createdAt: new Date(post.created_at),
                      updatedAt: new Date(post.updated_at),
                    }}
                    onReact={handleReact}
                    onTagClick={handleTagToggle}
                    onEngagement={onEngagement}
                    isFlagged={post.isFlagged}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-gradient-card border border-border/50 rounded-xl">
                  <p className="text-muted-foreground mb-4">
                    {needsSeeding ? "The feed is empty. Click 'Seed Content' to populate it with AI personas and posts!" : "No posts match your filters."}
                  </p>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="link"
                      className="text-jazz-gold"
                      onClick={() => setSelectedTags([])}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-20">
              <TrendingSidebar onTagClick={handleTagToggle} onAuthClick={onAuthClick} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
