import { memo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import { usePendingJoinRequests, useApproveJoinRequest, useRejectJoinRequest } from '@/hooks/useGroupInvites';

interface PendingRequestsSheetProps {
  groupId: string;
  children: React.ReactNode;
}

export const PendingRequestsSheet = memo(function PendingRequestsSheet({ 
  groupId, 
  children 
}: PendingRequestsSheetProps) {
  const { data: pendingRequests = [], isLoading } = usePendingJoinRequests(groupId);
  const approveRequest = useApproveJoinRequest();
  const rejectRequest = useRejectJoinRequest();
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Pending Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="pt-4 space-y-3 overflow-y-auto max-h-[calc(70vh-100px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={request.profile?.avatar || undefined} />
                  <AvatarFallback>
                    {request.profile?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{request.profile?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{request.profile?.username}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => rejectRequest.mutate({ memberId: request.id, groupId })}
                    disabled={rejectRequest.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => approveRequest.mutate({ memberId: request.id, groupId })}
                    disabled={approveRequest.isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
});
