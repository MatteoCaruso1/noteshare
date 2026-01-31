import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Waypoints, Bell, MessageCircle, Users, UserPlus, 
  PenSquare, X, Plus, Search, Music, Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriendships';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useConversations } from '@/hooks/useMessages';
import { useMyGroups, useDiscoverGroups } from '@/hooks/useGroups';
import { NotificationsList } from '@/components/NotificationsList';
import { DirectMessages } from '@/components/DirectMessages';
import { FriendsList } from '@/components/FriendsList';
import { UserSearch } from '@/components/UserSearch';
import { GroupCard } from '@/components/groups/GroupCard';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<'find' | 'active'>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  
  // Social dialog states (same as FriendsJournals)
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [showNewMessageView, setShowNewMessageView] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [inChatView, setInChatView] = useState(false);
  const [friendsListOpen, setFriendsListOpen] = useState(false);
  
  const [hasClickedAddFriend, setHasClickedAddFriend] = useState(() => {
    return localStorage.getItem('hasClickedAddFriend') === 'true';
  });
  
  // Data hooks
  const { data: friends } = useFriends();
  const { data: unreadNotificationCount } = useUnreadNotificationCount();
  const { data: conversations } = useConversations();
  const { data: myGroups, isLoading: myGroupsLoading } = useMyGroups();
  const { data: discoverGroups, isLoading: discoverLoading } = useDiscoverGroups(searchQuery);
  
  const unreadMessagesCount = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) || 0;
  
  useEffect(() => {
    if (location.state?.openFriendsList) {
      setFriendsListOpen(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <PageLayout>
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between gap-3 h-9">
            <h1 className="text-lg sm:text-xl font-semibold shrink-0">Groups</h1>
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Notifications Button */}
              <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DialogTrigger asChild>
                  <div className="relative cursor-pointer transition-colors flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 shrink-0">
                    <Bell className={`w-4 h-4 ${unreadNotificationCount && unreadNotificationCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    {unreadNotificationCount !== undefined && unreadNotificationCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                      </Badge>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      Notifications
                      {unreadNotificationCount !== undefined && unreadNotificationCount > 0 && (
                        <Badge className="ml-2 bg-primary text-primary-foreground">
                          {unreadNotificationCount}
                        </Badge>
                      )}
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh]">
                    <NotificationsList embedded />
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {/* Messages Button */}
              <Dialog open={messagesOpen} onOpenChange={(open) => {
                setMessagesOpen(open);
                if (!open) {
                  setShowNewMessageView(false);
                  setInChatView(false);
                }
              }}>
                <DialogTrigger asChild>
                  <div className="relative cursor-pointer transition-colors flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 shrink-0">
                    <MessageCircle className={`w-4 h-4 ${unreadMessagesCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    {unreadMessagesCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </Badge>
                    )}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md" hideCloseButton>
                  {!inChatView && (
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                      <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Messages
                        {unreadMessagesCount > 0 && (
                          <Badge className="ml-2 bg-destructive text-destructive-foreground">
                            {unreadMessagesCount}
                          </Badge>
                        )}
                      </DialogTitle>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowNewMessageView(true)}
                          className="flex items-center justify-center h-8 w-8 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
                          title="New message"
                        >
                          <PenSquare className="w-4 h-4" />
                        </button>
                        <DialogClose asChild>
                          <button
                            className="flex items-center justify-center h-8 w-8 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            aria-label="Close"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </DialogClose>
                      </div>
                    </DialogHeader>
                  )}
                  <DirectMessages 
                    embedded 
                    showNewMessageView={showNewMessageView}
                    onNewMessageViewChange={setShowNewMessageView}
                    onInChatViewChange={setInChatView}
                  />
                </DialogContent>
              </Dialog>

              {/* Friends Button */}
              <FriendsList open={friendsListOpen} onOpenChange={setFriendsListOpen}>
                <div className="cursor-pointer transition-colors flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{friends?.length || 0}</span>
                </div>
              </FriendsList>

              {/* Add Friend Button */}
              <Dialog open={addFriendOpen} onOpenChange={(open) => {
                setAddFriendOpen(open);
                if (open && !hasClickedAddFriend) {
                  setHasClickedAddFriend(true);
                  localStorage.setItem('hasClickedAddFriend', 'true');
                }
              }}>
                <DialogTrigger asChild>
                  <div className={`cursor-pointer transition-colors flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                    hasClickedAddFriend 
                      ? 'bg-secondary/30 border border-border hover:bg-secondary/50' 
                      : 'bg-primary/20 border-2 border-primary animate-pulse hover:bg-primary/30'
                  }`}>
                    <UserPlus className={`w-4 h-4 ${hasClickedAddFriend ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      Add Friend
                    </DialogTitle>
                  </DialogHeader>
                  <div className="pt-2">
                    <UserSearch />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </PageHeader>

      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'find' | 'active')} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="find">Find</TabsTrigger>
            </TabsList>

            {/* Active Tab - User's Groups */}
            <TabsContent value="active" className="mt-4 space-y-4">
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

            {/* Find Tab - Discover Groups */}
            <TabsContent value="find" className="mt-4 space-y-4">
              {/* Hero Section */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-6">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2">Create Your Own Group</h2>
                  <p className="text-muted-foreground mb-4 max-w-sm line-clamp-2">
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
          </Tabs>
        </main>
      </PageBody>

      {/* Create Group Dialog */}
      <CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
    </PageLayout>
  );
};

export default Groups;
