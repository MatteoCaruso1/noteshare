import { useFeedGigs } from '@/hooks/usePromoPosts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music2, Calendar, DollarSign, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export function FeedGigs() {
  const { data: gigs, isLoading } = useFeedGigs();

  if (isLoading || !gigs || gigs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Upcoming Gigs</h3>
      <div className="space-y-2">
        {gigs.map((gig) => (
          <Card
            key={gig.id}
            className="p-3 bg-card border-border"
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
                {gig.links && gig.links.length > 0 && (
                  <a
                    href={gig.links[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Details
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
