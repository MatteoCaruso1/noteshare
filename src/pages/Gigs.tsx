import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPromoPosts, useFriendsPromoPosts, usePaidGigs, useCreatePromoPost, useDeletePromoPost } from '@/hooks/usePromoPosts';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CollaboratorPicker } from '@/components/CollaboratorPicker';
import { CollectionEmptyState } from '@/components/shared/CollectionEmptyState';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { ProjectCoverPicker, ProjectCover } from '@/components/ProjectCoverPicker';
import { Plus, Calendar, Music2, ExternalLink, DollarSign, Briefcase, Trash2, CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn, formatLocalDateTime } from '@/lib/utils';

// GigCard extracted outside to prevent recreation on parent re-renders
const GigCard = ({ 
  post, 
  showAuthor = true, 
  showDelete = false,
  onDelete,
  onNavigate,
}: { 
  post: any; 
  showAuthor?: boolean; 
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  onNavigate?: (id: string) => void;
}) => (
  <Card 
    className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
    onClick={() => onNavigate?.(post.id)}
  >
    <div className="flex items-start gap-4">
      {/* Gig image or icon - using ProjectCover for preset icon support */}
      <ProjectCover value={post.image} className="w-16 h-16 flex-shrink-0" iconClassName="w-9 h-9" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <h3 className="font-semibold truncate">{post.title}</h3>
            {post.is_paid_opportunity && (
              <Badge className="text-xs bg-green-600 flex-shrink-0">
                <DollarSign className="w-3 h-3 mr-1" />
                Paid
              </Badge>
            )}
          </div>
          {showDelete && onDelete && (
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
                    onClick={() => onDelete(post.id)}
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

const Gigs = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: myPosts, isLoading: myLoading } = useMyPromoPosts(profile?.id);
  const { data: friendsPosts, isLoading: friendsLoading } = useFriendsPromoPosts();
  const { data: paidGigs, isLoading: paidLoading } = usePaidGigs();
  const createPromoPost = useCreatePromoPost();
  const deletePromoPost = useDeletePromoPost();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [promoType] = useState<'gig'>('gig');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventTime, setEventTime] = useState('');
  const [link, setLink] = useState('');
  const [showOnFeed, setShowOnFeed] = useState(true); // Default to true (friends visibility)
  const [isPaidOpportunity, setIsPaidOpportunity] = useState(false);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [gigImage, setGigImage] = useState<string | null>(null);
  const [gigImagePreviewUrl, setGigImagePreviewUrl] = useState<string | null>(null);
  const [repostReminderDays, setRepostReminderDays] = useState<string>('');

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleCreate = () => {
    if (!profile || !title.trim()) return;

    // Combine date and time into ISO string, preserving local time
    let combinedDateTime: string | undefined;
    if (eventDate) {
      const year = eventDate.getFullYear();
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const day = String(eventDate.getDate()).padStart(2, '0');
      
      if (eventTime) {
        // Create ISO string with explicit time to avoid timezone shifts
        combinedDateTime = `${year}-${month}-${day}T${eventTime}:00`;
      } else {
        // Default to noon to avoid date shifting
        combinedDateTime = `${year}-${month}-${day}T12:00:00`;
      }
    }

    createPromoPost.mutate(
      {
        authorId: profile.id,
        promoType,
        title,
        description,
        eventDate: combinedDateTime,
        image: gigImage || undefined,
        links: link ? [link] : [],
        showOnFeed,
        isPaidOpportunity,
        collaboratorIds,
        repostReminderDays: repostReminderDays ? parseInt(repostReminderDays, 10) : null,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setEventDate(undefined);
          setEventTime('');
          setLink('');
          setShowOnFeed(true);
          setIsPaidOpportunity(false);
          setCollaboratorIds([]);
          setGigImage(null);
          setGigImagePreviewUrl(null);
          setRepostReminderDays('');
          setIsDialogOpen(false);
        },
      }
    );
  };

  // Filter friends posts to exclude own posts
  const filteredFriendsPosts = friendsPosts?.filter(
    (p: any) => p.author_id !== profile?.id
  ) || [];

  const handleDeleteGig = (postId: string) => {
    deletePromoPost.mutate(postId);
  };

  const handleNavigateToGig = (id: string) => {
    navigate(`/gigs/${id}`);
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between h-9">
            <h1 className="text-lg sm:text-xl font-semibold">Gigs</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Gig</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Gig Cover Picker - with preset icons or custom upload */}
                  {profile && (
                    <ProjectCoverPicker
                      value={gigImage}
                      onChange={setGigImage}
                      profileId={profile.id}
                      previewUrl={gigImagePreviewUrl}
                      onPreviewUrlChange={setGigImagePreviewUrl}
                    />
                  )}

                  <Input
                    placeholder="Gig title (e.g., Jazz Night at Blue Note)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <RichTextarea
                    placeholder="Describe your gig..."
                    value={description}
                    onChange={setDescription}
                    rows={8}
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
                              !eventDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {eventDate ? format(eventDate, "MMM d, yyyy") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={eventDate}
                            onSelect={setEventDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="pl-9 w-[120px]"
                          placeholder="Time"
                        />
                      </div>
                    </div>
                  </div>
                  <Input
                    placeholder="Link (optional)"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                  
                  {/* Show on Feed Toggle */}
                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="show-feed-gig" className="text-sm">Show on home feed</Label>
                    <Switch
                      id="show-feed-gig"
                      checked={showOnFeed}
                      onCheckedChange={setShowOnFeed}
                    />
                  </div>

                  {/* Repost Reminder */}
                  <div>
                    <Label htmlFor="create-repost-reminder" className="text-sm">Repost reminder (optional)</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Repost this gig on your timeline to remind followers before the event
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        id="create-repost-reminder"
                        type="number"
                        min="1"
                        max="30"
                        value={repostReminderDays}
                        onChange={(e) => setRepostReminderDays(e.target.value)}
                        placeholder="e.g. 3"
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">days before event</span>
                    </div>
                  </div>

                  {/* Paid Opportunity Toggle */}
                  <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                    <div>
                      <Label htmlFor="paid-opportunity" className="text-sm flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Paid Opportunity
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mark this as a paid booking for artists to apply
                      </p>
                    </div>
                    <Switch
                      id="paid-opportunity"
                      checked={isPaidOpportunity}
                      onCheckedChange={setIsPaidOpportunity}
                    />
                  </div>

                  {/* Collaborator Picker */}
                  <div className="pt-2">
                    <CollaboratorPicker
                      selectedIds={collaboratorIds}
                      onSelect={setCollaboratorIds}
                      label="Tag Collaborators"
                    />
                  </div>

                  <Button
                    className="w-full bg-gradient-primary text-primary-foreground"
                    onClick={handleCreate}
                    disabled={createPromoPost.isPending || !title.trim()}
                  >
                    Create Gig
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
              <TabsTrigger value="my" className="flex-1">My Gigs</TabsTrigger>
              <TabsTrigger value="friends" className="flex-1">Friend's Gigs</TabsTrigger>
              <TabsTrigger value="paid" className="flex-1">Paid Gigs</TabsTrigger>
            </TabsList>

            <TabsContent value="my" className="space-y-4">
              {myLoading ? (
                <div className="text-center text-muted-foreground py-12">Loading...</div>
              ) : myPosts && myPosts.length > 0 ? (
                <div className="space-y-4">
                  {myPosts.map((post: any) => (
                    <GigCard key={post.id} post={post} showAuthor={false} showDelete={true} onDelete={handleDeleteGig} onNavigate={handleNavigateToGig} />
                  ))}
                </div>
              ) : (
                <CollectionEmptyState
                  icon={Music2}
                  title="No gigs yet"
                  subtitle="Share your first gig, release, or event with your friends"
                  actionLabel="Create First Gig"
                  onAction={() => setIsDialogOpen(true)}
                />
              )}
            </TabsContent>

            <TabsContent value="friends" className="space-y-4">
              {friendsLoading ? (
                <div className="text-center text-muted-foreground py-12">Loading...</div>
              ) : filteredFriendsPosts.length > 0 ? (
                <div className="space-y-4">
                  {filteredFriendsPosts.map((post: any) => (
                    <GigCard key={post.id} post={post} onNavigate={handleNavigateToGig} />
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

            <TabsContent value="paid" className="space-y-4">
              {paidLoading ? (
                <div className="text-center text-muted-foreground py-12">Loading...</div>
              ) : paidGigs && paidGigs.length > 0 ? (
                <div className="space-y-4">
                  {paidGigs.map((post: any) => (
                    <GigCard key={post.id} post={post} onNavigate={handleNavigateToGig} />
                  ))}
                </div>
              ) : (
                <CollectionEmptyState
                  icon={DollarSign}
                  title="No paid gigs"
                  subtitle="Paid opportunities from the community will appear here"
                />
              )}
            </TabsContent>
          </Tabs>
        </main>
      </PageBody>
    </PageLayout>
  );
};

export default Gigs;
