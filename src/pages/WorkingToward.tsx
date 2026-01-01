import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useFriendsProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { useMyPromoPosts, useFriendsPromoPosts, useCreatePromoPost, useDeletePromoPost } from '@/hooks/usePromoPosts';
import { BottomNav } from '@/components/BottomNav';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { SimpleGoals } from '@/components/SimpleGoals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CollaboratorPicker } from '@/components/CollaboratorPicker';
import { CollectionEmptyState } from '@/components/shared/CollectionEmptyState';
import { CollectionCard } from '@/components/shared/CollectionCard';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { SignedImage } from '@/components/SignedImage';
import { Plus, Disc3, Upload, Trash2, CalendarIcon, ChevronDown, ChevronRight, Calendar, Music2, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const WorkingToward = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Projects hooks
  const { data: myProjects, isLoading: myProjectsLoading } = useProjects();
  const { data: friendsProjects, isLoading: friendsProjectsLoading } = useFriendsProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  
  // Gigs hooks
  const { data: myPosts, isLoading: myGigsLoading } = useMyPromoPosts(profile?.id);
  const { data: friendsPosts, isLoading: friendsGigsLoading } = useFriendsPromoPosts();
  const createPromoPost = useCreatePromoPost();
  const deletePromoPost = useDeletePromoPost();
  
  // Collapsible states
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [gigsOpen, setGigsOpen] = useState(false);
  
  // Project dialog state
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [projectShowOnFeed, setProjectShowOnFeed] = useState(true);
  const [projectCoverImage, setProjectCoverImage] = useState<string | null>(null);
  const [projectReleaseDate, setProjectReleaseDate] = useState<Date | undefined>(undefined);
  const [projectCollaboratorIds, setProjectCollaboratorIds] = useState<string[]>([]);
  const [isProjectUploading, setIsProjectUploading] = useState(false);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  
  // Gig dialog state
  const [isGigDialogOpen, setIsGigDialogOpen] = useState(false);
  const [gigTitle, setGigTitle] = useState('');
  const [gigDescription, setGigDescription] = useState('');
  const [gigEventDate, setGigEventDate] = useState<Date | undefined>(undefined);
  const [gigEventTime, setGigEventTime] = useState('');
  const [gigLink, setGigLink] = useState('');
  const [gigShowOnFeed, setGigShowOnFeed] = useState(true);
  const [gigCollaboratorIds, setGigCollaboratorIds] = useState<string[]>([]);
  const [gigImage, setGigImage] = useState<string | null>(null);
  const [isGigUploading, setIsGigUploading] = useState(false);
  const gigFileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Project image upload
  const handleProjectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProjectUploading(true);
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

      setProjectCoverImage(urlData.publicUrl);
      toast.success('Album art uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsProjectUploading(false);
    }
  };

  // Gig image upload
  const handleGigImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGigUploading(true);
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

      setGigImage(urlData.publicUrl);
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsGigUploading(false);
    }
  };

  const handleCreateProject = () => {
    if (!profile || !newProjectTitle.trim()) return;

    createProject.mutate(
      {
        ownerId: profile.id,
        title: newProjectTitle,
        description: newProjectDescription,
        coverImage: projectCoverImage || undefined,
        showOnFeed: projectShowOnFeed,
        collaboratorIds: projectCollaboratorIds,
        releaseDate: projectReleaseDate ? format(projectReleaseDate, 'yyyy-MM-dd') : undefined,
      },
      {
        onSuccess: () => {
          setNewProjectTitle('');
          setNewProjectDescription('');
          setProjectCoverImage(null);
          setProjectShowOnFeed(true);
          setProjectCollaboratorIds([]);
          setProjectReleaseDate(undefined);
          setIsProjectDialogOpen(false);
        },
      }
    );
  };

  const handleCreateGig = () => {
    if (!profile || !gigTitle.trim()) return;

    let combinedDateTime: string | undefined;
    if (gigEventDate) {
      const year = gigEventDate.getFullYear();
      const month = String(gigEventDate.getMonth() + 1).padStart(2, '0');
      const day = String(gigEventDate.getDate()).padStart(2, '0');
      
      if (gigEventTime) {
        combinedDateTime = `${year}-${month}-${day}T${gigEventTime}:00`;
      } else {
        combinedDateTime = `${year}-${month}-${day}T12:00:00`;
      }
    }

    createPromoPost.mutate(
      {
        authorId: profile.id,
        promoType: 'gig',
        title: gigTitle,
        description: gigDescription,
        eventDate: combinedDateTime,
        image: gigImage || undefined,
        links: gigLink ? [gigLink] : [],
        showOnFeed: gigShowOnFeed,
        isPaidOpportunity: false,
        collaboratorIds: gigCollaboratorIds,
      },
      {
        onSuccess: () => {
          setGigTitle('');
          setGigDescription('');
          setGigEventDate(undefined);
          setGigEventTime('');
          setGigLink('');
          setGigShowOnFeed(true);
          setGigCollaboratorIds([]);
          setGigImage(null);
          setIsGigDialogOpen(false);
        },
      }
    );
  };

  // Filter friends data
  const filteredFriendsProjects = friendsProjects?.filter(
    (p: any) => p.owner_id !== profile?.id
  ) || [];
  
  const filteredFriendsPosts = friendsPosts?.filter(
    (p: any) => p.author_id !== profile?.id
  ) || [];

  const GigCard = ({ post, showAuthor = true, showDelete = false }: { post: any; showAuthor?: boolean; showDelete?: boolean }) => (
    <Card 
      className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/gigs/${post.id}`)}
    >
      <div className="flex items-start gap-4">
        <SignedImage
          src={post.image || ''}
          alt=""
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          fallback={
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Music2 className="w-6 h-6 text-muted-foreground" />
            </div>
          }
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <h3 className="font-semibold truncate">{post.title}</h3>
            </div>
            {showDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete gig?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{post.title}" will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deletePromoPost.mutate(post.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {showAuthor && post.author && (
            <div className="flex items-center gap-2 mt-1">
              <ClickableAvatar
                profileId={post.author_id}
                avatar={post.author?.avatar}
                name={post.author?.name}
                size="sm"
              />
              <span className="text-xs text-muted-foreground">{post.author?.name}</span>
            </div>
          )}
          
          {post.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.description}</p>
          )}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {post.event_date 
              ? format(new Date(post.event_date), 'MMM d, yyyy · h:mm a')
              : format(new Date(post.created_at), 'MMM d, yyyy')
            }
          </div>
          
          {post.links?.length > 0 && (
            <a
              href={post.links[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              View Details
            </a>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <PageLayout>
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between h-9">
            <h1 className="text-lg sm:text-xl font-semibold">Working Toward</h1>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-4">
          {/* Musical Goals */}
          {profile && <SimpleGoals profileId={profile.id} />}

          {/* Projects Section - Collapsible */}
          <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
            <Card className="bg-card border-border overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {projectsOpen ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <Disc3 className="w-5 h-5 text-foreground" />
                    <span className="font-semibold">Projects</span>
                    {myProjects && myProjects.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {myProjects.length}
                      </Badge>
                    )}
                  </div>
                  <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent onClick={(e) => e.stopPropagation()}>
                      <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors overflow-hidden"
                            onClick={() => projectFileInputRef.current?.click()}
                          >
                            {projectCoverImage ? (
                              <img src={projectCoverImage} alt="" className="w-full h-full object-cover" />
                            ) : isProjectUploading ? (
                              <div className="text-xs text-muted-foreground">Uploading...</div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Album Art</span>
                              </div>
                            )}
                          </div>
                          <input
                            ref={projectFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleProjectImageUpload}
                            className="hidden"
                          />
                        </div>

                        <Input
                          placeholder="Project title (e.g., Jazz Standards Album)"
                          value={newProjectTitle}
                          onChange={(e) => setNewProjectTitle(e.target.value)}
                        />
                        <Textarea
                          placeholder="Describe your project..."
                          value={newProjectDescription}
                          onChange={(e) => setNewProjectDescription(e.target.value)}
                          rows={3}
                        />

                        <div className="space-y-2">
                          <Label className="text-sm">Expected Release Date (optional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !projectReleaseDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {projectReleaseDate ? format(projectReleaseDate, "MMM d, yyyy") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={projectReleaseDate}
                                onSelect={setProjectReleaseDate}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="flex items-center justify-between py-2">
                          <Label htmlFor="project-show-feed" className="text-sm">Show on home feed</Label>
                          <Switch
                            id="project-show-feed"
                            checked={projectShowOnFeed}
                            onCheckedChange={setProjectShowOnFeed}
                          />
                        </div>

                        <div className="border-t border-border pt-4">
                          <CollaboratorPicker
                            selectedIds={projectCollaboratorIds}
                            onSelect={setProjectCollaboratorIds}
                            label="Tag Collaborators"
                          />
                        </div>

                        <Button
                          className="w-full bg-gradient-primary text-primary-foreground"
                          onClick={handleCreateProject}
                          disabled={createProject.isPending || !newProjectTitle.trim() || isProjectUploading}
                        >
                          Create Project
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <Tabs defaultValue="my" className="w-full">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="my" className="flex-1">My Projects</TabsTrigger>
                      <TabsTrigger value="friends" className="flex-1">Friend's Projects</TabsTrigger>
                    </TabsList>

                    <TabsContent value="my" className="space-y-4">
                      {myProjectsLoading ? (
                        <div className="text-center text-muted-foreground py-8">Loading...</div>
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
                              releaseDate={project.release_date}
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
                                      <AlertDialogTitle>Delete project?</AlertDialogTitle>
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
                          icon={Disc3}
                          title="No projects yet"
                          subtitle={"Create a project to organize your\nnotes around a goal"}
                          actionLabel="Create First Project"
                          onAction={() => setIsProjectDialogOpen(true)}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="friends" className="space-y-4">
                      {friendsProjectsLoading ? (
                        <div className="text-center text-muted-foreground py-8">Loading...</div>
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
                          icon={Disc3}
                          title="No friend's projects"
                          subtitle="Connect with friends to see their projects"
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Gigs Section - Collapsible */}
          <Collapsible open={gigsOpen} onOpenChange={setGigsOpen}>
            <Card className="bg-card border-border overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {gigsOpen ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <Calendar className="w-5 h-5 text-foreground" />
                    <span className="font-semibold">Gigs</span>
                    {myPosts && myPosts.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {myPosts.length}
                      </Badge>
                    )}
                  </div>
                  <Dialog open={isGigDialogOpen} onOpenChange={setIsGigDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent onClick={(e) => e.stopPropagation()}>
                      <DialogHeader>
                        <DialogTitle>Create New Gig</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className="w-24 h-24 rounded-lg bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors overflow-hidden"
                            onClick={() => gigFileInputRef.current?.click()}
                          >
                            {gigImage ? (
                              <img src={gigImage} alt="" className="w-full h-full object-cover" />
                            ) : isGigUploading ? (
                              <div className="text-xs text-muted-foreground">Uploading...</div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Add Image</span>
                              </div>
                            )}
                          </div>
                          <input
                            ref={gigFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleGigImageUpload}
                            className="hidden"
                          />
                          <span className="text-xs text-muted-foreground">Optional gig image</span>
                        </div>

                        <Input
                          placeholder="Gig title (e.g., Jazz Night at Blue Note)"
                          value={gigTitle}
                          onChange={(e) => setGigTitle(e.target.value)}
                        />
                        <Textarea
                          placeholder="Describe your gig..."
                          value={gigDescription}
                          onChange={(e) => setGigDescription(e.target.value)}
                          rows={3}
                        />
                        <div className="space-y-3">
                          <Label className="text-sm text-muted-foreground block">
                            Event Date & Time
                          </Label>
                          <div className="flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "flex-1 justify-start text-left font-normal",
                                    !gigEventDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {gigEventDate ? format(gigEventDate, "MMM d, yyyy") : "Pick date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={gigEventDate}
                                  onSelect={setGigEventDate}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                              <Input
                                type="time"
                                value={gigEventTime}
                                onChange={(e) => setGigEventTime(e.target.value)}
                                className="pl-9 w-[120px]"
                                placeholder="Time"
                              />
                            </div>
                          </div>
                        </div>
                        <Input
                          placeholder="Link (optional)"
                          value={gigLink}
                          onChange={(e) => setGigLink(e.target.value)}
                        />
                        
                        <div className="flex items-center justify-between py-2">
                          <Label htmlFor="gig-show-feed" className="text-sm">Show on home feed</Label>
                          <Switch
                            id="gig-show-feed"
                            checked={gigShowOnFeed}
                            onCheckedChange={setGigShowOnFeed}
                          />
                        </div>

                        <div className="border-t border-border pt-4">
                          <CollaboratorPicker
                            selectedIds={gigCollaboratorIds}
                            onSelect={setGigCollaboratorIds}
                            label="Tag Collaborators"
                          />
                        </div>

                        <Button
                          className="w-full bg-gradient-primary text-primary-foreground"
                          onClick={handleCreateGig}
                          disabled={createPromoPost.isPending || isGigUploading || !gigTitle.trim()}
                        >
                          Create Gig
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <Tabs defaultValue="my" className="w-full">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="my" className="flex-1">My Gigs</TabsTrigger>
                      <TabsTrigger value="friends" className="flex-1">Friend's Gigs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="my" className="space-y-4">
                      {myGigsLoading ? (
                        <div className="text-center text-muted-foreground py-8">Loading...</div>
                      ) : myPosts && myPosts.length > 0 ? (
                        <div className="space-y-4">
                          {myPosts.map((post: any) => (
                            <GigCard key={post.id} post={post} showAuthor={false} showDelete={true} />
                          ))}
                        </div>
                      ) : (
                        <CollectionEmptyState
                          icon={Music2}
                          title="No gigs yet"
                          subtitle="Share your first gig with your friends"
                          actionLabel="Create First Gig"
                          onAction={() => setIsGigDialogOpen(true)}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="friends" className="space-y-4">
                      {friendsGigsLoading ? (
                        <div className="text-center text-muted-foreground py-8">Loading...</div>
                      ) : filteredFriendsPosts.length > 0 ? (
                        <div className="space-y-4">
                          {filteredFriendsPosts.map((post: any) => (
                            <GigCard key={post.id} post={post} />
                          ))}
                        </div>
                      ) : (
                        <CollectionEmptyState
                          icon={Music2}
                          title="No friend's gigs"
                          subtitle="Connect with friends to see their gigs"
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </main>
      </PageBody>

      <BottomNav />
    </PageLayout>
  );
};

export default WorkingToward;
