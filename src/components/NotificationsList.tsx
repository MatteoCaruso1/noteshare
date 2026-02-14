import { useEffect, useRef } from 'react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { usePendingNoteShares } from '@/hooks/useNoteShares';
import { useMyGroupInvites } from '@/hooks/useGroupInvites';
import { PendingNoteShareCard } from '@/components/PendingNoteShareCard';
import { PendingGroupInviteCard } from '@/components/PendingGroupInviteCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { Bell, AtSign, Users, Waypoints } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NotificationsListProps {
  embedded?: boolean;
}

export function NotificationsList({ embedded }: NotificationsListProps = {}) {
  const { data: notifications, isLoading } = useNotifications();
  const { data: pendingShares } = usePendingNoteShares();
  const { data: pendingGroupInvites } = useMyGroupInvites();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const navigate = useNavigate();
  const hasMarkedRef = useRef(false);

  // Auto-mark all notifications as read when opened (embedded = dialog mode)
  useEffect(() => {
    if (embedded && notifications && !hasMarkedRef.current) {
      const hasUnread = notifications.some(n => !n.read);
      if (hasUnread) {
        hasMarkedRef.current = true;
        markAllRead.mutate();
      }
    }
  }, [embedded, notifications]);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    // For session_share or group_invite notifications, don't navigate - cards handle it
    if (notification.type === 'session_share' || notification.type === 'group_invite') {
      return;
    }
    if (notification.note_id) {
      navigate(`/notes/${notification.note_id}`, { state: { fromFriends: true } });
    }
  };

  // Filter out session_share notifications that have pending shares (they're shown separately)
  // Also filter out group_invite notifications that have pending invites
  const filteredNotifications = notifications?.filter(n => {
    if (n.type === 'session_share') {
      const hasPendingShare = pendingShares?.some(s => s.note_id === n.note_id);
      return !hasPendingShare;
    }
    if (n.type === 'group_invite') {
      // Hide group_invite notifications that still have pending invites
      return false; // Always hide - we show the invite cards instead
    }
    return true;
  });

  const unreadCount = filteredNotifications?.filter(n => !n.read).length || 0;
  const pendingShareCount = pendingShares?.length || 0;
  const pendingGroupInviteCount = pendingGroupInvites?.length || 0;
  const totalUnread = unreadCount + pendingShareCount + pendingGroupInviteCount;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session_share':
        return <Users className="w-4 h-4 text-primary" />;
      case 'group_invite':
        return <Waypoints className="w-4 h-4 text-primary" />;
      default:
        return <AtSign className="w-4 h-4 text-primary" />;
    }
  };

  // When embedded in dropdown, skip the outer wrapper
  if (embedded) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">

        {/* Pending group invites */}
        {pendingGroupInvites && pendingGroupInvites.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Waypoints className="w-3 h-3" />
              Group Invitations
            </p>
            {pendingGroupInvites.slice(0, 3).map((invite) => (
              <PendingGroupInviteCard key={invite.id} invite={invite} />
            ))}
          </div>
        )}
        
        {/* Pending note shares */}
        {pendingShares && pendingShares.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Practice Sessions Shared With You
            </p>
            {pendingShares.slice(0, 3).map((share) => (
              <PendingNoteShareCard key={share.id} share={share} />
            ))}
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : unreadCount > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredNotifications?.filter(n => !n.read).slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors bg-primary/5 hover:bg-primary/10`}
                onClick={() => handleNotificationClick(notification)}
              >
                {notification.from_user ? (
                  <ClickableAvatar
                    profileId={notification.from_user.id}
                    avatar={notification.from_user.avatar}
                    name={notification.from_user.name}
                    size="sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    {notification.from_user && (
                      <span className="font-medium">{notification.from_user.name} </span>
                    )}
                    {notification.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-primary mt-1" />
              </div>
            ))}
          </div>
        ) : pendingShareCount === 0 && pendingGroupInviteCount === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No new notifications</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className={`w-5 h-5 ${totalUnread > 0 ? 'text-primary' : ''}`} />
          <span>Notifications</span>
          {totalUnread > 0 && (
            <Badge className="h-5 px-1.5 text-xs bg-destructive text-destructive-foreground">
              {totalUnread}
            </Badge>
          )}
        </h2>
      </div>

      {/* Pending group invites section */}
      {pendingGroupInvites && pendingGroupInvites.length > 0 && (
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Waypoints className="w-4 h-4" />
            Group Invitations
          </h3>
          {pendingGroupInvites.map((invite) => (
            <PendingGroupInviteCard key={invite.id} invite={invite} />
          ))}
        </div>
      )}

      {/* Pending note shares section */}
      {pendingShares && pendingShares.length > 0 && (
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            Practice Sessions Shared With You
          </h3>
          {pendingShares.map((share) => (
            <PendingNoteShareCard key={share.id} share={share} />
          ))}
        </div>
      )}

      <Card className="p-4 bg-card border-border">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : filteredNotifications && filteredNotifications.length > 0 ? (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  notification.read ? 'hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                {notification.from_user ? (
                  <ClickableAvatar
                    profileId={notification.from_user.id}
                    avatar={notification.from_user.avatar}
                    name={notification.from_user.name}
                    size="md"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {notification.from_user && (
                      <span className="font-medium">{notification.from_user.name} </span>
                    )}
                    {notification.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}
      </Card>
    </div>
  );
}
