import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

export function InviteMembersDialog({ open, onOpenChange, groupId, groupName }: InviteMembersDialogProps) {
  const [copied, setCopied] = useState(false);
  
  const inviteLink = `${window.location.origin}/groups/${groupId}`;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on Noteshare`,
          text: `Check out ${groupName} on Noteshare!`,
          url: inviteLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link to invite people to join {groupName}
          </p>
          
          {/* Link Input */}
          <div className="flex gap-2">
            <Input
              value={inviteLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Share Button */}
          <Button 
            className="w-full" 
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Invite Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
