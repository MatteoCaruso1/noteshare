import { useState, useEffect, useRef } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Music, Guitar, Mic2, Radio, Building2, 
  Globe, MapPin, Lock, Unlock, Image as ImageIcon, 
  Check, Camera, X
} from 'lucide-react';
import { useUpdateGroup, GroupDetail } from '@/hooks/useGroupDetails';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { GroupHeaderPicker } from './GroupHeaderPicker';

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupDetail;
}

const FOCUS_OPTIONS = [
  { value: 'general', label: 'All Music', description: 'Open to all musicians and genres', icon: Music },
  { value: 'genre', label: 'Genre-Specific', description: 'Jazz, Rock, Classical, Hip-Hop, etc.', icon: Radio },
  { value: 'instrument', label: 'Instrument-Focused', description: 'Guitar, Piano, Drums, Vocals, etc.', icon: Guitar },
  { value: 'venue', label: 'Venue/Location', description: 'Jam spots, studios, live venues', icon: Building2 },
  { value: 'practice', label: 'Practice Community', description: 'Focused on improvement & sessions', icon: Mic2 },
];

const GROUP_TYPES = [
  { value: 'just-for-fun', label: 'Just for Fun', description: 'Fun and connection' },
  { value: 'band', label: 'Band/Ensemble', description: 'Looking to play together' },
  { value: 'venue', label: 'Venue/Space', description: 'Music venue or practice space' },
  { value: 'educator', label: 'Educator-Led', description: 'Teaching or workshop focused' },
  { value: 'open-mic', label: 'Open Mic', description: 'Regular performance events' },
  { value: 'production', label: 'Production', description: 'Recording, mixing, production' },
];

export function EditGroupDialog({ open, onOpenChange, group }: EditGroupDialogProps) {
  const updateGroup = useUpdateGroup();
  const { uploadImage, uploading } = useMediaUpload();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [focusType, setFocusType] = useState(group.focus_type);
  const [groupType, setGroupType] = useState<string[]>(group.group_type || []);
  const [privacy, setPrivacy] = useState(group.privacy);
  const [locationType, setLocationType] = useState(group.location_type);
  const [city, setCity] = useState(group.city || '');
  const [coverImage, setCoverImage] = useState(group.cover_image || '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Reset form when group changes
  useEffect(() => {
    setName(group.name);
    setDescription(group.description || '');
    setFocusType(group.focus_type);
    setGroupType(group.group_type || []);
    setPrivacy(group.privacy);
    setLocationType(group.location_type);
    setCity(group.city || '');
    setCoverImage(group.cover_image || '');
    setPreviewUrl(null);
  }, [group]);
  
  const toggleGroupType = (type: string) => {
    if (groupType.includes(type)) {
      setGroupType(groupType.filter(t => t !== type));
    } else if (groupType.length < 3) {
      setGroupType([...groupType, type]);
    }
  };
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    
    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Upload to storage
    try {
      const uploadedPath = await uploadImage(file, profile.id);
      if (uploadedPath) {
        setCoverImage(uploadedPath);
      } else {
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      setPreviewUrl(null);
    }
  };
  
  const handleRemoveImage = () => {
    setCoverImage('');
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSave = async () => {
    if (!name.trim()) return;
    
    await updateGroup.mutateAsync({
      groupId: group.id,
      updates: {
        name: name.trim(),
        description: description.trim() || null,
        focus_type: focusType,
        group_type: groupType,
        privacy: privacy,
        location_type: locationType,
        city: locationType === 'local' ? city.trim() || null : null,
        cover_image: coverImage || null,
      },
    });
    
    onOpenChange(false);
  };
  
  const displayImage = previewUrl || coverImage;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Edit Group Details</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-auto px-6">
          <div className="space-y-6 py-4">
            {/* Header Image */}
            <div className="space-y-2">
              <Label>Header Image</Label>
              <GroupHeaderPicker
                value={coverImage}
                onChange={setCoverImage}
                profileId={profile?.id || ''}
                previewUrl={previewUrl}
                onPreviewUrlChange={setPreviewUrl}
              />
            </div>
            
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
            
            {/* Focus Type */}
            <div className="space-y-2">
              <Label>Group Focus</Label>
              <div className="space-y-2">
                {FOCUS_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFocusType(option.value)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      focusType === option.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <option.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                        focusType === option.value
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}>
                        {focusType === option.value && (
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Group Type */}
            <div className="space-y-2">
              <Label>Group Type (up to 3)</Label>
              <div className="space-y-2">
                {GROUP_TYPES.map(type => {
                  const isSelected = groupType.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      onClick={() => toggleGroupType(type.value)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )}>
                          {isSelected && (
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Privacy */}
            <div className="space-y-2">
              <Label>Privacy</Label>
              <div className="space-y-2">
                <button
                  onClick={() => setPrivacy('public')}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-all",
                    privacy === 'public'
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Unlock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Public</p>
                      <p className="text-xs text-muted-foreground">
                        Anyone can join and view activity
                      </p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      privacy === 'public'
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}>
                      {privacy === 'public' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setPrivacy('private')}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-all",
                    privacy === 'private'
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Lock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Private</p>
                      <p className="text-xs text-muted-foreground">
                        Members must be approved by admins
                      </p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      privacy === 'private'
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}>
                      {privacy === 'private' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setLocationType('global');
                    setCity('');
                  }}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-all",
                    locationType === 'global'
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Global</span>
                    <div className={cn(
                      "ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      locationType === 'global'
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}>
                      {locationType === 'global' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setLocationType('local')}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-all",
                    locationType === 'local'
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Local</span>
                    <div className={cn(
                      "ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      locationType === 'local'
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}>
                      {locationType === 'local' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  </div>
                </button>
                
                {locationType === 'local' && (
                  <Input
                    placeholder="e.g. Toronto, NYC, London"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        {/* Submit Button - Fixed at bottom */}
        <div className="p-6 pt-4 border-t border-border">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name.trim() || updateGroup.isPending || uploading}
          >
            {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
