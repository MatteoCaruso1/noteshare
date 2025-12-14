import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPromoPosts, useFriendsPromoPosts, usePaidGigs, useCreatePromoPost, useDeletePromoPost } from '@/hooks/usePromoPosts';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CollaboratorPicker } from '@/components/CollaboratorPicker';
import { CollectionEmptyState } from '@/components/shared/CollectionEmptyState';
import { Plus, Calendar, Music2, User, ExternalLink, DollarSign, Briefcase, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

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
  const [eventDate, setEventDate] = useState('');
  const [link, setLink] = useState('');
  const [showOnFeed, setShowOnFeed] = useState(true); // Default to true (friends visibility)
  const [isPaidOpportunity, setIsPaidOpportunity] = useState(false);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleCreate = () => {
    if (!profile || !title.trim()) return;

    createPromoPost.mutate(
      {
        authorId: profile.id,
        promoType,
        title,
        description,
        eventDate: eventDate || undefined,
        links: link ? [link] : [],
        showOnFeed,
        isPaidOpportunity,
        collaboratorIds,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setEventDate('');
          setLink('');
          setShowOnFeed(true);
          setIsPaidOpportunity(false);
          setCollaboratorIds([]);
          setIsDialogOpen(false);
        },
      }
    );
  };

  // Filter friends posts to exclude own posts
  const filteredFriendsPosts = friendsPosts?.filter(
    (p: any) => p.author_id !== profile?.id
  ) || [];

  const handleDeleteGig = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this gig?')) {
      deletePromoPost.mutate(postId);
    }
  };

  const GigCard = ({ post, showAuthor = true, showDelete = false }: { post: any; showAuthor?: boolean; showDelete?: boolean }) => (
    <Card 
      className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/gigs/${post.id}`)}
    >
      <div className="flex items-start gap-4">
        {/* Gig image or icon - matching project card layout */}
        {post.image ? (
          <img
            src={post.image}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Music2 className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        
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
            {showDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                onClick={(e) => handleDeleteGig(e, post.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {showAuthor && post.author && (
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="w-4 h-4">
                <AvatarImage src={post.author?.avatar || ''} />
                <AvatarFallback><User className="w-2 h-2" /></AvatarFallback>
              </Avatar>
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
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
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
                <Input
                  placeholder="Gig title (e.g., Jazz Night at Blue Note)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Describe your gig..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <div>
                  <Label htmlFor="event-date" className="text-sm text-muted-foreground mb-2 block">
                    Event Date & Time
                  </Label>
                  <Input
                    id="event-date"
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
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
                <div className="border-t border-border pt-4">
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

      <main className="container max-w-2xl mx-auto px-4 py-4">
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
                  <GigCard key={post.id} post={post} showAuthor={false} showDelete={true} />
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
                  <GigCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <CollectionEmptyState
                icon={Music2}
                title="No friend's gigs"
                subtitle="Connect with friends to see their gigs and releases"
              />
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-1">
                <Briefcase className="w-4 h-4" />
                Paid Opportunities
              </div>
              <p className="text-sm text-muted-foreground">
                Browse paid gig opportunities posted by venues and businesses
              </p>
            </div>
            {paidLoading ? (
              <div className="text-center text-muted-foreground py-12">Loading...</div>
            ) : paidGigs && paidGigs.length > 0 ? (
              <div className="space-y-4">
                {paidGigs.map((post: any) => (
                  <GigCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <CollectionEmptyState
                icon={Briefcase}
                title="No paid opportunities"
                subtitle="No paid opportunities available right now"
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Gigs;
