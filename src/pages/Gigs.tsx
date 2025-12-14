import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMyPromoPosts, useFriendsPromoPosts, usePaidGigs, useCreatePromoPost } from '@/hooks/usePromoPosts';
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
import { Plus, Calendar, Music2, User, ExternalLink, DollarSign, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Gigs = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: myPosts, isLoading: myLoading } = useMyPromoPosts(profile?.id);
  const { data: friendsPosts, isLoading: friendsLoading } = useFriendsPromoPosts();
  const { data: paidGigs, isLoading: paidLoading } = usePaidGigs();
  const createPromoPost = useCreatePromoPost();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [promoType] = useState<'gig'>('gig');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [link, setLink] = useState('');
  const [showOnFeed, setShowOnFeed] = useState(false);
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
          setShowOnFeed(false);
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

  const PromoCard = ({ post, showAuthor = true }: { post: any; showAuthor?: boolean }) => (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-start gap-3">
        {showAuthor && (
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author?.avatar || ''} />
            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {showAuthor && <span className="font-medium text-sm">{post.author?.name}</span>}
            <Badge variant="outline" className="text-xs">
              <Music2 className="w-3 h-3 mr-1" />
              Gig
            </Badge>
            {post.is_paid_opportunity && (
              <Badge className="text-xs bg-green-600">
                <DollarSign className="w-3 h-3 mr-1" />
                Paid
              </Badge>
            )}
          </div>
          <h3 className="font-semibold">{post.title}</h3>
          {post.event_date && (
            <p className="text-sm text-primary flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(post.event_date), 'EEEE, MMM d, yyyy · h:mm a')}
            </p>
          )}
          {post.description && (
            <p className="text-sm text-muted-foreground mt-2">{post.description}</p>
          )}
          {post.links?.length > 0 && (
            <a
              href={post.links[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              View Details
            </a>
          )}
        </div>
      </div>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <Music2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Gigs</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share an Update</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                    <Music2 className="w-5 h-5 text-primary" />
                    <span className="font-medium">New Gig</span>
                  </div>
                  <Input
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                  <Input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
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
                    Post
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
            <TabsTrigger value="my" className="flex-1">My Gigs</TabsTrigger>
            <TabsTrigger value="friends" className="flex-1">Friend's Gigs</TabsTrigger>
            <TabsTrigger value="paid" className="flex-1">Paid Gigs</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-4">
            {myLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : myPosts && myPosts.length > 0 ? (
              myPosts.map((post: any) => <PromoCard key={post.id} post={post} showAuthor={false} />)
            ) : (
              <EmptyState message="No posts yet. Share your gigs, releases, or events!" />
            )}
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            {friendsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredFriendsPosts.length > 0 ? (
              filteredFriendsPosts.map((post: any) => <PromoCard key={post.id} post={post} />)
            ) : (
              <EmptyState message="Connect with friends to see their gigs and releases" />
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
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : paidGigs && paidGigs.length > 0 ? (
              paidGigs.map((post: any) => <PromoCard key={post.id} post={post} />)
            ) : (
              <EmptyState message="No paid opportunities available right now" />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Gigs;
