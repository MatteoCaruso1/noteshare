import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useFriendsProjects, useCreateProject } from '@/hooks/useProjects';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CollaboratorPicker } from '@/components/CollaboratorPicker';
import { Plus, Disc3, Calendar, Upload, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Projects = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: myProjects, isLoading: myLoading } = useProjects();
  const { data: friendsProjects, isLoading: friendsLoading } = useFriendsProjects();
  const createProject = useCreateProject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showOnFeed, setShowOnFeed] = useState(false);
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
          setShowOnFeed(false);
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

  const ProjectCard = ({ project, showOwner = false }: { project: any; showOwner?: boolean }) => (
    <Card
      className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start gap-4">
        {project.cover_image ? (
          <img
            src={project.cover_image}
            alt=""
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center">
            <Disc3 className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{project.title}</h3>
          {showOwner && project.owner && (
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="w-4 h-4">
                <AvatarImage src={project.owner.avatar || ''} />
                <AvatarFallback><User className="w-2 h-2" /></AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{project.owner.name}</span>
            </div>
          )}
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {format(new Date(project.created_at), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
    </Card>
  );

  const EmptyState = ({ message, onAction }: { message: string; onAction?: () => void }) => (
    <div className="text-center py-12">
      <Disc3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No projects yet</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onAction && (
        <Button
          className="bg-gradient-primary text-primary-foreground"
          onClick={onAction}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create First Project
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Projects</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
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
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6">
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
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState
                message="Create a project to organize your practice notes around a goal"
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
                  <ProjectCard key={project.id} project={project} showOwner />
                ))}
              </div>
            ) : (
              <EmptyState message="Connect with friends to see their projects" />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Projects;
