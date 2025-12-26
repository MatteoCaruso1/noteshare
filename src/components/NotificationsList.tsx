import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { Bell, AtSign, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NotificationsListProps {
  embedded?: boolean;
}

export function NotificationsList({ embedded }: NotificationsListProps = {}) {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    if (notification.note_id) {
      navigate(`/notes/${notification.note_id}`);
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  // When embedded in dropdown, skip the outer wrapper
  if (embedded) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        {unreadCount > 0 && (
          <div className="flex justify-end mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              className="text-xs h-7"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : unreadCount > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications?.filter(n => !n.read).slice(0, 10).map((notification) => (
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
                    <AtSign className="w-4 h-4 text-primary" />
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
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No new notifications</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary' : ''}`} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge className="h-5 px-1.5 text-xs bg-destructive text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            className="text-xs"
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <Card className="p-4 bg-card border-border">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
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
                    <AtSign className="w-5 h-5 text-primary" />
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
