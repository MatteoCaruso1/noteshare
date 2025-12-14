import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUpdatePromoPost, useDeletePromoPost } from '@/hooks/usePromoPosts';
import { BottomNav } from '@/components/BottomNav';
import { NoteCard } from '@/components/NoteCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CollectionDetailHeader } from '@/components/shared/CollectionDetailHeader';
import { NotesEmptyState } from '@/components/shared/NotesEmptyState';
import { AddNoteDialog } from '@/components/shared/AddNoteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Music2, Calendar, ExternalLink, DollarSign, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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
    }: {
      authorId: string;
      gigId: string;
      textContent?: string;
      videoFiles?: string[];
      imageFiles?: string[];
      audioFiles?: string[];
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

const GigDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: gig, isLoading: gigLoading } = useGig(id);
  const { data: notes, isLoading: notesLoading } = useGigNotes(id);
  const addNote = useAddNoteToGig();
  const updateGig = useUpdatePromoPost();
  const deleteGig = useDeletePromoPost();
  
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editShowOnFeed, setEditShowOnFeed] = useState(false);
  const [editIsPaidOpportunity, setEditIsPaidOpportunity] = useState(false);
  const [editImage, setEditImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = profile?.id === gig?.author_id;
  const isCollaborator = gig?.collaborator_ids?.includes(profile?.id || '');
  const canAddNotes = isOwner || isCollaborator;

  const openSettings = () => {
    if (gig) {
      setEditTitle(gig.title);
      setEditDescription(gig.description || '');
      setEditEventDate(gig.event_date ? new Date(gig.event_date).toISOString().slice(0, 16) : '');
      setEditLink(gig.links?.[0] || '');
      setEditShowOnFeed(gig.show_on_feed || false);
      setEditIsPaidOpportunity(gig.is_paid_opportunity || false);
      setEditImage(gig.image || null);
      setIsSettingsOpen(true);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `gig-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('practice-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('practice-media')
        .getPublicUrl(filePath);

      setEditImage(urlData.publicUrl);
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
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
        navigate('/gigs');
      },
    });
  };

  const handleAddNote = (data: {
    textContent?: string;
    audioFiles: string[];
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <CollectionDetailHeader
        backPath="/gigs"
        title={gig.title}
        date={gig.event_date || gig.created_at}
        dateLabel={gig.event_date ? 'Event' : 'Created'}
        authorName={gig.author?.name}
        authorUsername={gig.author?.username}
        authorAvatar={gig.author?.avatar}
        coverImage={gig.image}
        coverIcon={<Music2 className="w-6 h-6 text-muted-foreground" />}
        showSettings={isOwner}
        onSettingsClick={openSettings}
        badges={
          gig.is_paid_opportunity ? (
            <Badge className="text-xs bg-green-600">
              <DollarSign className="w-3 h-3 mr-1" />
              Paid
            </Badge>
          ) : undefined
        }
      />

      <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Gig Details Card */}
        <Card className="p-4 bg-card border-border">
          {gig.event_date && (
            <p className="text-sm text-primary flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" />
              {format(new Date(gig.event_date), 'EEEE, MMM d, yyyy · h:mm a')}
            </p>
          )}

          {gig.description && (
            <p className="text-sm text-muted-foreground">{gig.description}</p>
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

        {/* Notes Section */}
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
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <NotesEmptyState canAddNotes={canAddNotes} contextLabel="this gig" />
          )}
        </section>
      </main>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gig Settings</DialogTitle>
            <DialogDescription>Update your gig details or delete the gig.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Gig Image Upload */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {editImage ? (
                  <img src={editImage} alt="" className="w-full h-full object-cover" />
                ) : isUploading ? (
                  <div className="text-xs text-muted-foreground">Uploading...</div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Gig Image</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <span className="text-xs text-muted-foreground">Click to add or change image</span>
            </div>

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
            
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="show-feed">Show on home feed</Label>
              <Switch
                id="show-feed"
                checked={editShowOnFeed}
                onCheckedChange={setEditShowOnFeed}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="paid-opportunity">Paid Opportunity</Label>
              <Switch
                id="paid-opportunity"
                checked={editIsPaidOpportunity}
                onCheckedChange={setEditIsPaidOpportunity}
              />
            </div>

            <Button
              className="w-full bg-gradient-primary text-primary-foreground"
              onClick={handleSaveSettings}
              disabled={updateGig.isPending || isUploading || !editTitle.trim()}
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
                  <AlertDialogTitle>Delete Gig?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{gig.title}" and cannot be undone.
                    Notes attached to this gig will not be deleted but will no longer be associated with a gig.
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

      <BottomNav />
    </div>
  );
};

export default GigDetail;
