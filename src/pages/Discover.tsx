import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, User } from 'lucide-react';
import { INSTRUMENTS } from '@/types';
import { Profile as ProfileType } from '@/types';

const Discover = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [showCollaborators, setShowCollaborators] = useState(false);

  const { data: musicians, isLoading } = useQuery({
    queryKey: ['discover-musicians', selectedInstrument, showCollaborators],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedInstrument) {
        query = query.contains('instruments', [selectedInstrument]);
      }

      if (showCollaborators) {
        query = query.eq('open_to_collaborate', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProfileType[];
    },
    enabled: !!user,
  });

  const filteredMusicians = musicians?.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold mb-4">Discover Musicians</h1>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <Button
              variant={showCollaborators ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowCollaborators(!showCollaborators)}
            >
              <Users className="w-4 h-4 mr-1" />
              Open to Collab
            </Button>
            {INSTRUMENTS.slice(0, 6).map((instrument) => (
              <Button
                key={instrument}
                variant={selectedInstrument === instrument ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setSelectedInstrument(
                    selectedInstrument === instrument ? null : instrument
                  )
                }
              >
                {instrument}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading...</div>
        ) : filteredMusicians && filteredMusicians.length > 0 ? (
          <div className="space-y-4">
            {filteredMusicians.map((musician) => (
              <Card
                key={musician.id}
                className="p-4 bg-card border-border"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={musician.avatar || ''} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{musician.name}</h3>
                      {musician.open_to_collaborate && (
                        <Badge variant="secondary" className="text-xs">
                          Open to Collab
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{musician.username}</p>
                    {musician.bio && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {musician.bio}
                      </p>
                    )}
                    {musician.instruments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {musician.instruments.slice(0, 3).map((instrument) => (
                          <Badge key={instrument} variant="outline" className="text-xs">
                            {instrument}
                          </Badge>
                        ))}
                        {musician.instruments.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{musician.instruments.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No musicians found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Discover;
