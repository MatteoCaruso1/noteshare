import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFeedGigs } from '@/hooks/usePromoPosts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Disc3, Music2, Calendar, DollarSign, ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { Project } from '@/types';

const PROJECTS_GIGS_EXPANDED_KEY = 'noteshare_projects_gigs_expanded';

function useFeedProjects() {
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

export function FeedProjectsGigs() {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useFeedProjects();
  const { data: gigs, isLoading: gigsLoading } = useFeedGigs();

  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem(PROJECTS_GIGS_EXPANDED_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(PROJECTS_GIGS_EXPANDED_KEY, String(isExpanded));
  }, [isExpanded]);

  const hasProjects = projects && projects.length > 0;
  const hasGigs = gigs && gigs.length > 0;

  // Don't render if nothing to show
  if ((projectsLoading && gigsLoading) || (!hasProjects && !hasGigs)) {
    return null;
  }

  const totalCount = (projects?.length || 0) + (gigs?.length || 0);

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Projects & Gigs</h2>
              <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Projects */}
            {hasProjects && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="p-3 bg-secondary/30 border-border cursor-pointer hover:border-primary/50 transition-colors"
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
                          {format(new Date(project.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Gigs */}
            {hasGigs && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Upcoming Gigs</h3>
                {gigs.map((gig) => (
                  <Card
                    key={gig.id}
                    className="p-3 bg-secondary/30 border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => navigate(`/gigs/${gig.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Music2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm">{gig.title}</h4>
                          {gig.is_paid_opportunity && (
                            <Badge className="text-xs bg-green-600">
                              <DollarSign className="w-3 h-3" />
                              Paid
                            </Badge>
                          )}
                        </div>
                        {gig.event_date && (
                          <p className="text-xs text-primary flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(gig.event_date), 'MMM d, yyyy · h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}