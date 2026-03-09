import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';

const freeIncludedFeatures = [
'Practice session logging',
'Audio capture during sessions',
'Practice timeline & history',
'Practice streaks',
'Friends feed & sharing',
'Practice to-do lists',
'Musical groups'];


const proOnlyFeatures = [
'Advanced practice stats',
'Log past / offline sessions',
'Goal setting & tracking',
'Organize sessions using folders & gigs',
'Metronome & practice timer',
'Custom themes',
'Backlog practice to-do lists'];


const allFeatures = [...freeIncludedFeatures, ...proOnlyFeatures];

export default function Pricing() {
  const navigate = useNavigate();

  const handleFree = () => { window.scrollTo(0, 0); navigate('/auth?from=pricing'); };
  const handlePro = () => { window.scrollTo(0, 0); navigate('/auth?from=pricing'); };

  return (
    <div className="bg-transparent flex flex-col min-h-screen relative z-10">
      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-1 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
          Simple Pricing
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
          Start for free. Upgrade for advanced practice tools and deeper progress insights.
        </p>
      </section>

      {/* Cards */}
      <section className="flex-1 px-6 md:px-12 pb-20 pt-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-xl border border-border/40 p-6 md:p-8 flex flex-col" style={{ background: 'hsl(217 32% 12%)' }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Free</h2>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-bold text-foreground">$0</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {freeIncludedFeatures.map((f) =>
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              )}
              {proOnlyFeatures.map((f) =>
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/50">
                  <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground/50" />
                  <span>{f}</span>
                </li>
              )}
            </ul>
            <Button
              size="lg"
              variant="outline"
              className="w-full font-bold"
              onClick={handleFree}>
              
              Start Practicing
            </Button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-primary/40 p-6 md:p-8 flex flex-col relative overflow-hidden" style={{ background: 'hsl(217 32% 14%)' }}>
            {/* Subtle glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-lg font-semibold text-foreground mb-1 relative z-10">Pro</h2>
            <div className="relative z-10 mb-6">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-3xl font-bold text-foreground">$9.99</span>
                <span className="text-sm text-muted-foreground">CAD lifetime</span>
                <span className="text-[10px] text-primary ml-1">(or $1.99 / mo. with trial)</span>
              </div>
              

              
            </div>
            <ul className="space-y-3 mb-8 flex-1 relative z-10">
              {allFeatures.map((f) =>
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              )}
            </ul>
            <Button
              size="lg"
              className="w-full relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:scale-[1.02] group z-10"
              onClick={handlePro}>
              
              <span className="relative z-10">Start Practicing</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">All prices in CAD</p>
      </section>

      {/* Footer — same as landing page */}
      <footer className="relative z-10 border-t border-border/20 bg-background px-6 py-4">
        <p className="text-center text-xs text-muted-foreground/60 leading-relaxed flex flex-wrap justify-center gap-x-1">
          <span>Noteshare</span>
          <span>—</span>
          <span>Practice Smarter</span>
          <span>—</span>
          <span>Contact: notesharemusic@gmail.com</span>
          <span>—</span>
          <span>© 2026 Noteshare</span>
        </p>
      </footer>
    </div>);

}