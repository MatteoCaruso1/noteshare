import { useState, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/BottomNav';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { NoteCard } from '@/components/NoteCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CollectionDetailHeader } from '@/components/shared/CollectionDetailHeader';
import { NotesEmptyState } from '@/components/shared/NotesEmptyState';
import { AddNoteDialog } from '@/components/shared/AddNoteDialog';
import { Disc3, Upload, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function useAddNoteToProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      authorId,
      projectId,
      textContent,
      videoFiles = [],
      imageFiles = [],
      audioFiles = [],
      audioFileNames = [],
    }: {
      authorId: string;
      projectId: string;
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
          project_id: projectId,
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
      queryClient.invalidateQueries({ queryKey: ['notes', variables.projectId] });
      toast.success('Note added to project!');
    },
    onError: (error) => {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    },
  });
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: project, isLoading: projectLoading } = useProject(id || '');
  const { data: notes, isLoading: notesLoading } = useNotes(id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const addNote = useAddNoteToProject();

  // Scroll to top instantly on mount
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [id]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editShowOnFeed, setEditShowOnFeed] = useState(false);
  const [editCoverImage, setEditCoverImage] = useState<string | null>(null);
  const [editReleaseDate, setEditReleaseDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = profile?.id === project?.owner_id;
  const isCollaborator = project?.collaborator_ids?.includes(profile?.id || '');
  const canAddNotes = isOwner || isCollaborator;

  const openSettings = () => {
    if (project) {
      setEditTitle(project.title);
      setEditDescription(project.description || '');
      setEditShowOnFeed(project.show_on_feed || false);
      setEditCoverImage(project.cover_image || null);
      setEditReleaseDate(project.release_date || '');
      setIsSettingsOpen(true);
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profile.id}/project-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('practice-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Use signed URL for preview since the bucket is private
      const { data: signedData, error: signedError } = await supabase.storage
        .from('practice-media')
        .createSignedUrl(filePath, 60 * 60); // 1 hour for preview

      if (signedError) throw signedError;

      // Store the path (not the signed URL) for saving to DB
      setEditCoverImage(filePath);
      toast.success('Album art uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

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
        projectId: id,
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

  const handleSaveSettings = () => {
    if (!project) return;

    updateProject.mutate(
      {
        projectId: project.id,
        title: editTitle,
        description: editDescription,
        coverImage: editCoverImage || undefined,
        showOnFeed: editShowOnFeed,
        releaseDate: editReleaseDate || undefined,
      },
      {
        onSuccess: () => {
          setIsSettingsOpen(false);
        },
      }
    );
  };

  const handleDeleteProject = () => {
    if (!project) return;

    deleteProject.mutate(project.id, {
      onSuccess: () => {
        // Navigate back after deleting
        navigate(-1);
      },
    });
  };

  // Always use history back to return to the previous page with its state preserved
  const useHistoryBack = true;

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Project not found</p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          Back to Projects
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
          title={project.title}
          date={project.release_date || ''}
          dateLabel="Expected release"
          authorId={project.owner_id}
          authorName={project.owner?.name}
          authorUsername={project.owner?.username}
          authorAvatar={project.owner?.avatar}
          coverImage={project.cover_image}
          coverIcon={<Disc3 className="w-6 h-6 text-muted-foreground" />}
          showSettings={isOwner}
          onSettingsClick={openSettings}
        />
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Project Description */}
          {project.description && (
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="text-sm text-muted-foreground whitespace-pre-line">{project.description}</p>
            </div>
          )}

          {/* Notes Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Project Notes</h2>
              {canAddNotes && profile && (
                <AddNoteDialog
                  open={isAddNoteOpen}
                  onOpenChange={setIsAddNoteOpen}
                  onSubmit={handleAddNote}
                  isSubmitting={addNote.isPending}
                  title="Add Note to Project"
                  contextLabel="this project"
                  profileId={profile.id}
                />
              )}
            </div>

            {notesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : notes && notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} fromProject={id} />
                ))}
              </div>
            ) : (
              <NotesEmptyState canAddNotes={canAddNotes} contextLabel="this project" />
            )}
          </section>
        </main>
      </PageBody>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>Update your project details or delete the project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Album Art Upload */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {editCoverImage ? (
                  <img src={editCoverImage} alt="" className="w-full h-full object-cover" />
                ) : isUploading ? (
                  <div className="text-xs text-muted-foreground">Uploading...</div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Album Art</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverImageUpload}
                className="hidden"
              />
              <span className="text-xs text-muted-foreground">Click to change album art</span>
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
              <Label htmlFor="release-date">Expected Release Date</Label>
              <Input
                id="release-date"
                type="date"
                value={editReleaseDate}
                onChange={(e) => setEditReleaseDate(e.target.value)}
              />
            </div>
            

            <Button
              className="w-full bg-gradient-primary text-primary-foreground"
              onClick={handleSaveSettings}
              disabled={updateProject.isPending || isUploading || !editTitle.trim()}
            >
              Save Changes
            </Button>

            {/* Delete Project */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{project.title}" will be deleted. Attached notes will remain.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteProject}
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
    </PageLayout>
  );
};

export default ProjectDetail;
