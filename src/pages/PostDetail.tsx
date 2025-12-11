import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePost, useComments, useCreateComment, useReactToComment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { useReactToPost } from '@/hooks/usePosts';
import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { JazzReactions } from '@/components/JazzReactions';
import { AuthModal } from '@/components/AuthModal';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Bot, AlertTriangle, MessageCircle, Send } from 'lucide-react';
import { JazzReaction } from '@/types';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, setShowAuthModal, showAuthModal } = useAuth();
  const { data: post, isLoading: postLoading } = usePost(id!);
  const { data: comments, isLoading: commentsLoading } = useComments(id!);
  const createComment = useCreateComment();
  const reactToPost = useReactToPost();
  const reactToComment = useReactToComment();
  
  const [newComment, setNewComment] = useState('');

  const handleSubmitComment = async () => {
    if (!user || !profile) {
      setShowAuthModal(true);
      return;
    }
    
    if (!newComment.trim() || !id) return;
    
    await createComment.mutateAsync({
      postId: id,
      content: newComment.trim(),
      authorId: profile.id,
    });
    
    setNewComment('');
  };

  const handleReactToPost = (reaction: JazzReaction) => {
    if (!user || !profile) {
      setShowAuthModal(true);
      return;
    }
    
    if (!id) return;
    
    reactToPost.mutate({
      postId: id,
      reaction,
      profileId: profile.id,
    });
  };

  const handleReactToComment = (commentId: string, reaction: JazzReaction) => {
    if (!user || !profile) {
      setShowAuthModal(true);
      return;
    }
    
    reactToComment.mutate({
      commentId,
      reaction,
      profileId: profile.id,
    });
  };

  if (postLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-3xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-24 mb-6" />
          <Skeleton className="h-48 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-3xl mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </Link>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-foreground mb-2">Post not found</h1>
            <p className="text-muted-foreground">This post may have been deleted or doesn't exist.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        {/* Post Card */}
        <article className="bg-gradient-card border border-border/50 rounded-xl p-6 mb-6">
          {post.isFlagged && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">This post is under review</span>
            </div>
          )}

          {/* Author info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-jazz-gold/30 to-jazz-amber/30 flex items-center justify-center text-lg border border-jazz-gold/20 overflow-hidden">
                {post.author.avatar ? (
                  <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
                ) : (
                  post.author.name.charAt(0)
                )}
              </div>
              {post.author.is_ai && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[10px] border-2 border-card">
                  <Bot className="w-3 h-3" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{post.author.name}</span>
                <span className="text-muted-foreground text-sm">@{post.author.username}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap text-lg">
              {post.content}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="jazz" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>

          {/* Reactions */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <JazzReactions
              reactions={post.reactions}
              userReaction={post.userReaction}
              onReact={handleReactToPost}
            />
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{comments?.length || 0} comments</span>
            </div>
          </div>
        </article>

        {/* Comment Input */}
        <div className="bg-gradient-card border border-border/50 rounded-xl p-4 mb-6">
          <Textarea
            placeholder={user ? "Add to the conversation..." : "Sign in to comment..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] bg-background/50 border-border/50 mb-3 resize-none"
            onClick={() => !user && setShowAuthModal(true)}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createComment.isPending}
              className="bg-jazz-gold hover:bg-jazz-amber text-background"
            >
              <Send className="h-4 w-4 mr-2" />
              {createComment.isPending ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Comments ({comments?.length || 0})
          </h2>

          {commentsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-gradient-card border border-border/50 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-jazz-gold/30 to-jazz-amber/30 flex items-center justify-center text-sm border border-jazz-gold/20 overflow-hidden">
                        {comment.author.avatar ? (
                          <img src={comment.author.avatar} alt={comment.author.name} className="w-full h-full object-cover" />
                        ) : (
                          comment.author.name.charAt(0)
                        )}
                      </div>
                      {comment.author.is_ai && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center text-[8px] border-2 border-card">
                          <Bot className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground text-sm">{comment.author.name}</span>
                        <span className="text-muted-foreground text-xs">@{comment.author.username}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <div className="mt-2">
                        <JazzReactions
                          reactions={comment.reactions}
                          userReaction={comment.userReaction}
                          onReact={(reaction) => handleReactToComment(comment.id, reaction)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-card border border-border/50 rounded-xl">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">No comments yet</h3>
              <p className="text-muted-foreground text-sm">Be the first to join the conversation!</p>
            </div>
          )}
        </div>
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
