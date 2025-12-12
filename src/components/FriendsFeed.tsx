import { useFriendsNotes } from '@/hooks/useFriendships';
import { NoteCard } from './NoteCard';
import { Card } from '@/components/ui/card';
import { Users, Sparkles } from 'lucide-react';

export function FriendsFeed() {
  const { data: notes, isLoading } = useFriendsNotes();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 bg-card border-border animate-pulse">
            <div className="h-20 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <Card className="p-8 bg-card border-border text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h3 className="font-semibold text-lg mb-2">No friends' notes yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Add a few friends to see their practice journals here. This isn't about going viral — it's about improving together.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Use the search above to find musicians</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
