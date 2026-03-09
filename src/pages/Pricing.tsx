import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

const freeFeatures = [
  'Unlimited practice notes',
  'Audio & image capture',
  'Practice session logging',
  'Practice timeline & history',
  'Practice streaks',
  'Friends feed & sharing',
  'Projects & folders',
  'Daily practice focus',
];

const proFeatures = [
  'Everything in Free, plus:',
  'Metronome & practice timer',
  'Goal setting & tracking',
  'Log past / offline sessions',
  'Save practice lists to backlog',
  'Advanced practice stats',
  'Calendar heatmap',
  'Priority support',
];

export default function Pricing() {
  const navigate = useNavigate();

  const handleFree = () => navigate('/auth');
  const handlePro = () => navigate('/auth');

  return (
    <div className="bg-transparent flex flex-col min-h-screen relative z-10 pt-12">
      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
          Simple pricing for musicians
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Start tracking your practice for free.
          <br className="hidden sm:block" />
          Upgrade when you want deeper insights into your progress.
        </p>
      </section>

      {/* Cards */}
      <section className="flex-1 px-6 md:px-12 pb-20 pt-8">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-xl border border-border/40 p-6 md:p-8 flex flex-col" style={{ background: 'hsl(217 32% 12%)' }}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Free</h2>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl font-bold text-foreground">$0</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">For musicians starting their practice journey.</p>
            <ul className="space-y-3 mb-8 flex-1">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              variant="outline"
              className="w-full font-bold"
              onClick={handleFree}
            >
              Start for free
            </Button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-primary/40 p-6 md:p-8 flex flex-col relative overflow-hidden" style={{ background: 'hsl(217 32% 14%)' }}>
            {/* Subtle glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-lg font-semibold text-foreground mb-1 relative z-10">Pro</h2>
            <div className="relative z-10 mb-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">$1.99</span>
                <span className="text-sm text-muted-foreground">CAD / month</span>
              </div>
              <p className="text-xs text-primary mt-1">Free trial included</p>
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-sm text-muted-foreground">
                  or <span className="text-foreground font-medium">Lifetime access</span>{' '}
                  <span className="text-xs text-muted-foreground">(one-time purchase, CAD)</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6 relative z-10">Unlock the full practice toolkit.</p>
            <ul className="space-y-3 mb-8 flex-1 relative z-10">
              {proFeatures.map((f, i) => (
                <li key={f} className={`flex items-start gap-2 text-sm ${i === 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {i > 0 && <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />}
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="w-full relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:scale-[1.02] group z-10"
              onClick={handlePro}
            >
              <span className="relative z-10">Upgrade to Pro</span>
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
    </div>
  );
}
