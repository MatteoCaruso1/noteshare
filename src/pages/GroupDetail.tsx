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
import { AddNoteDialog } from '@/components/shared/AddNoteDialog';
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
  const [showAddNote, setShowAddNote] = useState(false);
  const [showMembersSheet, setShowMembersSheet] = useState(false);
  
  const isOwner = group?.owner_id === profile?.id;
  const isAdmin = membership?.role === 'admin';
  const isMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const canManage = isOwner || isAdmin;
  
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: group?.name, url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
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

  const handleAddNote = (data: {
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
    setShowAddNote(false);
  };


  return (
    <PageLayout>
      <div className="h-full overflow-y-auto">
      {/* Header with back button and settings */}
      <div className="relative -mt-12 -mx-4">
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
            {canManage && (
              <ActionButton 
                icon={<CalendarPlus className="w-5 h-5" />} 
                label="Create Event" 
                onClick={() => setShowCreateEvent(true)}
              />
            )}
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
              <div 
                key={event.id} 
                className="p-4 rounded-xl bg-card border border-border hover:border-border/80 transition-colors"
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
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Post Something */}
      {isMember && (
        <div className="px-6 py-4">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setShowAddNote(true)}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.avatar || undefined} />
              <AvatarFallback>{profile?.name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 py-2 px-4 rounded-full bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-colors">
              Post something...
            </div>
          </div>
        </div>
      )}
      
      {/* Leave Group Option */}
      {isMember && !isOwner && (
        <div className="px-6 py-4">
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
      
      {/* Add Note Dialog for posting */}
      {profile?.id && (
        <AddNoteDialog
          open={showAddNote}
          onOpenChange={setShowAddNote}
          onSubmit={handleAddNote}
          isSubmitting={createNote.isPending}
          title="Post to Group"
          contextLabel={group?.name || 'this group'}
          profileId={profile.id}
        />
      )}
      
      {/* Members Sheet */}
      <MembersSheet
        open={showMembersSheet}
        onOpenChange={setShowMembersSheet}
        members={members || []}
        groupName={group.name}
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
import { GroupMemberWithProfile } from '@/hooks/useGroupDetails';

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
