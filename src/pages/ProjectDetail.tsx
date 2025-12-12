import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { useNotes } from '@/hooks/useNotes';
import { BottomNav } from '@/components/BottomNav';
import { Timeline } from '@/components/Timeline';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Folder } from 'lucide-react';
import { format } from 'date-fns';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(id || '');
  const { data: notes, isLoading: notesLoading } = useNotes(id);

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Project not found</p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{project.title}</h1>
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(project.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Project Info */}
        {project.description && (
          <div className="p-4 bg-card rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
        )}

        {/* Project Notes */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Project Notes</h2>
          {notes && notes.length > 0 ? (
            <Timeline notes={notes} loading={notesLoading} />
          ) : (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Folder className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No notes in this project yet</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => navigate('/practice')}
              >
                Add a Note
              </Button>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProjectDetail;
