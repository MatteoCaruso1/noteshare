import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateGroup, GroupDetail } from '@/hooks/useGroupDetails';

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupDetail;
}

export function EditGroupDialog({ open, onOpenChange, group }: EditGroupDialogProps) {
  const updateGroup = useUpdateGroup();
  
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [isPrivate, setIsPrivate] = useState(group.privacy === 'private');
  const [city, setCity] = useState(group.city || '');
  
  // Reset form when group changes
  useEffect(() => {
    setName(group.name);
    setDescription(group.description || '');
    setIsPrivate(group.privacy === 'private');
    setCity(group.city || '');
  }, [group]);
  
  const handleSave = async () => {
    if (!name.trim()) return;
    
    await updateGroup.mutateAsync({
      groupId: group.id,
      updates: {
        name: name.trim(),
        description: description.trim() || null,
        privacy: isPrivate ? 'private' : 'public',
        city: city.trim() || null,
        location_type: city.trim() ? 'local' : 'global',
      },
    });
    
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Group Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          
          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="group-city">City (optional)</Label>
            <Input
              id="group-city"
              placeholder="e.g. Toronto, NYC, London"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={100}
            />
          </div>
          
          {/* Privacy Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is-private">Private Group</Label>
              <p className="text-sm text-muted-foreground">
                Only approved members can see content
              </p>
            </div>
            <Switch
              id="is-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>
          
          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name.trim() || updateGroup.isPending}
          >
            {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
