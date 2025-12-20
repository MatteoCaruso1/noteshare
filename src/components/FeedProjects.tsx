import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Disc3, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/types';

export function useFeedProjects() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['feed-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', profile.id)
        .eq('show_on_feed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!profile?.id,
  });
}

export function FeedProjects() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useFeedProjects();

  if (isLoading || !projects || projects.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
      <div className="space-y-2">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="p-3 bg-card border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <div className="flex items-center gap-3">
              {project.cover_image ? (
                <img
                  src={project.cover_image}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Disc3 className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{project.title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {project.release_date 
                    ? `Release: ${format(new Date(project.release_date), 'MMM d, yyyy')}`
                    : format(new Date(project.created_at), 'MMM d, yyyy')
                  }
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
