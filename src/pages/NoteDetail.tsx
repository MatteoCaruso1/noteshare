import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNote } from '@/hooks/useNotes';
import { useNoteComments, useCreateNoteComment, useDeleteNoteComment } from '@/hooks/useNoteComments';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNotification } from '@/hooks/useNotifications';
import { BottomNav } from '@/components/BottomNav';
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
  const { profile } = useAuth();
  const { data: note, isLoading } = useNote(id || '');
  const { data: comments, isLoading: commentsLoading } = useNoteComments(id || '');
  const createComment = useCreateNoteComment();
  const deleteComment = useDeleteNoteComment();
  const createNotification = useCreateNotification();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async () => {
    if (!profile || !id || !newComment.trim()) return;
    
    // Extract mentions
    const mentions = extractMentions(newComment);
    
    // Create comment
    createComment.mutate(
      { noteId: id, authorId: profile.id, content: newComment },
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Note not found</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Note</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <NoteCard note={note} expanded />

        {/* Comments Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Comments</h2>
            {comments && <span className="text-sm text-muted-foreground">({comments.length})</span>}
          </div>

          {/* Comment Input */}
          {profile && (
            <Card className="p-4 bg-card border-border mb-4">
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile.avatar || ''} />
                  <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <MentionInput
                    placeholder="Add a comment... Use @ to mention someone"
                    value={newComment}
                    onChange={setNewComment}
                    rows={2}
                    className="resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-primary text-primary-foreground"
                      onClick={handleAddComment}
                      disabled={createComment.isPending || !newComment.trim()}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Comment
                    </Button>
                    <VoiceReplyButton
                      noteId={id!}
                      authorId={profile.id}
                      onSuccess={() => queryClient.invalidateQueries({ queryKey: ['note-comments', id] })}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => {
                const isCommentOwner = profile?.id === comment.author_id;
                return (
                  <Card key={comment.id} className="p-4 bg-card border-border">
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet. Be the first to comment!
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default NoteDetail;
