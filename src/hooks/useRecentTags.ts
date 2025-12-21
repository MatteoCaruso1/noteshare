import { useMemo } from 'react';
import { useNotes } from './useNotes';

export function useRecentTags() {
  const { data: notes } = useNotes();

  const recentTags = useMemo(() => {
    if (!notes) return [];
    
    // Collect all tags from recent notes
    const tagCounts = new Map<string, number>();
    
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    // Sort by frequency and return unique tags
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [notes]);

  return recentTags;
}
