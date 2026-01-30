import { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCreateGroupEvent, GroupEvent } from '@/hooks/useGroupDetails';
import { Calendar as CalendarIcon, MapPin, Video, ChevronLeft, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventSuccessDialog } from './EventSuccessDialog';

interface CreateEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

const EVENT_TYPES = [
  { value: 'jam', label: 'Jam Session', icon: '🎸' },
  { value: 'rehearsal', label: 'Rehearsal', icon: '🎹' },
  { value: 'show', label: 'Show / Gig', icon: '🎤' },
  { value: 'listening', label: 'Listening Party', icon: '🎧' },
  { value: 'workshop', label: 'Workshop', icon: '📚' },
  { value: 'meetup', label: 'Meetup', icon: '👋' },
  { value: 'other', label: 'Other', icon: '🎵' },
];

export function CreateEventDrawer({ open, onOpenChange, groupId, groupName }: CreateEventDrawerProps) {
  const createEvent = useCreateGroupEvent();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date>();
  const [eventTime, setEventTime] = useState('19:00');
  const [eventType, setEventType] = useState('jam');
  const [skipType, setSkipType] = useState(false);
  const [isVirtual, setIsVirtual] = useState(false);
  const [location, setLocation] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<GroupEvent | null>(null);
  
  const resetForm = () => {
    setName('');
    setDescription('');
    setEventDate(undefined);
    setEventTime('19:00');
    setEventType('jam');
    setSkipType(false);
    setIsVirtual(false);
    setLocation('');
  };
  
  const handleCreate = async () => {
    if (!name.trim() || !eventDate) return;
    
    const dateTime = new Date(eventDate);
    const [hours, minutes] = eventTime.split(':').map(Number);
    dateTime.setHours(hours, minutes, 0, 0);
    
    const result = await createEvent.mutateAsync({
      group_id: groupId,
      name: name.trim(),
      description: description.trim() || undefined,
      event_date: dateTime.toISOString(),
      event_type: skipType ? 'other' : eventType,
      is_virtual: isVirtual,
      location: location.trim() || undefined,
    });
    
    // Create a mock event object for the success dialog
    setCreatedEvent({
      id: result.id,
      group_id: groupId,
      created_by: result.created_by,
      name: name.trim(),
      description: description.trim() || null,
      event_date: dateTime.toISOString(),
      event_type: skipType ? 'other' : eventType,
      is_virtual: isVirtual,
      location: location.trim() || null,
      created_at: result.created_at,
    });
    
    resetForm();
    onOpenChange(false);
    setShowSuccess(true);
  };
  
  const isValid = name.trim().length >= 3 && name.trim().length <= 125 && eventDate;
  const charCount = name.length;
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="flex flex-row items-center gap-3 pb-4 border-b">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <SheetTitle className="flex-1 text-center pr-8">New Event</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 py-6">
            {/* Event Name */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="event-name" className="text-base font-semibold">Event Name</Label>
                <span className="text-sm text-muted-foreground">Required</span>
              </div>
              <Input
                id="event-name"
                placeholder="Name your event"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={125}
                className="h-12"
              />
              <p className={cn(
                "text-sm",
                charCount < 3 || charCount > 125 ? "text-muted-foreground" : "text-muted-foreground"
              )}>
                Must be between 3 and 125 characters.
              </p>
            </div>
            
            {/* Event Type */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Event Type</Label>
                <span className="text-sm text-muted-foreground">Required</span>
              </div>
              <Select 
                value={eventType} 
                onValueChange={setEventType}
                disabled={skipType}
              >
                <SelectTrigger className="h-12">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Skip Type Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Skip the type</p>
                <p className="text-sm text-muted-foreground">Your event won't be tied to a specific type</p>
              </div>
              <Switch
                checked={skipType}
                onCheckedChange={setSkipType}
              />
            </div>
            
            {/* When - Date Picker */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">When</Label>
                <span className="text-sm text-muted-foreground">Required</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal",
                      !eventDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? (
                      format(eventDate, "MMMM d, yyyy") + ` at ${eventTime.replace(':', ':')}`
                    ) : (
                      <span>Pick a date and time</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={setEventDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                  <div className="p-3 border-t">
                    <Label htmlFor="time-picker" className="text-sm">Time</Label>
                    <Input
                      id="time-picker"
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Location */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Location</Label>
                {!isVirtual && <span className="text-sm text-muted-foreground">Required</span>}
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Choose a location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12 pl-10"
                  maxLength={200}
                  disabled={isVirtual}
                />
              </div>
            </div>
            
            {/* Virtual Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium">This event is virtual</p>
              </div>
              <Switch
                checked={isVirtual}
                onCheckedChange={setIsVirtual}
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Description</Label>
              <Textarea
                placeholder="Tell people what to expect..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
            </div>
            
            {/* Create Button */}
            <Button
              className="w-full h-12 text-base"
              onClick={handleCreate}
              disabled={!isValid || createEvent.isPending}
            >
              {createEvent.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      
      <EventSuccessDialog
        open={showSuccess}
        onOpenChange={setShowSuccess}
        event={createdEvent}
        groupName={groupName}
      />
    </>
  );
}
