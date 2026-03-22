import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useNote } from '@/hooks/useNotes';
import { useNoteComments, useCreateNoteComment, useDeleteNoteComment, type CommentWithAuthor } from '@/hooks/useNoteComments';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNotification } from '@/hooks/useNotifications';
import { useInstantScrollToTop } from '@/hooks/useInstantScrollToTop';
import { useBottomNavOverride } from '@/contexts/BottomNavContext';
import { PageLayout, PageBody } from '@/components/PageLayout';
import { NoteCard } from '@/components/NoteCard';
import { ShareNoteDialog } from '@/components/ShareNoteDialog';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MentionInput, extractMentions } from '@/components/MentionInput';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { VoiceReplyButton } from '@/components/VoiceReplyButton';
import { CommentText } from '@/components/CommentText';
import { ArrowLeft, User, Trash2, SendHorizontal, Reply } from 'lucide-react';
import { ReportButton } from '@/components/ReportButton';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { getSignedUrls } from '@/hooks/useSignedUrl';
import { useNoteApplause } from '@/hooks/useApplause';

// Extracted CommentCard component for reuse between top-level and reply comments
function CommentCard({ comment, isOwner, onReply, onDelete, profile, isReply }: {
  comment: CommentWithAuthor;
  isOwner: boolean;
  onReply: (comment: CommentWithAuthor) => void;
  onDelete: (id: string) => void;
  profile: Profile | null;
  isReply?: boolean;
}) {
  return (
    <Card className={`p-3 bg-background text-foreground border-border ${isReply ? 'border-l-2 border-l-primary/30' : ''}`}>
      <div className="flex gap-3">
        <ClickableAvatar
          profileId={comment.author?.id || comment.author_id}
          avatar={comment.author?.avatar}
          name={comment.author?.name}
          size={isReply ? 'sm' : 'md'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{comment.author?.name}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(comment.created_at), 'MMM d, h:mm a')}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {profile && !isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => onReply(comment)}
                  title="Reply"
                >
                  <Reply className="w-3.5 h-3.5" />
                </Button>
              )}
              {!isOwner && (
                <ReportButton
                  itemType="comment"
                  itemId={comment.id}
                  reportedUserId={comment.author_id}
                />
              )}
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your comment. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(comment.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          <p className="text-sm mb-2">
            <CommentText content={comment.content} />
          </p>
          {comment.audio_url && (
            <WaveformPlayer 
              src={comment.audio_url} 
              title={comment.content !== '🎤 Voice reply' ? comment.content : 'Voice Reply'} 
            />
          )}
        </div>
      </div>
    </Card>
  );
}

const NoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { setOverrideActiveRoute } = useBottomNavOverride();
  const { data: note, isLoading } = useNote(id || '');
  const { data: comments, isLoading: commentsLoading } = useNoteComments(id || '');
  const createComment = useCreateNoteComment();
  const deleteComment = useDeleteNoteComment();
  const createNotification = useCreateNotification();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorId: string; authorName: string } | null>(null);
  const commentInputRef = useRef<HTMLDivElement>(null);
  
  const isOwner = profile?.id === note?.author_id;
  
  // Check where we came from for proper back navigation
  const fromFriends = location.state?.fromFriends;
  const fromProject = location.state?.fromProject;
  const fromGig = location.state?.fromGig;

  // Set the override for bottom nav active state based on where we came from
  useEffect(() => {
    const override = fromFriends ? '/friends' : fromProject ? '/projects' : fromGig ? '/gigs' : undefined;
    setOverrideActiveRoute(override);
    
    // Cleanup on unmount
    return () => setOverrideActiveRoute(undefined);
  }, [fromFriends, fromProject, fromGig, setOverrideActiveRoute]);

  // Scroll to top instantly on mount
  useInstantScrollToTop([id]);

  // P4: Batch-prefetch all media signed URLs for this note in one call
  useEffect(() => {
    if (!note) return;
    const urls: string[] = [];
    if (note.author?.avatar) urls.push(note.author.avatar);
    if (note.audio_files?.length) urls.push(...note.audio_files);
    if (note.image_files?.length) urls.push(...note.image_files);
    if (note.video_files?.length) urls.push(...note.video_files);
    // Also prefetch comment avatars and audio
    if (comments?.length) {
      comments.forEach(c => {
        if (c.author?.avatar) urls.push(c.author.avatar);
        if (c.audio_url) urls.push(c.audio_url);
      });
    }
    const unique = Array.from(new Set(urls.filter(Boolean)));
    if (unique.length > 0) {
      getSignedUrls(unique);
    }
  }, [note, comments]);

  // Pre-seed applause cache for this note
  useNoteApplause(id || '');

  // Group comments into top-level and replies client-side
  const { topLevelComments, repliesByParent } = useMemo(() => {
    if (!comments) return { topLevelComments: [], repliesByParent: {} as Record<string, typeof comments> };
    const top: typeof comments = [];
    const byParent: Record<string, typeof comments> = {};
    for (const c of comments) {
      const parentId = (c as any).parent_comment_id;
      if (!parentId) {
        top.push(c);
      } else {
        if (!byParent[parentId]) byParent[parentId] = [];
        byParent[parentId].push(c);
      }
    }
    return { topLevelComments: top, repliesByParent: byParent };
  }, [comments]);

  const handleReply = (comment: { id: string; author_id: string; author?: { name: string } | null }) => {
    // Flatten: if this comment is itself a reply, reply to its parent instead
    const parentId = (comment as any).parent_comment_id;
    const targetId = parentId || comment.id;
    const targetAuthorName = comment.author?.name || 'user';
    const targetAuthorId = comment.author_id;
    setReplyingTo({ id: targetId, authorId: targetAuthorId, authorName: targetAuthorName });
    // Scroll to and focus the comment input
    setTimeout(() => {
      commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleAddComment = async () => {
    if (!profile || !id || !newComment.trim()) return;
    
    // Extract mentions
    const mentions = extractMentions(newComment);
    
    // Create comment
    createComment.mutate(
      { 
        noteId: id, 
        authorId: profile.id, 
        content: newComment, 
        noteOwnerId: note?.author_id || '',
        parentCommentId: replyingTo?.id || null,
        parentCommentAuthorId: replyingTo?.authorId || null,
      },
      {
        onSuccess: async () => {
          setNewComment('');
          setReplyingTo(null);
          
          // Create notifications for mentioned users
          if (mentions.length > 0) {
            for (const username of mentions) {
              const { data: mentionedUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .single();
              
              if (mentionedUser && mentionedUser.id !== profile.id) {
                createNotification.mutate({
                  userId: mentionedUser.id,
                  type: 'mention',
                  content: 'mentioned you in a comment',
                  noteId: id,
                  fromUserId: profile.id,
                });
              }
            }
          }
        },
      }
    );
  };

  const handleDeleteComment = (commentId: string) => {
    if (!id) return;
    deleteComment.mutate({ commentId, noteId: id });
  };

  const handleBack = useCallback(() => {
    if (fromFriends) {
      navigate('/friends');
    } else if (fromProject) {
      // Use replace to avoid back button loops between note and project
      navigate(`/projects/${fromProject}`, { replace: true });
    } else if (fromGig) {
      // Use replace to avoid back button loops between note and gig
      navigate(`/gigs/${fromGig}`, { replace: true });
    } else {
      navigate('/');
    }
  }, [fromFriends, fromProject, fromGig, navigate]);

  // Navigation bar with back button only
  const NavBar = () => (
    <div className="flex items-center justify-between">
      <button 
        onClick={handleBack}
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-secondary/80 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
    </div>
  );

  // Show skeleton with navigation while loading - don't block the UI
  if (isLoading) {
    return (
      <PageLayout>
      <PageBody>
          <main className="container max-w-2xl mx-auto px-4 py-2 space-y-3">
            <NavBar />
            {/* Note skeleton */}
            <div className="h-48 bg-card rounded-lg animate-pulse" />
            {/* Comments section skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-card rounded-lg animate-pulse" />
            </div>
          </main>
        </PageBody>
      </PageLayout>
    );
  }

  if (!note) {
    return (
      <PageLayout>
      <PageBody>
          <main className="container max-w-2xl mx-auto px-4 py-2 space-y-3">
            <NavBar />
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Note not found</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </main>
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-3">
          <NavBar />

          <NoteCard 
            note={note}
            expanded
            onShareClick={() => setShareDialogOpen(true)}
          />

          {/* Comments Section */}
          <section className="space-y-3">
            {/* Comment Input */}
            {profile && (
              <Card ref={commentInputRef} className="p-3 bg-background text-foreground border-border">
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <Reply className="w-3 h-3" />
                    <span>Replying to <strong className="text-foreground">{replyingTo.authorName}</strong></span>
                    <button onClick={cancelReply} className="ml-auto text-muted-foreground hover:text-foreground transition-colors text-xs">✕</button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <ClickableAvatar
                    profileId={profile.id}
                    avatar={profile.avatar}
                    name={profile.name}
                    size="md"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1">
                    <MentionInput
                      placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : "Post a comment"}
                      value={newComment}
                      onChange={setNewComment}
                      rows={1}
                      className="resize-none text-sm min-h-[36px] rounded-md border border-input bg-background px-3 py-2 w-full"
                    />
                  </div>
                  <VoiceReplyButton
                    noteId={id!}
                    authorId={profile.id}
                    noteOwnerId={note?.author_id || ''}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['note-comments', id] })}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 bg-gradient-primary text-primary-foreground"
                    onClick={handleAddComment}
                    disabled={createComment.isPending || !newComment.trim()}
                    title="Post comment"
                  >
                    <SendHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Comments List */}
            {commentsLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
            ) : topLevelComments.length > 0 ? (
              <div className="space-y-3">
                {topLevelComments.map((comment) => (
                  <div key={comment.id}>
                    <CommentCard
                      comment={comment}
                      isOwner={profile?.id === comment.author_id}
                      onReply={handleReply}
                      onDelete={handleDeleteComment}
                      profile={profile}
                    />
                    {/* Replies */}
                    {repliesByParent[comment.id]?.map((reply) => (
                      <div key={reply.id} className="ml-8 mt-2">
                        <CommentCard
                          comment={reply}
                          isOwner={profile?.id === reply.author_id}
                          onReply={handleReply}
                          onDelete={handleDeleteComment}
                          profile={profile}
                          isReply
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </main>
      </PageBody>
      
      {/* Share Dialog */}
      {note && (
        <ShareNoteDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          note={note}
        />
      )}
    </PageLayout>
  );
};

export default NoteDetail;
