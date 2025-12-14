import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { BottomNav } from '@/components/BottomNav';
import { Timeline } from '@/components/Timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Settings, Disc3, Upload, Trash2, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
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
    }: {
      authorId: string;
      projectId: string;
      textContent?: string;
      videoFiles?: string[];
      imageFiles?: string[];
      audioFiles?: string[];
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
  const { uploadFile, uploading } = useMediaUpload();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editShowOnFeed, setEditShowOnFeed] = useState(false);
  const [editCoverImage, setEditCoverImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add note state
  const [noteText, setNoteText] = useState('');
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [audioFiles, setAudioFiles] = useState<string[]>([]);

  const isOwner = profile?.id === project?.owner_id;
  const isCollaborator = project?.collaborator_ids?.includes(profile?.id || '');
  const canAddNotes = isOwner || isCollaborator;

  const openSettings = () => {
    if (project) {
      setEditTitle(project.title);
      setEditDescription(project.description || '');
      setEditShowOnFeed(project.show_on_feed || false);
      setEditCoverImage(project.cover_image || null);
      setIsSettingsOpen(true);
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `project-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('practice-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('practice-media')
        .getPublicUrl(filePath);

      setEditCoverImage(urlData.publicUrl);
      toast.success('Album art uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profile) {
      const url = await uploadFile(file, profile.id, 'audio');
      if (url) {
        setAudioFiles([...audioFiles, url]);
      }
    }
  };

  const handleAddNote = () => {
    if (!profile || !id) return;

    addNote.mutate(
      {
        authorId: profile.id,
        projectId: id,
        textContent: noteText || undefined,
        videoFiles,
        imageFiles,
        audioFiles,
      },
      {
        onSuccess: () => {
          setNoteText('');
          setVideoFiles([]);
          setImageFiles([]);
          setAudioFiles([]);
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
        navigate('/projects');
      },
    });
  };

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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            {project.cover_image ? (
              <img
                src={project.cover_image}
                alt=""
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Disc3 className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{project.title}</h1>
              <p className="text-xs text-muted-foreground">
                Created {format(new Date(project.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          {isOwner && (
            <Button variant="ghost" size="icon" onClick={openSettings}>
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Project Info */}
        {project.description && (
          <div className="p-4 bg-card rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
        )}

        {/* Project Notes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Project Notes</h2>
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
                    <DialogTitle>Add Note to Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Textarea
                      placeholder="Add a note about this project..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                    />

                    <div className="flex gap-2 flex-wrap">
                      <label className="cursor-pointer flex-1 min-w-[100px]">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm">
                          🎵 Audio
                        </div>
                      </label>
                      <label className="cursor-pointer flex-1 min-w-[100px]">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm">
                          📹 Video
                        </div>
                      </label>
                      <label className="cursor-pointer flex-1 min-w-[100px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm">
                          📷 Image
                        </div>
                      </label>
                    </div>

                    {audioFiles.length > 0 && (
                      <div className="space-y-2">
                        {audioFiles.map((url, i) => (
                          <audio key={i} src={url} controls className="w-full" />
                        ))}
                      </div>
                    )}

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
                      disabled={addNote.isPending || uploading || (!noteText && videoFiles.length === 0 && imageFiles.length === 0 && audioFiles.length === 0)}
                    >
                      Add Note
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {notes && notes.length > 0 ? (
            <Timeline notes={notes} loading={notesLoading} />
          ) : (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No notes in this project yet</p>
              {canAddNotes && (
                <p className="text-xs text-muted-foreground mt-2">
                  Add audio, videos, photos, or notes to your project
                </p>
              )}
            </div>
          )}
        </section>
      </main>

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
            
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="show-feed">Show on home feed</Label>
              <Switch
                id="show-feed"
                checked={editShowOnFeed}
                onCheckedChange={setEditShowOnFeed}
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
                  <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{project.title}" and cannot be undone.
                    Notes linked to this project will not be deleted.
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
    </div>
  );
};

export default ProjectDetail;