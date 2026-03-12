import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight } from 'lucide-react';
import blogScienceImage from '@/assets/blog-science-practice.jpg';
import blogRoutineImage from '@/assets/blog-daily-routine.jpg';
import blogJournalImage from '@/assets/blog-practice-journal.jpg';

const Blog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Blog | Noteshare';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Insights on music practice, creativity, and building better habits. From the Noteshare team.');
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background pt-12">
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-16">
        {/* Page title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-12">
          Blog
        </h1>

        {/* Featured post — large hero layout */}
        <Link
          to="/blog/daily-practice-routine"
          className="group block mb-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <span>Mar 12</span>
                <span className="text-muted-foreground/40">|</span>
                <span>Matteo</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-tight group-hover:text-primary transition-colors">
                Build the perfect daily music practice routine
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A research-backed 60-minute routine covering warmup, technique, repertoire, and reflection — designed for musicians who want to improve faster.
              </p>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                Read more
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-[3/2]">
              <img
                src={blogRoutineImage}
                alt="Build the perfect daily music practice routine"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </Link>

        {/* Divider */}
        <div className="border-t border-border mb-12" />

        {/* Bottom grid — 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
          {/* Science of Practice — published */}
          <Link to="/science-of-practice" className="group">
            <div className="rounded-xl aspect-[4/3] overflow-hidden border border-border bg-muted mb-4">
              <img
                src={blogScienceImage}
                alt="The science of effective music practice"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              <span>Mar 10</span>
              <span className="text-muted-foreground/40">|</span>
              <span>Matteo</span>
            </div>
            <h3 className="text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
              The science of effective music practice
            </h3>
          </Link>

          {/* Practice Journal — published */}
          <Link to="/blog/practice-journal" className="group">
            <div className="rounded-xl aspect-[4/3] overflow-hidden border border-border bg-muted mb-4">
              <img
                src={blogJournalImage}
                alt="Why every musician needs a practice journal"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              <span>Mar 12</span>
              <span className="text-muted-foreground/40">|</span>
              <span>Matteo</span>
            </div>
            <h3 className="text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
              Why every musician needs a practice journal
            </h3>
          </Link>

          {/* Coming soon cards */}
          {[
            { title: 'Organizing long-term musical projects', color: 'from-accent/30 to-accent/10' },
          ].map((post, i) => (
            <div key={i} className="group cursor-default">
              <div className={`rounded-xl aspect-[4/3] bg-gradient-to-br ${post.color} border border-border flex items-center justify-center mb-4`}>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Coming soon
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                <span>Coming soon</span>
                <span className="text-muted-foreground/40">|</span>
                <span>Matteo</span>
              </div>
              <h3 className="text-base font-semibold text-foreground leading-snug">
                {post.title}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-10 px-6 md:px-12 text-center text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Noteshare — Practice Smarter</p>
        <p>Contact: notesharemusic@gmail.com</p>
        <p>© {new Date().getFullYear()} Noteshare</p>
      </footer>
    </div>
  );
};

export default Blog;
