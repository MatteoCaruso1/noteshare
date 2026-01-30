import { useState } from 'react';
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
import { useCreateGroupEvent } from '@/hooks/useGroupDetails';
import { Calendar, MapPin, Video } from 'lucide-react';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

const EVENT_TYPES = [
  { value: 'jam', label: 'Jam Session' },
  { value: 'show', label: 'Show / Gig' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'listening', label: 'Listening Party' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'other', label: 'Other' },
];

export function CreateEventDialog({ open, onOpenChange, groupId }: CreateEventDialogProps) {
  const createEvent = useCreateGroupEvent();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('19:00');
  const [eventType, setEventType] = useState('jam');
  const [isVirtual, setIsVirtual] = useState(false);
  const [location, setLocation] = useState('');
  
  const handleCreate = async () => {
    if (!name.trim() || !eventDate) return;
    
    const dateTime = new Date(`${eventDate}T${eventTime}`).toISOString();
    
    await createEvent.mutateAsync({
      group_id: groupId,
      name: name.trim(),
      description: description.trim() || undefined,
      event_date: dateTime,
      event_type: eventType,
      is_virtual: isVirtual,
      location: location.trim() || undefined,
    });
    
    // Reset form
    setName('');
    setDescription('');
    setEventDate('');
    setEventTime('19:00');
    setEventType('jam');
    setIsVirtual(false);
    setLocation('');
    onOpenChange(false);
  };
  
  const isValid = name.trim() && eventDate;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              placeholder="What's happening?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          
          {/* Event Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(type => (
                <Button
                  key={type.value}
                  variant={eventType === type.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEventType(type.value)}
                  type="button"
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Time</Label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>
          
          {/* Virtual Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="is-virtual">Virtual Event</Label>
            </div>
            <Switch
              id="is-virtual"
              checked={isVirtual}
              onCheckedChange={setIsVirtual}
            />
          </div>
          
          {/* Location */}
          {!isVirtual && (
            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="event-location"
                  placeholder="Where is it happening?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                  maxLength={200}
                />
              </div>
            </div>
          )}
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              placeholder="Tell people what to expect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          
          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!isValid || createEvent.isPending}
          >
            {createEvent.isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
