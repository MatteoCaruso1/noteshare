import { useState, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { NoteCard } from '@/components/NoteCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextarea } from '@/components/RichTextarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CollectionDetailHeader } from '@/components/shared/CollectionDetailHeader';
import { NotesEmptyState } from '@/components/shared/NotesEmptyState';
import { AddNoteDialog } from '@/components/shared/AddNoteDialog';
import { ProjectCoverPicker } from '@/components/ProjectCoverPicker';
import { FolderOpen, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
      toast.success('Note added to folder!');
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
  const [editCoverImage, setEditCoverImage] = useState<string | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editReleaseDate, setEditReleaseDate] = useState('');
  const [editShowOnFeed, setEditShowOnFeed] = useState(true);

  const isOwner = profile?.id === project?.owner_id;
  const isCollaborator = project?.collaborator_ids?.includes(profile?.id || '');
  const canAddNotes = isOwner || isCollaborator;

  const openSettings = () => {
    if (project) {
      setEditTitle(project.title);
      setEditDescription(project.description || '');
      setEditCoverImage(project.cover_image || null);
      setEditCoverPreview(null); // Will use ProjectCover component for display
      setEditReleaseDate(project.release_date || '');
      setEditShowOnFeed(project.show_on_feed ?? true);
      setIsSettingsOpen(true);
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
        releaseDate: editReleaseDate || undefined,
        showOnFeed: editShowOnFeed,
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
        <p className="text-muted-foreground mb-4">Folder not found</p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          Back to Folders
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
          coverIcon={<FolderOpen className="w-6 h-6 text-muted-foreground" />}
          showSettings={isOwner}
          onSettingsClick={openSettings}
          useProjectCover
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
              <h2 className="text-lg font-semibold">Folder Notes</h2>
              {canAddNotes && profile && (
                <AddNoteDialog
                  open={isAddNoteOpen}
                  onOpenChange={setIsAddNoteOpen}
                  onSubmit={handleAddNote}
                  isSubmitting={addNote.isPending}
                   title="Add Note to Folder"
                   contextLabel="this folder"
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
            ) : null}
          </section>
        </main>
      </PageBody>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-[calc(100vw-2rem)] sm:max-w-lg w-full overflow-x-hidden box-border">
          <DialogHeader>
             <DialogTitle>Folder Settings</DialogTitle>
             <DialogDescription>Update your folder details or delete the folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Album Art / Icon Picker */}
            {profile && (
              <ProjectCoverPicker
                value={editCoverImage}
                onChange={setEditCoverImage}
                profileId={profile.id}
                previewUrl={editCoverPreview}
                onPreviewUrlChange={setEditCoverPreview}
              />
            )}

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus={false}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <RichTextarea
                value={editDescription}
                onChange={setEditDescription}
                rows={3}
                autoExpand
                placeholder="Add a description..."
              />
            </div>
            <div>
              <Label htmlFor="release-date">Expected Release Date</Label>
              <Input
                id="release-date"
                type="date"
                value={editReleaseDate}
                onChange={(e) => setEditReleaseDate(e.target.value)}
                className="w-full max-w-full min-w-0 box-border [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left"
              />
            </div>

            {/* Show on Home Feed Toggle */}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="edit-show-feed" className="text-sm">Show on home feed</Label>
              <Switch
                id="edit-show-feed"
                checked={editShowOnFeed}
                onCheckedChange={setEditShowOnFeed}
              />
            </div>


            <Button
              className="w-full bg-gradient-primary text-primary-foreground"
              onClick={handleSaveSettings}
              disabled={updateProject.isPending || !editTitle.trim()}
            >
              Save Changes
            </Button>

            {/* Delete Project */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                   Delete Folder
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete folder?</AlertDialogTitle>
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

      
    </PageLayout>
  );
};

export default ProjectDetail;
