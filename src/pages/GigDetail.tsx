import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { NoteCard } from '@/components/NoteCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CollectionDetailHeader } from '@/components/shared/CollectionDetailHeader';
import { NotesEmptyState } from '@/components/shared/NotesEmptyState';
import { AddNoteDialog } from '@/components/shared/AddNoteDialog';
import { Button } from '@/components/ui/button';
import { Music2, Calendar, ExternalLink, DollarSign } from 'lucide-react';
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
  
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  const isOwner = profile?.id === gig?.author_id;
  const isCollaborator = gig?.collaborator_ids?.includes(profile?.id || '');
  const canAddNotes = isOwner || isCollaborator;

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
            <h2 className="text-lg font-semibold">Gig Notes & Media</h2>
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

      <BottomNav />
    </div>
  );
};

export default GigDetail;
