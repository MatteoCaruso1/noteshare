import { NoteWithAuthor } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, Image, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NoteCardProps {
  note: NoteWithAuthor;
  expanded?: boolean;
}

export function NoteCard({ note, expanded }: NoteCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className={`p-4 bg-card border-border ${!expanded ? 'cursor-pointer hover:border-primary/50' : ''} transition-colors`}
      onClick={!expanded ? () => navigate(`/notes/${note.id}`) : undefined}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={note.author?.avatar || ''} />
          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{note.author?.name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
      </div>

      {note.text_content && (
        <p className={`text-sm mb-3 ${!expanded ? 'line-clamp-3' : ''}`}>
          {note.text_content}
        </p>
      )}

      {note.audio_files.length > 0 && (
        <div className="space-y-2 mb-3">
          {note.audio_files.map((url, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
              <Mic className="w-4 h-4 text-primary" />
              <audio src={url} controls className="flex-1 h-8" />
            </div>
          ))}
        </div>
      )}

      {note.image_files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {note.image_files.map((url, i) => (
            <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
          ))}
        </div>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
