import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function ShortNoteRedirect() {
  const { shortId } = useParams<{ shortId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function findAndRedirect() {
      if (!shortId || shortId.length < 8) {
        setError('Invalid link');
        return;
      }

      // Search for note with ID starting with this shortId
      const { data, error: queryError } = await supabase
        .from('notes')
        .select('id')
        .ilike('id', `${shortId}%`)
        .limit(1)
        .maybeSingle();

      if (queryError) {
        console.error('Error finding note:', queryError);
        setError('Could not find this note');
        return;
      }

      if (data?.id) {
        navigate(`/notes/${data.id}`, { replace: true });
      } else {
        setError('Note not found');
      }
    }

    findAndRedirect();
  }, [shortId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-semibold mb-2">Oops!</h1>
        <p className="text-muted-foreground">{error}</p>
        <button 
          onClick={() => navigate('/')} 
          className="mt-4 text-primary underline"
        >
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
