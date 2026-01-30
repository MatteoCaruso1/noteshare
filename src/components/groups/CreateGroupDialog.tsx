import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft, X, Music, Guitar, Mic2, Radio, Users, 
  Building2, GraduationCap, Sparkles, Globe, MapPin, 
  Lock, Unlock, Image as ImageIcon, Check
} from 'lucide-react';
import { CreateGroupData, useCreateGroup } from '@/hooks/useGroups';
import { cn } from '@/lib/utils';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'focus' | 'type' | 'customize' | 'privacy' | 'location';

const STEPS: Step[] = ['focus', 'type', 'customize', 'privacy', 'location'];

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

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const [step, setStep] = useState<Step>('focus');
  const [formData, setFormData] = useState<Partial<CreateGroupData>>({
    focus_type: '',
    group_type: [],
    privacy: 'public',
    location_type: 'global',
  });
  
  const createGroup = useCreateGroup();
  
  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  
  const canProceed = () => {
    switch (step) {
      case 'focus':
        return !!formData.focus_type;
      case 'type':
        return formData.group_type && formData.group_type.length > 0;
      case 'customize':
        return !!formData.name && formData.name.trim().length >= 3;
      case 'privacy':
        return !!formData.privacy;
      case 'location':
        return formData.location_type === 'global' || !!formData.city;
      default:
        return false;
    }
  };
  
  const handleNext = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
    }
  };
  
  const handleBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };
  
  const handleCreate = async () => {
    if (!formData.name || !formData.focus_type || !formData.group_type) return;
    
    await createGroup.mutateAsync({
      name: formData.name,
      description: formData.description,
      focus_type: formData.focus_type,
      focus_details: formData.focus_details,
      group_type: formData.group_type,
      privacy: formData.privacy || 'public',
      location_type: formData.location_type || 'global',
      city: formData.city,
    });
    
    onOpenChange(false);
    // Reset form
    setStep('focus');
    setFormData({
      focus_type: '',
      group_type: [],
      privacy: 'public',
      location_type: 'global',
    });
  };
  
  const handleClose = () => {
    onOpenChange(false);
    setStep('focus');
    setFormData({
      focus_type: '',
      group_type: [],
      privacy: 'public',
      location_type: 'global',
    });
  };
  
  const toggleGroupType = (type: string) => {
    const current = formData.group_type || [];
    if (current.includes(type)) {
      setFormData({ ...formData, group_type: current.filter(t => t !== type) });
    } else if (current.length < 3) {
      setFormData({ ...formData, group_type: [...current, type] });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0" hideCloseButton>
        {/* Header with progress */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            {stepIndex > 0 ? (
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9" />
            )}
            
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <Progress value={progress} className="h-1" />
        </div>
        
        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6">
            {step === 'focus' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Choose your group's focus</h2>
                  <p className="text-muted-foreground mt-1">
                    Go broad with "All Music" or be specific with one focus area.
                  </p>
                </div>
                
                <div className="space-y-2">
                  {FOCUS_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, focus_type: option.value })}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        formData.focus_type === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <option.icon className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          formData.focus_type === option.value
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )}>
                          {formData.focus_type === option.value && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {step === 'type' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">What best describes your group?</h2>
                  <p className="text-muted-foreground mt-1">
                    Pick up to 3 tags that fit best. Let others know what you're all about.
                  </p>
                </div>
                
                <div className="space-y-2">
                  {GROUP_TYPES.map(type => {
                    const isSelected = formData.group_type?.includes(type.value);
                    return (
                      <button
                        key={type.value}
                        onClick={() => toggleGroupType(type.value)}
                        className={cn(
                          "w-full p-4 rounded-lg border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/30 hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          )}>
                            {isSelected && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {step === 'customize' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Customize your group</h2>
                  <p className="text-muted-foreground mt-1">
                    Choose a group name, add a photo and write a description.
                  </p>
                </div>
                
                {/* Photo placeholder */}
                <div className="flex justify-center">
                  <div className="w-32 h-32 rounded-lg bg-secondary border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-secondary/80 transition-colors">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload Photo</span>
                  </div>
                </div>
                
                {/* Name input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold">Group Name</label>
                    <span className="text-xs text-muted-foreground">Required</span>
                  </div>
                  <Input
                    placeholder="Give your group a name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={126}
                  />
                  <p className="text-xs text-muted-foreground">
                    {126 - (formData.name?.length || 0)} characters remaining
                  </p>
                </div>
                
                {/* Description input */}
                <div className="space-y-2">
                  <label className="font-semibold">Description</label>
                  <Textarea
                    placeholder="What's your group about?"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength={1250}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {1250 - (formData.description?.length || 0)} characters remaining
                  </p>
                </div>
              </div>
            )}
            
            {step === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Private or public?</h2>
                </div>
                
                <div className="space-y-4 pt-8">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                    Privacy
                  </p>
                  
                  <button
                    onClick={() => setFormData({ ...formData, privacy: 'public' })}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      formData.privacy === 'public'
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Unlock className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-semibold">Public</p>
                        <p className="text-sm text-muted-foreground">
                          Anyone on Noteshare can join your group and view activity and content.
                        </p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        formData.privacy === 'public'
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}>
                        {formData.privacy === 'public' && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setFormData({ ...formData, privacy: 'private' })}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      formData.privacy === 'private'
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-semibold">Private</p>
                        <p className="text-sm text-muted-foreground">
                          People must request permission to join your group. Only admins can approve new members.
                        </p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        formData.privacy === 'private'
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}>
                        {formData.privacy === 'private' && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
            
            {step === 'location' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Where is your group located?</h2>
                  <p className="text-muted-foreground mt-1">
                    Pick "Global" if your group isn't tied to one spot.
                  </p>
                </div>
                
                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => setFormData({ ...formData, location_type: 'global', city: undefined })}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      formData.location_type === 'global'
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Global</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setFormData({ ...formData, location_type: 'local' })}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      formData.location_type === 'local'
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="font-medium">Local</span>
                        <p className="text-sm text-muted-foreground">Set a city or location</p>
                      </div>
                    </div>
                  </button>
                  
                  {formData.location_type === 'local' && (
                    <div className="pt-2">
                      <Input
                        placeholder="Enter city name"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-3">
            You can always change this later
          </p>
          
          {step === 'location' ? (
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!canProceed() || createGroup.isPending}
            >
              {createGroup.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
