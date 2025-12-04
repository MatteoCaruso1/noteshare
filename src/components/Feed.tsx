import { useState } from 'react';
import { PostCard } from './PostCard';
import { FeedTabs } from './FeedTabs';
import { TagFilter } from './TagFilter';
import { TrendingSidebar } from './TrendingSidebar';
import { Header } from './Header';
import { mockPosts } from '@/data/mockData';
import { FeedTab, JazzReaction, Post } from '@/types';
import { PenSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedProps {
  onAuthClick: () => void;
  onEngagement: () => void;
}

export function Feed({ onAuthClick, onEngagement }: FeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>(mockPosts);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleReact = (postId: string, reaction: JazzReaction) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const newReactions = { ...post.reactions };
          if (post.userReaction) {
            newReactions[post.userReaction] = Math.max(0, newReactions[post.userReaction] - 1);
          }
          if (post.userReaction !== reaction) {
            newReactions[reaction] = newReactions[reaction] + 1;
          }
          return {
            ...post,
            reactions: newReactions,
            userReaction: post.userReaction === reaction ? undefined : reaction,
          };
        }
        return post;
      })
    );
  };

  const filteredPosts = selectedTags.length > 0
    ? posts.filter((post) => post.tags.some((tag) => selectedTags.includes(tag)))
    : posts;

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
              <Button variant="jazz" onClick={onAuthClick}>
                <PenSquare className="h-4 w-4 mr-2" />
                New Post
              </Button>
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
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onReact={handleReact}
                  onTagClick={handleTagToggle}
                  onEngagement={onEngagement}
                />
              ))}

              {filteredPosts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No posts match your filters.</p>
                  <Button
                    variant="link"
                    className="text-jazz-gold mt-2"
                    onClick={() => setSelectedTags([])}
                  >
                    Clear filters
                  </Button>
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
