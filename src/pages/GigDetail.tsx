import { useState, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUpdatePromoPost, useDeletePromoPost } from '@/hooks/usePromoPosts';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { NoteCard } from '@/components/NoteCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CollectionDetailHeader } from '@/components/shared/CollectionDetailHeader';
import { AddNoteDialog } from '@/components/shared/AddNoteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ProjectCoverPicker } from '@/components/ProjectCoverPicker';
import { Music2, Calendar, ExternalLink, DollarSign, Trash2, Bell } from 'lucide-react';
import { format, addDays, addWeeks, isBefore, isAfter } from 'date-fns';
import { formatLocalDateTime } from '@/lib/utils';
import { NoteWithAuthor, PromoPostWithAuthor } from '@/types';
import { toast } from 'sonner';

function useGig(gigId: string | undefined) {
  return useQuery({
    queryKey: ['gig', gigId],
    queryFn: async () => {
      if (!gigId) throw new Error('Gig ID required');
      
      const { data, error } = await supabase
        .from('promo_posts')
        .select(`
          *,
          profiles!promo_posts_author_id_fkey (*)
        `)
        .eq('id', gigId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        author: data.profiles,
      } as PromoPostWithAuthor;
    },
    enabled: !!gigId,
  });
}

function useGigNotes(gigId: string | undefined) {
  return useQuery({
    queryKey: ['gig-notes', gigId],
    queryFn: async () => {
      if (!gigId) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          profiles!notes_author_id_fkey (*)
        `)
        .eq('gig_id', gigId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map((note: any) => ({
        ...note,
        author: note.profiles,
      })) as NoteWithAuthor[];
    },
    enabled: !!gigId,
  });
}

function useAddNoteToGig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      authorId,
      gigId,
      textContent,
      videoFiles = [],
      imageFiles = [],
      audioFiles = [],
      audioFileNames = [],
    }: {
      authorId: string;
      gigId: string;
      textContent?: string;
      videoFiles?: string[];
      imageFiles?: string[];
      audioFiles?: string[];
      audioFileNames?: string[];
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          author_id: authorId,
          gig_id: gigId,
          text_content: textContent,
          video_files: videoFiles,
          image_files: imageFiles,
          audio_files: audioFiles,
          audio_file_names: audioFileNames,
          visibility: 'friends',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gig-notes', variables.gigId] });
      toast.success('Note added to gig!');
    },
    onError: (error) => {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    },
  });
}

// Hook to check if user has a reminder set for this gig
function useGigReminder(gigId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['gig-reminder', gigId, userId],
    queryFn: async () => {
      if (!gigId || !userId) return false;
      
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('note_id', gigId)
        .eq('type', 'gig_reminder')
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    },
    enabled: !!gigId && !!userId,
  });
}

// Hook to create gig reminder notifications
function useCreateGigReminder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      userId,
      gigId,
      gigTitle,
      eventDate,
    }: {
      userId: string;
      gigId: string;
      gigTitle: string;
      eventDate: string;
    }) => {
      const gigDate = new Date(eventDate);
      const now = new Date();
      const oneWeekBefore = addWeeks(gigDate, -1);
      const oneDayBefore = addDays(gigDate, -1);
      
      const notifications = [];
      
      // Add week-before reminder if it's still in the future
      if (isAfter(oneWeekBefore, now)) {
        notifications.push({
          user_id: userId,
          type: 'gig_reminder',
          content: `Your gig "${gigTitle}" is coming up in one week!`,
          note_id: gigId,
          from_user_id: userId,
          read: false,
          created_at: oneWeekBefore.toISOString(),
        });
      }
      
      // Add day-before reminder if it's still in the future
      if (isAfter(oneDayBefore, now)) {
        notifications.push({
          user_id: userId,
          type: 'gig_reminder',
          content: `Your gig "${gigTitle}" is tomorrow!`,
          note_id: gigId,
          from_user_id: userId,
          read: false,
          created_at: oneDayBefore.toISOString(),
        });
      }
      
      if (notifications.length === 0) {
        throw new Error('No future reminder dates available');
      }
      
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gig-reminder', variables.gigId] });
      toast.success('Reminder set! You\'ll be notified before the gig.');
    },
    onError: (error) => {
      console.error('Error setting reminder:', error);
      toast.error('Failed to set reminder');
    },
  });
}

const GigDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: gig, isLoading: gigLoading } = useGig(id);
  const { data: notes, isLoading: notesLoading } = useGigNotes(id);
  const { data: hasReminder } = useGigReminder(id, profile?.id);
  const addNote = useAddNoteToGig();
  const updateGig = useUpdatePromoPost();
  const deleteGig = useDeletePromoPost();
  const createReminder = useCreateGigReminder();

  // Scroll to top instantly on mount
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [id]);
  
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editShowOnFeed, setEditShowOnFeed] = useState(false);
  const [editIsPaidOpportunity, setEditIsPaidOpportunity] = useState(false);
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string | null>(null);

  const isOwner = profile?.id === gig?.author_id;
  const isCollaborator = gig?.collaborator_ids?.includes(profile?.id || '');
  const canAddNotes = isOwner || isCollaborator;
  
  // Check if gig date is in the future
  const gigDateInFuture = gig?.event_date ? isAfter(new Date(gig.event_date), new Date()) : false;
  const canSetReminder = gigDateInFuture && !hasReminder && profile;

  const handleSetReminder = () => {
    if (!profile || !gig || !gig.event_date || !id) return;
    
    createReminder.mutate({
      userId: profile.id,
      gigId: id,
      gigTitle: gig.title,
      eventDate: gig.event_date,
    });
  };

  const openSettings = () => {
    if (gig) {
      setEditTitle(gig.title);
      setEditDescription(gig.description || '');
      setEditEventDate(gig.event_date ? new Date(gig.event_date).toISOString().slice(0, 16) : '');
      setEditLink(gig.links?.[0] || '');
      setEditShowOnFeed(gig.show_on_feed || false);
      setEditIsPaidOpportunity(gig.is_paid_opportunity || false);
      setEditImage(gig.image || null);
      setEditImagePreviewUrl(null);
      setIsSettingsOpen(true);
    }
  };

  const handleSaveSettings = () => {
    if (!gig) return;

    updateGig.mutate(
      {
        postId: gig.id,
        title: editTitle,
        description: editDescription,
        eventDate: editEventDate || null,
        image: editImage,
        links: editLink ? [editLink] : [],
        showOnFeed: editShowOnFeed,
        isPaidOpportunity: editIsPaidOpportunity,
      },
      {
        onSuccess: () => {
          setIsSettingsOpen(false);
        },
      }
    );
  };

  const handleDeleteGig = () => {
    if (!gig) return;

    deleteGig.mutate(gig.id, {
      onSuccess: () => {
        // Navigate back after deleting
        navigate(-1);
      },
    });
  };

  // Always use history back to return to the previous page with its state preserved
  const useHistoryBack = true;

  const handleAddNote = (data: {
    textContent?: string;
    audioFiles: string[];
    audioFileNames?: string[];
    videoFiles: string[];
    imageFiles: string[];
  }) => {
    if (!profile || !id) return;

    addNote.mutate(
      {
        authorId: profile.id,
        gigId: id,
        textContent: data.textContent,
        videoFiles: data.videoFiles,
        imageFiles: data.imageFiles,
        audioFiles: data.audioFiles,
        audioFileNames: data.audioFileNames,
      },
      {
        onSuccess: () => {
          setIsAddNoteOpen(false);
        },
      }
    );
  };

  if (gigLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Gig not found</p>
        <Button variant="outline" onClick={() => navigate('/gigs')}>
          Back to Gigs
        </Button>
      </div>
    );
  }

  return (
    <PageLayout>
      {/* Header */}
      <PageHeader>
        <CollectionDetailHeader
          useHistoryBack={useHistoryBack}
          title={gig.title}
          date={gig.event_date || ''}
          dateLabel="Gig date"
          authorId={gig.author_id}
          authorName={gig.author?.name}
          authorUsername={gig.author?.username}
          authorAvatar={gig.author?.avatar}
          coverImage={gig.image}
          coverIcon={<Music2 className="w-6 h-6 text-muted-foreground" />}
          showSettings={isOwner}
          onSettingsClick={openSettings}
          useProjectCover={true}
          badges={
            gig.is_paid_opportunity ? (
              <Badge className="text-xs bg-green-600">
                <DollarSign className="w-3 h-3 mr-1" />
                Paid
              </Badge>
            ) : undefined
          }
        />
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Get Reminded Button - only show for future gigs without reminder set */}
          {canSetReminder && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetReminder}
                disabled={createReminder.isPending}
                className="gap-2"
              >
                <Bell className="w-4 h-4" />
                Get Reminded
              </Button>
            </div>
          )}
          {/* Gig Details Card - only show if there's content */}
          {(gig.event_date || gig.description || (gig.links && gig.links.length > 0)) && (
            <Card className="p-4 bg-card border-border">
              {gig.event_date && (
                <p className="text-sm text-primary flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4" />
                  {formatLocalDateTime(gig.event_date, 'EEEE, MMM d, yyyy · h:mm a')}
                </p>
              )}

              {gig.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{gig.description}</p>
              )}

              {gig.links && gig.links.length > 0 && (
                <a
                  href={gig.links[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Details
                </a>
              )}
            </Card>
          )}

          {/* Notes Section - only show if there are notes OR user can add notes */}
          {(notes && notes.length > 0) || canAddNotes ? (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Gig Notes</h2>
                {canAddNotes && profile && (
                  <AddNoteDialog
                    open={isAddNoteOpen}
                    onOpenChange={setIsAddNoteOpen}
                    onSubmit={handleAddNote}
                    isSubmitting={addNote.isPending}
                    title="Add Note to Gig"
                    contextLabel="this gig"
                    profileId={profile.id}
                  />
                )}
              </div>

              {notesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : notes && notes.length > 0 ? (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <NoteCard key={note.id} note={note} fromGig={id} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </main>
      </PageBody>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gig Settings</DialogTitle>
            <DialogDescription>Update your gig details or delete the gig.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Gig Cover Picker - with preset icons or custom upload */}
            {profile && (
              <ProjectCoverPicker
                value={editImage}
                onChange={setEditImage}
                profileId={profile.id}
                previewUrl={editImagePreviewUrl}
                onPreviewUrlChange={setEditImagePreviewUrl}
              />
            )}

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="event-date">Event Date & Time</Label>
              <Input
                id="event-date"
                type="datetime-local"
                value={editEventDate}
                onChange={(e) => setEditEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="link">Link (optional)</Label>
              <Input
                id="link"
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            

            <Button
              className="w-full bg-gradient-primary text-primary-foreground"
              onClick={handleSaveSettings}
              disabled={updateGig.isPending || !editTitle.trim()}
            >
              Save Changes
            </Button>

            {/* Delete Gig */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Gig
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete gig?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{gig.title}" will be deleted. Attached notes will remain.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteGig}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default GigDetail;
