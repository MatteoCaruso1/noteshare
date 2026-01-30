import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  Settings, 
  UserPlus, 
  Pencil, 
  Share2, 
  CalendarPlus,
  Music,
  Users,
  Lock,
  Globe,
  MapPin,
  Calendar
} from 'lucide-react';
import { useGroupDetail, useGroupMembers, useGroupEvents } from '@/hooks/useGroupDetails';
import { useGroupMembership, useJoinGroup, useLeaveGroup } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CreateEventDrawer } from '@/components/groups/CreateEventDrawer';
import { EditGroupDialog } from '@/components/groups/EditGroupDialog';
import { InviteMembersDialog } from '@/components/groups/InviteMembersDialog';
import { GroupPostCapture } from '@/components/groups/GroupPostCapture';
import { ShareGroupSheet } from '@/components/groups/ShareGroupSheet';
import { useCreateNote } from '@/hooks/useNotes';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const { data: group, isLoading: groupLoading } = useGroupDetail(id);
  const { data: members } = useGroupMembers(id);
  const { data: events } = useGroupEvents(id);
  const { data: membership } = useGroupMembership(id);
  
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembersSheet, setShowMembersSheet] = useState(false);
  const [showShareGroup, setShowShareGroup] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<typeof events extends (infer T)[] | undefined ? T : never | null>(null);
  
  const isOwner = group?.owner_id === profile?.id;
  const isAdmin = membership?.role === 'admin';
  const isMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const canManage = isOwner || isAdmin;
  
  const handleShare = () => {
    setShowShareGroup(true);
  };
  
  const handleJoin = () => {
    if (id) {
      joinGroup.mutate({ groupId: id, isPrivate: group?.privacy === 'private' });
    }
  };
  
  const handleLeave = () => {
    if (id) {
      leaveGroup.mutate(id);
    }
  };
  
  if (groupLoading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-4 px-4">
          <Skeleton className="w-full h-48" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </PageLayout>
    );
  }
  
  if (!group) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Group not found</p>
          <Button variant="ghost" onClick={() => navigate('/groups')} className="mt-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Groups
          </Button>
        </div>
      </PageLayout>
    );
  }
  
  const createNote = useCreateNote();

  // Filter out unwanted tags like "casual"
  const filteredGroupTypes = group?.group_type?.filter(
    type => type.toLowerCase() !== 'casual'
  ) || [];

  const handleAddPost = (data: {
    textContent?: string;
    audioFiles: string[];
    audioFileNames?: string[];
    videoFiles: string[];
    imageFiles: string[];
  }) => {
    if (!profile?.id) return;
    createNote.mutate({
      authorId: profile.id,
      textContent: data.textContent,
      audioFiles: data.audioFiles,
      audioFileNames: data.audioFileNames,
      videoFiles: data.videoFiles,
      imageFiles: data.imageFiles,
      // TODO: Add group_id field to notes table in future
    });
  };


  return (
    <PageLayout>
      <div className="h-full overflow-y-auto overflow-x-hidden">
      {/* Header with back button and settings */}
      <div className="relative -mt-12 -mx-4 overflow-hidden">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary relative">
          {group.cover_image && (
            <img 
              src={group.cover_image} 
              alt={group.name}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Navigation overlay */}
          <div className="absolute top-12 left-0 right-0 px-4 py-4 flex justify-between items-start">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/groups')}
              className="bg-card/80 backdrop-blur-sm hover:bg-card/90 rounded-full border border-border/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            {canManage ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowEditGroup(true)}
                className="bg-card/80 backdrop-blur-sm hover:bg-card/90 rounded-full border border-border/50"
              >
                <Settings className="w-5 h-5" />
              </Button>
            ) : (
              <div className="w-10" /> 
            )}
          </div>
          
          {/* Group avatar overlapping banner */}
          <div className="absolute -bottom-8 left-6">
            <div className="w-20 h-20 rounded-xl bg-card border-4 border-background flex items-center justify-center overflow-hidden shadow-lg">
              {group.cover_image ? (
                <img 
                  src={group.cover_image} 
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* Group Info */}
        <div className="pt-12 px-6 pb-4">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          
          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              <span className="capitalize">{group.focus_type}</span>
            </div>
            <button 
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => setShowMembersSheet(true)}
            >
              <Users className="w-4 h-4" />
              <span className="underline-offset-2 hover:underline">
                {group.member_count} Member{group.member_count !== 1 ? 's' : ''}
              </span>
            </button>
            <div className="flex items-center gap-1">
              {group.privacy === 'private' ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Private</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>Public</span>
                </>
              )}
            </div>
          </div>
          
          {group.city && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              <span>{group.city}</span>
            </div>
          )}
          
          {/* Description */}
          {group.description && (
            <p className="text-muted-foreground mt-3">{group.description}</p>
          )}
          
          {/* Group type tags */}
          {filteredGroupTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filteredGroupTypes.map(type => (
                <Badge key={type} variant="secondary" className="capitalize">
                  {type}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Action Buttons Row */}
      {isMember ? (
        <div className="px-6 pb-4">
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {canManage && (
              <ActionButton 
                icon={<UserPlus className="w-5 h-5" />} 
                label="Invite" 
                onClick={() => setShowInvite(true)}
              />
            )}
            {canManage && (
              <ActionButton 
                icon={<Pencil className="w-5 h-5" />} 
                label="Edit Details" 
                onClick={() => setShowEditGroup(true)}
              />
            )}
            <ActionButton 
              icon={<Share2 className="w-5 h-5" />} 
              label="Share" 
              onClick={handleShare}
            />
          </div>
        </div>
      ) : (
        <div className="px-6 pb-4">
          {isPending ? (
            <Badge variant="outline" className="w-full justify-center py-2">
              Request Pending
            </Badge>
          ) : (
            <Button 
              className="w-full" 
              onClick={handleJoin}
              disabled={joinGroup.isPending}
            >
              {group.privacy === 'private' ? 'Request to Join' : 'Join Group'}
            </Button>
          )}
        </div>
      )}
      
      {/* Events Section */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            {events && events.length > 0 ? 'Upcoming Events' : 'No upcoming events'}
          </h2>
          {canManage && (
            <Button 
              variant="link" 
              className="text-primary p-0 h-auto"
              onClick={() => setShowCreateEvent(true)}
            >
              Create an event
            </Button>
          )}
        </div>
        
        {events && events.length > 0 && (
          <div className="space-y-3">
            {events.map(event => (
              <button 
                key={event.id} 
                onClick={() => setSelectedEvent(event)}
                className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
                    <span className="text-xs font-medium">
                      {format(new Date(event.event_date), 'MMM')}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {format(new Date(event.event_date), 'd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{event.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), 'EEEE, h:mm a')}
                    </p>
                    {event.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Posts Section */}
      {isMember && (
        <div className="px-6 py-4">
          <h2 className="font-semibold mb-3">Posts</h2>
          <GroupPostCapture
            profileId={profile?.id || ''}
            profileAvatar={profile?.avatar}
            profileName={profile?.name}
            groupName={group.name}
            onSubmit={handleAddPost}
            isSubmitting={createNote.isPending}
          />
        </div>
      )}
      
      {/* Leave Group Option */}
      {isMember && !isOwner && (
        <div className="px-6 py-4 pt-0">
          <Button
            variant="ghost" 
            className="w-full text-destructive hover:text-destructive"
            onClick={handleLeave}
            disabled={leaveGroup.isPending}
          >
            Leave Group
          </Button>
        </div>
      )}
      
      {/* Dialogs */}
      {canManage && (
        <>
          <CreateEventDrawer 
            open={showCreateEvent} 
            onOpenChange={setShowCreateEvent}
            groupId={id!}
            groupName={group.name}
          />
          <EditGroupDialog 
            open={showEditGroup} 
            onOpenChange={setShowEditGroup}
            group={group}
          />
          <InviteMembersDialog 
            open={showInvite} 
            onOpenChange={setShowInvite}
            groupId={id!}
            groupName={group.name}
          />
        </>
      )}
      
      {/* Members Sheet */}
      <MembersSheet
        open={showMembersSheet}
        onOpenChange={setShowMembersSheet}
        members={members || []}
        groupName={group.name}
      />
      
      {/* Share Group Sheet */}
      <ShareGroupSheet
        open={showShareGroup}
        onOpenChange={setShowShareGroup}
        group={group}
      />
      
      {/* Event Detail Sheet */}
      <EventDetailSheet
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        event={selectedEvent}
        groupName={group.name}
        canManage={canManage}
      />
      </div>
    </PageLayout>
  );
}

// Action button component for the horizontal scroll row
function ActionButton({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[72px]"
    >
      <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors">
        {icon}
      </div>
      <span className="text-xs text-muted-foreground text-center whitespace-nowrap">{label}</span>
    </button>
  );
}

// Members Sheet component
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GroupMemberWithProfile, GroupEvent } from '@/hooks/useGroupDetails';
import { ShareEventSheet } from '@/components/groups/ShareEventSheet';

function MembersSheet({
  open,
  onOpenChange,
  members,
  groupName
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: GroupMemberWithProfile[];
  groupName: string;
}) {
  const navigate = useNavigate();
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>{groupName} Members</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto">
          {members.map(member => (
            <button
              key={member.id}
              className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
              onClick={() => {
                onOpenChange(false);
                navigate(`/profile/${member.profile?.id}`);
              }}
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={member.profile?.avatar || undefined} />
                <AvatarFallback>
                  {member.profile?.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{member.profile?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Event Detail Sheet component
function EventDetailSheet({
  open,
  onOpenChange,
  event,
  groupName,
  canManage
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GroupEvent | null;
  groupName: string;
  canManage: boolean;
}) {
  const [showShare, setShowShare] = useState(false);
  
  if (!event) return null;
  
  const eventDate = new Date(event.event_date);
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-xl">{event.name}</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6">
            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary">
                <span className="text-xs font-medium">
                  {format(eventDate, 'MMM')}
                </span>
                <span className="text-xl font-bold leading-none">
                  {format(eventDate, 'd')}
                </span>
              </div>
              <div>
                <p className="font-medium">{format(eventDate, 'EEEE')}</p>
                <p className="text-muted-foreground">{format(eventDate, 'h:mm a')}</p>
              </div>
            </div>
            
            {/* Location */}
            {(event.location || event.is_virtual) && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {event.is_virtual ? 'Virtual Event' : event.location}
                  </p>
                  {event.is_virtual && event.location && (
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Description */}
            {event.description && (
              <div>
                <h3 className="font-medium mb-2">About</h3>
                <p className="text-muted-foreground">{event.description}</p>
              </div>
            )}
            
            {/* Group name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hosted by</p>
                <p className="font-medium">{groupName}</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                className="flex-1" 
                onClick={() => setShowShare(true)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Event
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      <ShareEventSheet
        open={showShare}
        onOpenChange={setShowShare}
        event={event}
        groupName={groupName}
      />
    </>
  );
}
