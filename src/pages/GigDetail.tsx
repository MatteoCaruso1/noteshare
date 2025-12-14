import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { NoteCard } from '@/components/NoteCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Music2, Calendar, User, ExternalLink, DollarSign, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { NoteWithAuthor, PromoPostWithAuthor } from '@/types';
import { useState } from 'react';
import { useNotes, useCreateNote } from '@/hooks/useNotes';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
    }: {
      authorId: string;
      gigId: string;
      textContent?: string;
      videoFiles?: string[];
      imageFiles?: string[];
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          author_id: authorId,
          gig_id: gigId,
          text_content: textContent,
          video_files: videoFiles,
          image_files: imageFiles,
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
  const { uploadFile, uploading } = useMediaUpload();
  
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);

  const isOwner = profile?.id === gig?.author_id;
  const isCollaborator = gig?.collaborator_ids?.includes(profile?.id || '');
  const canAddNotes = isOwner || isCollaborator;

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
      const url = await uploadFile(file, profile.id, 'video');
      if (url) {
        setVideoFiles([...videoFiles, url]);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
      const url = await uploadFile(file, profile.id, 'image');
      if (url) {
        setImageFiles([...imageFiles, url]);
      }
    }
  };

  const handleAddNote = () => {
    if (!profile || !id) return;

    addNote.mutate(
      {
        authorId: profile.id,
        gigId: id,
        textContent: noteText || undefined,
        videoFiles,
        imageFiles,
      },
      {
        onSuccess: () => {
          setNoteText('');
          setVideoFiles([]);
          setImageFiles([]);
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
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gigs')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold">Gig Details</h1>
        </div>
      </div>

      <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Gig Info Card */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src={gig.author?.avatar || ''} />
              <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{gig.author?.name}</p>
              <p className="text-xs text-muted-foreground">@{gig.author?.username}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Music2 className="w-3 h-3 mr-1" />
                Gig
              </Badge>
              {gig.is_paid_opportunity && (
                <Badge className="text-xs bg-green-600">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Paid
                </Badge>
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2">{gig.title}</h2>
          
          {gig.event_date && (
            <p className="text-sm text-primary flex items-center gap-1 mb-3">
              <Calendar className="w-4 h-4" />
              {format(new Date(gig.event_date), 'EEEE, MMM d, yyyy · h:mm a')}
            </p>
          )}

          {gig.description && (
            <p className="text-sm text-muted-foreground mb-4">{gig.description}</p>
          )}

          {gig.links && gig.links.length > 0 && (
            <a
              href={gig.links[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              View Details
            </a>
          )}
        </Card>

        {/* Notes Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Gig Notes & Media</h3>
            {canAddNotes && (
              <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Note to Gig</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Textarea
                      placeholder="Add a note about this gig..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                    />

                    <div className="flex gap-2">
                      <label className="cursor-pointer flex-1">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm">
                          📹 Add Video
                        </div>
                      </label>
                      <label className="cursor-pointer flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm">
                          📷 Add Image
                        </div>
                      </label>
                    </div>

                    {videoFiles.length > 0 && (
                      <div className="space-y-2">
                        {videoFiles.map((url, i) => (
                          <video key={i} src={url} controls className="w-full rounded-lg" />
                        ))}
                      </div>
                    )}

                    {imageFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {imageFiles.map((url, i) => (
                          <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                        ))}
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleAddNote}
                      disabled={addNote.isPending || uploading || (!noteText && videoFiles.length === 0 && imageFiles.length === 0)}
                    >
                      Add Note
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
            <Card className="p-8 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No notes for this gig yet</p>
              {canAddNotes && (
                <p className="text-xs text-muted-foreground mt-2">
                  Add videos, photos, or notes from the performance
                </p>
              )}
            </Card>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default GigDetail;
