import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Waypoints, Plus, Search, Music, Sparkles, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMyGroups, useDiscoverGroups } from '@/hooks/useGroups';
import { GroupCard } from '@/components/groups/GroupCard';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';
import { useBottomNavOverride } from '@/contexts/BottomNavContext';

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setOverrideActiveRoute } = useBottomNavOverride();
  
  // Keep Friends tab highlighted while on Groups page
  useEffect(() => {
    setOverrideActiveRoute('/friends');
    return () => setOverrideActiveRoute(undefined);
  }, [setOverrideActiveRoute]);
  
  // Initialize tab from URL param or default to 'find'
  const initialTab = searchParams.get('tab') === 'my' ? 'my' : 'find';
  const [activeTab, setActiveTab] = useState<'find' | 'my'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  
  // Data hooks
  const { data: myGroups, isLoading: myGroupsLoading } = useMyGroups();
  const { data: discoverGroups, isLoading: discoverLoading } = useDiscoverGroups(searchQuery);

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-3 h-9">
            <button
              onClick={() => navigate('/friends')}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold shrink-0">Groups</h1>
            <div className="flex-1" />
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'find' | 'my')} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="find">Find Groups</TabsTrigger>
              <TabsTrigger value="my">My Groups</TabsTrigger>
            </TabsList>

            {/* Find Tab - Discover Groups */}
            <TabsContent value="find" className="mt-4 space-y-4">
              {/* Hero Section */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-6">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2">Create Your Own Group</h2>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    Give your community a home on Noteshare. Connect with musicians, plan jams, and share your journey
                  </p>
                  <Button onClick={() => setCreateGroupOpen(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Popular Groups */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {searchQuery ? 'Search Results' : 'Popular Groups'}
                </h3>
                
                {discoverLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 border border-border rounded-lg">
                        <div className="flex gap-3">
                          <Skeleton className="w-14 h-14 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-7 w-16 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : discoverGroups && discoverGroups.length > 0 ? (
                  <div className="space-y-3">
                    {discoverGroups.map(group => (
                      <GroupCard 
                        key={group.id} 
                        group={group}
                        onClick={() => navigate(`/groups/${group.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery 
                        ? 'No groups found matching your search' 
                        : 'No groups yet. Be the first to create one!'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* My Groups Tab - User's Groups */}
            <TabsContent value="my" className="mt-4 space-y-4">
              {myGroupsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="p-4 border border-border rounded-lg">
                      <div className="flex gap-3">
                        <Skeleton className="w-14 h-14 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : myGroups && myGroups.length > 0 ? (
                <div className="space-y-3">
                  {myGroups.map(group => (
                    <GroupCard 
                      key={group.id} 
                      group={group}
                      onClick={() => navigate(`/groups/${group.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Waypoints className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">No groups yet</h2>
                  <p className="text-muted-foreground max-w-sm mb-6">
                    Join or create a group to connect with fellow musicians in your community.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setActiveTab('find')}>
                      <Search className="w-4 h-4 mr-2" />
                      Find Groups
                    </Button>
                    <Button onClick={() => setCreateGroupOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Group
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </PageBody>

      {/* Create Group Dialog */}
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </PageLayout>
  );
};

export default Groups;
