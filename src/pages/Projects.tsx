import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useFriendsProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CollaboratorPicker } from '@/components/CollaboratorPicker';
import { CollectionEmptyState } from '@/components/shared/CollectionEmptyState';
import { CollectionCard } from '@/components/shared/CollectionCard';
import { Plus, Disc3, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Projects = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: myProjects, isLoading: myLoading } = useProjects();
  const { data: friendsProjects, isLoading: friendsLoading } = useFriendsProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showOnFeed, setShowOnFeed] = useState(true); // Default to true (friends visibility)
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setCoverImage(urlData.publicUrl);
      toast.success('Album art uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateProject = () => {
    if (!profile || !newTitle.trim()) return;

    createProject.mutate(
      {
        ownerId: profile.id,
        title: newTitle,
        description: newDescription,
        coverImage: coverImage || undefined,
        showOnFeed,
        collaboratorIds,
      },
      {
        onSuccess: () => {
          setNewTitle('');
          setNewDescription('');
          setCoverImage(null);
          setShowOnFeed(true);
          setCollaboratorIds([]);
          setIsDialogOpen(false);
        },
      }
    );
  };

  // Filter friends projects to exclude own projects
  const filteredFriendsProjects = friendsProjects?.filter(
    (p: any) => p.owner_id !== profile?.id
  ) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold">Projects</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {/* Album Art Upload */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {coverImage ? (
                      <img src={coverImage} alt="" className="w-full h-full object-cover" />
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
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <Input
                  placeholder="Project title (e.g., Jazz Standards Album)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Describe your project..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
                
                {/* Show on Feed Toggle */}
                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="show-feed" className="text-sm">Show on home feed</Label>
                  <Switch
                    id="show-feed"
                    checked={showOnFeed}
                    onCheckedChange={setShowOnFeed}
                  />
                </div>

                {/* Collaborator Picker */}
                <div className="border-t border-border pt-4">
                  <CollaboratorPicker
                    selectedIds={collaboratorIds}
                    onSelect={setCollaboratorIds}
                    label="Tag Collaborators"
                  />
                </div>

                <Button
                  className="w-full bg-gradient-primary text-primary-foreground"
                  onClick={handleCreateProject}
                  disabled={createProject.isPending || !newTitle.trim() || isUploading}
                >
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <main className="container max-w-2xl mx-auto px-4 py-4">
        <Tabs defaultValue="my" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="my" className="flex-1">My Projects</TabsTrigger>
            <TabsTrigger value="friends" className="flex-1">Friend's Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-4">
            {myLoading ? (
              <div className="text-center text-muted-foreground py-12">Loading...</div>
            ) : myProjects && myProjects.length > 0 ? (
              <div className="space-y-4">
                {myProjects.map((project) => (
                  <CollectionCard
                    key={project.id}
                    id={project.id}
                    path="/projects"
                    title={project.title}
                    description={project.description}
                    coverImage={project.cover_image}
                    coverIcon={<Disc3 className="w-6 h-6 text-muted-foreground" />}
                    date={project.created_at}
                    actions={
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{project.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteProject.mutate(project.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    }
                  />
                ))}
              </div>
            ) : (
              <CollectionEmptyState
                icon={Disc3}
                title="No projects yet"
                subtitle="Create your first project to organize your practice notes around a goal"
                actionLabel="Create First Project"
                onAction={() => setIsDialogOpen(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            {friendsLoading ? (
              <div className="text-center text-muted-foreground py-12">Loading...</div>
            ) : filteredFriendsProjects.length > 0 ? (
              <div className="space-y-4">
                {filteredFriendsProjects.map((project: any) => (
                  <CollectionCard
                    key={project.id}
                    id={project.id}
                    path="/projects"
                    title={project.title}
                    description={project.description}
                    coverImage={project.cover_image}
                    coverIcon={<Disc3 className="w-6 h-6 text-muted-foreground" />}
                    date={project.created_at}
                    showOwner
                    ownerName={project.owner?.name}
                    ownerAvatar={project.owner?.avatar}
                  />
                ))}
              </div>
            ) : (
              <CollectionEmptyState
                icon={Disc3}
                title="No friend's projects"
                subtitle="Connect with friends to see their projects"
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Projects;
