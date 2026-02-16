import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useFriendsProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { useMyPromoPosts, useFriendsPromoPosts, useCreatePromoPost, useDeletePromoPost } from '@/hooks/usePromoPosts';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { SimpleGoals } from '@/components/SimpleGoals';
import { PremiumGate } from '@/components/PremiumGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextarea } from '@/components/RichTextarea';
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
import { ProjectCoverPicker, ProjectCover } from '@/components/ProjectCoverPicker';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { SignedImage } from '@/components/SignedImage';
import { Plus, FolderOpen, Upload, Trash2, CalendarIcon, ChevronDown, ChevronRight, Calendar, Music2, ExternalLink, Clock } from 'lucide-react';
import { cn, formatLocalDateTime } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Storage keys for persisting UI state (not scroll - that's handled by useScrollRestoration)
const WORKING_TOWARD_UI_STATE_KEY = 'noteshare_working_toward_ui_state';

interface WorkingTowardUIState {
  projectsOpen: boolean;
  gigsOpen: boolean;
  projectsTab: string;
  gigsTab: string;
}

const getStoredUIState = (): WorkingTowardUIState | null => {
  try {
    const stored = sessionStorage.getItem(WORKING_TOWARD_UI_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveUIState = (state: Partial<WorkingTowardUIState>) => {
  try {
    const current = getStoredUIState() || { projectsOpen: false, gigsOpen: false, projectsTab: 'mine', gigsTab: 'mine' };
    sessionStorage.setItem(WORKING_TOWARD_UI_STATE_KEY, JSON.stringify({ ...current, ...state }));
  } catch {
    // Ignore storage errors
  }
};

const WorkingToward = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Use the standard scroll restoration hook - this integrates with PageLayout
  // to prevent header flash when returning to this page with a scroll position
  useScrollRestoration('pursuits');
  
  // Get stored UI state for initial values (collapsible/tab states only)
  const storedUIState = getStoredUIState();
  
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
  
  // Collapsible states - initialize from stored state
  const [projectsOpen, setProjectsOpen] = useState(storedUIState?.projectsOpen ?? false);
  const [gigsOpen, setGigsOpen] = useState(storedUIState?.gigsOpen ?? false);
  
  // Tab states - initialize from stored state
  const [projectsTab, setProjectsTab] = useState(storedUIState?.projectsTab ?? 'mine');
  const [gigsTab, setGigsTab] = useState(storedUIState?.gigsTab ?? 'mine');
  
  // Save UI state when it changes
  useEffect(() => {
    saveUIState({ projectsOpen, gigsOpen, projectsTab, gigsTab });
  }, [projectsOpen, gigsOpen, projectsTab, gigsTab]);
  
  // Project dialog state
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [projectCoverValue, setProjectCoverValue] = useState<string | null>(null);
  const [projectCoverPreview, setProjectCoverPreview] = useState<string | null>(null);
  const [projectReleaseDate, setProjectReleaseDate] = useState<Date | undefined>(undefined);
  const [projectShowOnFeed, setProjectShowOnFeed] = useState(true);
  
  // Gig dialog state
  const [isGigDialogOpen, setIsGigDialogOpen] = useState(false);
  const [gigTitle, setGigTitle] = useState('');
  const [gigDescription, setGigDescription] = useState('');
  const [gigEventDate, setGigEventDate] = useState<Date | undefined>(undefined);
  const [gigEventTime, setGigEventTime] = useState('');
  const [gigLink, setGigLink] = useState('');
  const [gigShowOnFeed, setGigShowOnFeed] = useState(true);
  const [gigCollaboratorIds, setGigCollaboratorIds] = useState<string[]>([]);
  const [gigCoverValue, setGigCoverValue] = useState<string | null>(null);
  const [gigCoverPreview, setGigCoverPreview] = useState<string | null>(null);
  const [gigRepostReminderDays, setGigRepostReminderDays] = useState<string>('');

  if (!user) {
    navigate('/auth');
    return null;
  }



  const handleCreateProject = () => {
    if (!profile || !newProjectTitle.trim()) return;

    createProject.mutate(
      {
        ownerId: profile.id,
        title: newProjectTitle,
        description: newProjectDescription,
        coverImage: projectCoverValue || undefined,
        showOnFeed: projectShowOnFeed,
        collaboratorIds: [],
        releaseDate: projectReleaseDate ? format(projectReleaseDate, 'yyyy-MM-dd') : undefined,
      },
      {
        onSuccess: () => {
          setNewProjectTitle('');
          setNewProjectDescription('');
          setProjectCoverValue(null);
          setProjectCoverPreview(null);
          setProjectReleaseDate(undefined);
          setProjectShowOnFeed(true);
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
        image: gigCoverValue || undefined,
        links: gigLink ? [gigLink] : [],
        showOnFeed: gigShowOnFeed,
        isPaidOpportunity: false,
        collaboratorIds: gigCollaboratorIds,
        repostReminderDays: gigRepostReminderDays ? parseInt(gigRepostReminderDays, 10) : null,
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
          setGigCoverValue(null);
          setGigCoverPreview(null);
          setGigRepostReminderDays('');
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
        <ProjectCover value={post.image} className="w-16 h-16" iconClassName="w-6 h-6" />
        
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
              ? formatLocalDateTime(post.event_date)
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
            <h1 className="text-lg sm:text-xl font-semibold">Organize</h1>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <PremiumGate featureName="Working Towards" blur={true}>
          <main className="container max-w-2xl mx-auto px-4 py-2 space-y-4">
            {/* Musical Goals */}
            {profile && <SimpleGoals profileId={profile.id} />}

          {/* Projects Section - Collapsible */}
          <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
            <Card className="bg-card border-border overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <FolderOpen className={cn("w-5 h-5 transition-colors", projectsOpen ? "text-primary" : "text-foreground")} />
                    <span className="font-semibold">Folders</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className={cn("h-8 transition-opacity", projectsOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent onClick={(e) => e.stopPropagation()} onOpenAutoFocus={(e) => e.preventDefault()}>
                        <DialogHeader>
                          <DialogTitle>Create New Folder</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          {/* Album Art / Icon Picker */}
                          {profile && (
                            <ProjectCoverPicker
                              value={projectCoverValue}
                              onChange={setProjectCoverValue}
                              profileId={profile.id}
                              previewUrl={projectCoverPreview}
                              onPreviewUrlChange={setProjectCoverPreview}
                            />
                          )}

                          <Input
                            placeholder="Folder title (e.g., Jazz Standards Album)"
                            value={newProjectTitle}
                            onChange={(e) => setNewProjectTitle(e.target.value)}
                            autoFocus={false}
                          />
                          <RichTextarea
                            placeholder="Describe your folder..."
                            value={newProjectDescription}
                            onChange={setNewProjectDescription}
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

                          {/* Show on Home Feed Toggle */}
                          <div className="flex items-center justify-between py-2">
                            <Label htmlFor="project-show-feed" className="text-sm">Show on home feed</Label>
                            <Switch
                              id="project-show-feed"
                              checked={projectShowOnFeed}
                              onCheckedChange={setProjectShowOnFeed}
                            />
                          </div>

                          <Button
                            className="w-full bg-gradient-primary text-primary-foreground"
                            onClick={handleCreateProject}
                            disabled={createProject.isPending || !newProjectTitle.trim()}
                          >
                            Create Folder
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    {projectsOpen ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <Tabs value={projectsTab} onValueChange={setProjectsTab} className="w-full">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="mine" className="flex-1">My Folders</TabsTrigger>
                      <TabsTrigger value="friends" className="flex-1">Friends' Folders</TabsTrigger>
                    </TabsList>

                    <TabsContent value="mine" className="space-y-4">
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
                          subtitle={"Create a folder to organize your\nnotes around a goal"}
                          actionLabel="Create First Folder"
                          onAction={() => setIsProjectDialogOpen(true)}
                          showIcon={false}
                          showPlusInButton={false}
                          compact
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
                              coverIcon={<FolderOpen className="w-6 h-6 text-muted-foreground" />}
                              date={project.created_at}
                              releaseDate={project.release_date}
                              useProjectCover
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
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Gigs Section - Collapsible */}
          <Collapsible open={gigsOpen} onOpenChange={setGigsOpen}>
            <Card className="bg-card border-border overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Calendar className={cn("w-5 h-5 transition-colors", gigsOpen ? "text-primary" : "text-foreground")} />
                    <span className="font-semibold">Gigs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Dialog open={isGigDialogOpen} onOpenChange={setIsGigDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className={cn("h-8 transition-opacity", gigsOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
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
                          <ProjectCoverPicker
                            value={gigCoverValue}
                            onChange={setGigCoverValue}
                            profileId={profile?.id || ''}
                            previewUrl={gigCoverPreview}
                            onPreviewUrlChange={setGigCoverPreview}
                          />

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

                          {/* Repost Reminder */}
                          <div>
                            <Label htmlFor="wt-repost-reminder" className="text-sm">Repost reminder (optional)</Label>
                            <p className="text-xs text-muted-foreground mb-1.5">
                              Repost this gig on your timeline to remind followers before the event
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                id="wt-repost-reminder"
                                type="number"
                                min="1"
                                max="30"
                                value={gigRepostReminderDays}
                                onChange={(e) => setGigRepostReminderDays(e.target.value)}
                                placeholder="e.g. 3"
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">days before event</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <CollaboratorPicker
                              selectedIds={gigCollaboratorIds}
                              onSelect={setGigCollaboratorIds}
                              label="Tag Collaborators"
                            />
                          </div>

                          <Button
                            className="w-full bg-gradient-primary text-primary-foreground"
                            onClick={handleCreateGig}
                            disabled={createPromoPost.isPending || !gigTitle.trim()}
                          >
                            Create Gig
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    {gigsOpen ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <Tabs value={gigsTab} onValueChange={setGigsTab} className="w-full">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="mine" className="flex-1">My Gigs</TabsTrigger>
                      <TabsTrigger value="friends" className="flex-1">Friends' Gigs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="mine" className="space-y-4">
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
                          subtitle="Share your first gig with your friends"
                          actionLabel="Create First Gig"
                          onAction={() => setIsGigDialogOpen(true)}
                          showIcon={false}
                          showPlusInButton={false}
                          compact
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
        </PremiumGate>
      </PageBody>
    </PageLayout>
  );
};

export default WorkingToward;
