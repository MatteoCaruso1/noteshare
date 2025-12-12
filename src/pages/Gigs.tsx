import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePromoPosts, useCreatePromoPost } from '@/hooks/usePromoPosts';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Music2, Disc3, PartyPopper, User, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Gigs = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: promoPosts, isLoading } = usePromoPosts();
  const createPromoPost = useCreatePromoPost();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [promoType, setPromoType] = useState<'gig' | 'release' | 'event'>('gig');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [link, setLink] = useState('');

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
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setEventDate('');
          setLink('');
          setIsDialogOpen(false);
        },
      }
    );
  };

  const gigs = promoPosts?.filter((p: any) => p.promo_type === 'gig') || [];
  const releases = promoPosts?.filter((p: any) => p.promo_type === 'release') || [];
  const events = promoPosts?.filter((p: any) => p.promo_type === 'event') || [];

  const PromoCard = ({ post }: { post: any }) => (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.author?.avatar || ''} />
          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{post.author?.name}</span>
            <Badge variant="outline" className="text-xs">
              {post.promo_type === 'gig' && <Music2 className="w-3 h-3 mr-1" />}
              {post.promo_type === 'release' && <Disc3 className="w-3 h-3 mr-1" />}
              {post.promo_type === 'event' && <PartyPopper className="w-3 h-3 mr-1" />}
              {post.promo_type}
            </Badge>
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Gigs & Releases</h1>
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
                  <div className="flex gap-2">
                    {(['gig', 'release', 'event'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={promoType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPromoType(type)}
                      >
                        {type === 'gig' && <Music2 className="w-4 h-4 mr-1" />}
                        {type === 'release' && <Disc3 className="w-4 h-4 mr-1" />}
                        {type === 'event' && <PartyPopper className="w-4 h-4 mr-1" />}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
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
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="gigs" className="flex-1">Gigs</TabsTrigger>
            <TabsTrigger value="releases" className="flex-1">Releases</TabsTrigger>
            <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : promoPosts && promoPosts.length > 0 ? (
              promoPosts.map((post: any) => <PromoCard key={post.id} post={post} />)
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No posts yet. Share your gigs, releases, or events!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="gigs" className="space-y-4">
            {gigs.length > 0 ? gigs.map((post: any) => <PromoCard key={post.id} post={post} />) : (
              <p className="text-center py-12 text-muted-foreground">No gigs posted yet</p>
            )}
          </TabsContent>

          <TabsContent value="releases" className="space-y-4">
            {releases.length > 0 ? releases.map((post: any) => <PromoCard key={post.id} post={post} />) : (
              <p className="text-center py-12 text-muted-foreground">No releases posted yet</p>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            {events.length > 0 ? events.map((post: any) => <PromoCard key={post.id} post={post} />) : (
              <p className="text-center py-12 text-muted-foreground">No events posted yet</p>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default Gigs;
