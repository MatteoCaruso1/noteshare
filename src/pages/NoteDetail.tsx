import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useNote } from '@/hooks/useNotes';
import { useNoteComments, useCreateNoteComment, useDeleteNoteComment } from '@/hooks/useNoteComments';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNotification } from '@/hooks/useNotifications';
import { useUpdateNoteTags } from '@/hooks/useUpdateNote';
import { useRecentTags } from '@/hooks/useRecentTags';
import { useInstantScrollToTop } from '@/hooks/useInstantScrollToTop';
import { BottomNav } from '@/components/BottomNav';
import { PageLayout, PageBody } from '@/components/PageLayout';
import { NoteCard } from '@/components/NoteCard';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MentionInput, extractMentions } from '@/components/MentionInput';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { VoiceReplyButton } from '@/components/VoiceReplyButton';
import { CommentText } from '@/components/CommentText';
import { ArrowLeft, Send, User, MessageCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const NoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { data: note, isLoading } = useNote(id || '');
  const { data: comments, isLoading: commentsLoading } = useNoteComments(id || '');
  const createComment = useCreateNoteComment();
  const deleteComment = useDeleteNoteComment();
  const createNotification = useCreateNotification();
  const updateTags = useUpdateNoteTags();
  const recentTags = useRecentTags();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  
  const isOwner = profile?.id === note?.author_id;
  
  const handleTagsChange = useCallback((newTags: string[]) => {
    if (!id) return;
    updateTags.mutate({ noteId: id, tags: newTags });
  }, [id, updateTags]);
  
  // Check where we came from for proper back navigation
  const fromFriends = location.state?.fromFriends;
  const fromProject = location.state?.fromProject;
  const fromGig = location.state?.fromGig;

  // Scroll to top instantly on mount
  useInstantScrollToTop([id]);

  const handleAddComment = async () => {
    if (!profile || !id || !newComment.trim()) return;
    
    // Extract mentions
    const mentions = extractMentions(newComment);
    
    // Create comment
    createComment.mutate(
      { noteId: id, authorId: profile.id, content: newComment, noteOwnerId: note?.author_id || '' },
      {
        onSuccess: async () => {
          setNewComment('');
          
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
      navigate(`/projects/${fromProject}`);
    } else if (fromGig) {
      navigate(`/gigs/${fromGig}`);
    } else {
      navigate('/');
    }
  }, [fromFriends, fromProject, fromGig, navigate]);

  // Back button - static on mobile, fixed on desktop
  const BackButton = () => (
    <button 
      onClick={handleBack}
      className="md:fixed md:top-14 md:left-4 z-40 flex items-center justify-center h-7 w-7 rounded-md bg-muted/80 hover:bg-muted text-foreground transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );

  // Spacer only needed on desktop for fixed button
  const BackButtonSpacer = () => (
    <div className="hidden md:block h-6" />
  );

  // Show skeleton with navigation while loading - don't block the UI
  if (isLoading) {
    return (
      <PageLayout>
        <div className="hidden md:block"><BackButton /></div>
        <PageBody>
          <main className="container max-w-2xl mx-auto px-4 py-2 space-y-3">
            <div className="md:hidden"><BackButton /></div>
            <BackButtonSpacer />
            {/* Note skeleton */}
            <div className="h-48 bg-card rounded-lg animate-pulse" />
            {/* Comments section skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-card rounded-lg animate-pulse" />
            </div>
          </main>
        </PageBody>
        <BottomNav overrideActiveRoute={fromFriends ? '/friends' : fromProject ? '/projects' : fromGig ? '/gigs' : undefined} />
      </PageLayout>
    );
  }

  if (!note) {
    return (
      <PageLayout>
        <div className="hidden md:block"><BackButton /></div>
        <PageBody>
          <main className="container max-w-2xl mx-auto px-4 py-2">
            <div className="md:hidden mb-3"><BackButton /></div>
            <BackButtonSpacer />
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Note not found</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </main>
        </PageBody>
        <BottomNav overrideActiveRoute={fromFriends ? '/friends' : fromProject ? '/projects' : fromGig ? '/gigs' : undefined} />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="hidden md:block"><BackButton /></div>
      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-3">
          <div className="md:hidden"><BackButton /></div>
          <BackButtonSpacer />

          <NoteCard 
            note={note} 
            expanded 
            onTagsChange={isOwner ? handleTagsChange : undefined}
            recentTags={isOwner ? recentTags : undefined}
          />

          {/* Comments Section */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-muted-foreground">Comments</h2>
            </div>

            {/* Comment Input */}
            {profile && (
              <Card className="p-3 bg-background text-foreground border-border mb-4">
                <div className="flex gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={profile.avatar || ''} />
                    <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <MentionInput
                      placeholder="Use @ to mention someone"
                      value={newComment}
                      onChange={setNewComment}
                      rows={1}
                      className="resize-none text-sm min-h-[32px]"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-gradient-primary text-primary-foreground"
                        onClick={handleAddComment}
                        disabled={createComment.isPending || !newComment.trim()}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Comment
                      </Button>
                      <VoiceReplyButton
                        noteId={id!}
                        authorId={profile.id}
                        noteOwnerId={note?.author_id || ''}
                        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['note-comments', id] })}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Comments List */}
            {commentsLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => {
                  const isCommentOwner = profile?.id === comment.author_id;
                  return (
                    <Card key={comment.id} className="p-4 bg-background text-foreground border-border">
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.author?.avatar || ''} />
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{comment.author?.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            {isCommentOwner && (
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
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
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
                })}
              </div>
            ) : null}
          </section>
        </main>
      </PageBody>

      <BottomNav overrideActiveRoute={fromFriends ? '/friends' : fromProject ? '/projects' : fromGig ? '/gigs' : undefined} />
    </PageLayout>
  );
};

export default NoteDetail;
