import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useFriendsProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RichTextarea } from '@/components/RichTextarea';
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
import { Label } from '@/components/ui/label';
import { CollectionEmptyState } from '@/components/shared/CollectionEmptyState';
import { CollectionCard } from '@/components/shared/CollectionCard';
import { ProjectCoverPicker } from '@/components/ProjectCoverPicker';
import { CollaboratorPicker } from '@/components/CollaboratorPicker';
import { Plus, FolderOpen, Trash2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

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
  const [coverImageValue, setCoverImageValue] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [showOnFeed, setShowOnFeed] = useState(true);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleCreateProject = () => {
    if (!profile || !newTitle.trim()) return;

    createProject.mutate(
      {
        ownerId: profile.id,
        title: newTitle,
        description: newDescription,
        coverImage: coverImageValue || undefined,
        showOnFeed,
        collaboratorIds,
        releaseDate: releaseDate ? format(releaseDate, 'yyyy-MM-dd') : undefined,
      },
      {
        onSuccess: async (data) => {
          // Send notifications to collaborators
          if (collaboratorIds.length > 0 && profile) {
            for (const collabId of collaboratorIds) {
              await supabase.from('notifications').insert({
                user_id: collabId,
                from_user_id: profile.id,
                type: 'folder_collaborator',
                content: `${profile.name} added you to the folder "${newTitle}"`,
              });
            }
          }
          setNewTitle('');
          setNewDescription('');
          setCoverImageValue(null);
          setCoverImagePreview(null);
          setReleaseDate(undefined);
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
    <PageLayout>
      {/* Page Header */}
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between h-9">
            <h1 className="text-lg sm:text-xl font-semibold">Folders</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Album Art / Icon Picker */}
                  {profile && (
                    <ProjectCoverPicker
                      value={coverImageValue}
                      onChange={setCoverImageValue}
                      profileId={profile.id}
                      previewUrl={coverImagePreview}
                      onPreviewUrlChange={setCoverImagePreview}
                    />
                  )}

                  <Input
                    placeholder="Folder title (e.g., Jazz Standards Album)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus={false}
                  />
                  <RichTextarea
                    placeholder="Describe your project..."
                    value={newDescription}
                    onChange={setNewDescription}
                    rows={8}
                  />

                  {/* Release Date */}
                  <div className="space-y-2">
                    <Label className="text-sm">Expected Release Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !releaseDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {releaseDate ? format(releaseDate, "MMM d, yyyy") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={releaseDate}
                          onSelect={setReleaseDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Show on Feed Toggle */}
                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="show-feed-project" className="text-sm">Show on home feed</Label>
                    <Switch
                      id="show-feed-project"
                      checked={showOnFeed}
                      onCheckedChange={setShowOnFeed}
                    />
                  </div>

                  {/* Collaborators */}
                  <CollaboratorPicker
                    selectedIds={collaboratorIds}
                    onSelect={setCollaboratorIds}
                    label="Collaborators"
                  />

                  <Button
                    className="w-full bg-gradient-primary text-primary-foreground"
                    onClick={handleCreateProject}
                    disabled={createProject.isPending || !newTitle.trim()}
                  >
                    Create Folder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2">
          <Tabs defaultValue="my" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="my" className="flex-1">My Folders</TabsTrigger>
              <TabsTrigger value="friends" className="flex-1">Friend's Folders</TabsTrigger>
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
                      coverIcon={<FolderOpen className="w-6 h-6 text-muted-foreground" />}
                      date={project.created_at}
                      releaseDate={project.release_date}
                      useProjectCover
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
                              <AlertDialogTitle>Delete folder?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{project.title}" will be permanently deleted.
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
                  icon={FolderOpen}
                  title="No folders yet"
                  subtitle={"Create a folder to organize your\nnotes around a goal"}
                  actionLabel="Create First Folder"
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
                      coverIcon={<FolderOpen className="w-6 h-6 text-muted-foreground" />}
                      date={project.created_at}
                      useProjectCover
                      releaseDate={project.release_date}
                      showOwner
                      ownerId={project.owner_id}
                      ownerName={project.owner?.name}
                      ownerAvatar={project.owner?.avatar}
                    />
                  ))}
                </div>
              ) : (
                <CollectionEmptyState
                  icon={FolderOpen}
                  title="No friend's folders"
                  subtitle="Connect with friends to see their folders"
                />
              )}
            </TabsContent>
          </Tabs>
        </main>
      </PageBody>

      
    </PageLayout>
  );
};

export default Projects;
