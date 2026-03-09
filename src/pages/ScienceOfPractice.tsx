import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Target, Brain, BookOpen, TrendingUp, Clock, CheckCircle2, Music, Lightbulb, ClipboardList } from 'lucide-react';

const ScienceOfPractice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'The Science of Effective Music Practice | Noteshare';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Learn the principles behind effective music practice and how structured practice helps musicians improve faster.');
    }
    window.scrollTo(0, 0);
  }, []);

  const handleCTA = () => {
    window.scrollTo(0, 0);
    navigate(user ? '/' : '/auth?from=science');
  };

  return (
    <div className="min-h-screen dark" style={{ background: 'hsl(222 47% 11%)' }}>
      {/* Hero */}
      <section className="relative pt-20 pb-12 px-6 md:px-12">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: 'hsl(198 93% 59% / 0.06)' }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: 'hsl(198 93% 59% / 0.04)' }} />
        </div>
        <div className="max-w-3xl mx-auto relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-6" style={{ color: 'hsl(210 40% 98%)' }}>
            The Science of Effective Music Practice
          </h1>
          <p className="text-xl md:text-2xl leading-relaxed mb-4" style={{ color: 'hsl(215 20% 65%)' }}>
            Why some musicians improve rapidly while others stay stuck.
          </p>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'hsl(215 16% 50%)' }}>
            This guide explains the core principles behind effective music practice and how musicians can structure their practice sessions to improve more efficiently.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              onClick={handleCTA}
              className="bg-[hsl(198_93%_59%)] hover:bg-[hsl(198_93%_50%)] text-[hsl(204_80%_15%)] font-bold px-8 shadow-lg transition-all duration-200 hover:scale-[1.02]"
            >
              Start tracking your practice
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1 — The Hidden Problem */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-8" style={{ color: 'hsl(210 40% 98%)' }}>
            Why Not All Practice Leads to Improvement
          </h2>
          <p className="text-base leading-relaxed mb-6" style={{ color: 'hsl(215 16% 56%)' }}>
            Many musicians spend hours practicing but still feel stuck. Research from both Florida State University and University of Melbourne tell us that <strong>lack of structure and deliberate goal setting</strong> are key inhibitors to musical growth. Common issues include...
          </p>
          <ul className="space-y-3 mb-8">
            {[
              'Sitting down to practice without a clear objective',
              'Practicing what already feels comfortable instead of targeting weaknesses',
              'Losing track of what was practiced the day before',
              'Having no way to see improvement over time',
              'Trying to improve too many things at once in a single session',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'hsl(198 93% 59%)' }} />
                <span className="text-base leading-relaxed" style={{ color: 'hsl(215 16% 56%)' }}>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-base leading-relaxed" style={{ color: 'hsl(215 20% 65%)' }}>
            The research is clear - musicians who set specific practice goals and reflect on sessions improve significantly faster than those who simply play through pieces.
          </p>
        </div>
      </section>

      {/* Section 2 — Four Principles */}
      <section className="py-14 px-6 md:px-12" style={{ background: 'hsl(217 32% 14%)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-center" style={{ color: 'hsl(210 40% 98%)' }}>
            Four Principles Behind Effective Practice
          </h2>
          <p className="text-base text-center mb-12" style={{ color: 'hsl(215 16% 56%)' }}>
            Leveraging research from Gary E. McPherson — University of Melbourne
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Brain, title: 'Deliberate Focus & Goal-setting', desc: 'Practice specific skills intentionally rather than just playing through pieces. Target your weaknesses directly.' },
              { icon: Target, title: 'Consistency', desc: 'Daily focused practice beats occasional long sessions.' },
              { icon: BookOpen, title: 'Reflection', desc: 'Recording observations after practice helps reinforce learning and reveals patterns you might otherwise miss.' },
              { icon: TrendingUp, title: 'Progress Tracking', desc: 'Seeing improvement over time increases motivation and gives clear direction for future sessions.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-6 border"
                style={{
                  background: 'hsl(222 47% 11% / 0.6)',
                  borderColor: 'hsl(215 19% 28%)',
                }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: 'hsl(198 93% 59% / 0.12)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'hsl(198 93% 59%)' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(210 40% 98%)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(215 16% 56%)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Practice Framework */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6" style={{ color: 'hsl(210 40% 98%)' }}>
            A Simple Structure for Practice Sessions
          </h2>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'hsl(215 16% 56%)' }}>
            Effective practice sessions often follow a consistent structure. Having a framework removes decision fatigue and ensures each session has purpose.
          </p>
          <div
            className="rounded-xl p-8 border mb-8"
            style={{
              background: 'hsl(217 32% 15%)',
              borderColor: 'hsl(215 19% 28%)',
            }}
          >
            <div className="space-y-5">
              {[
                { time: '10 min', label: 'Warmup', icon: Music },
                { time: '15 min', label: 'Technique', icon: Target },
                { time: '20 min', label: 'Repertoire', icon: BookOpen },
                { time: '10 min', label: 'Improvisation / exploration', icon: Lightbulb },
                { time: '5 min', label: 'Reflection', icon: CheckCircle2 },
              ].map(({ time, label, icon: Icon }, i) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(198 93% 59% / 0.1)' }}>
                    <Icon className="w-4 h-4" style={{ color: 'hsl(198 93% 59%)' }} />
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-mono font-medium" style={{ color: 'hsl(198 93% 59%)' }}>{time}</span>
                    <span className="text-base" style={{ color: 'hsl(210 40% 98%)' }}>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(215 16% 50%)' }}>
            The exact structure may vary by instrument or experience level. What matters most is intentional practice combined with reflection afterward.
          </p>
        </div>
      </section>

      {/* Section 4 — Why Tracking Works */}
      <section className="py-20 px-6 md:px-12" style={{ background: 'hsl(217 32% 14%)' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6" style={{ color: 'hsl(210 40% 98%)' }}>
            Why Tracking Your Practice Works
          </h2>
          <p className="text-base leading-relaxed mb-6" style={{ color: 'hsl(215 16% 56%)' }}>
            Tracking practice sessions creates a powerful feedback loop. When you write down what you worked on, practice becomes more intentional, and progress becomes easier to see.
          </p>
          <ul className="space-y-3 mb-10">
            {[
              'Forces intentional practice',
              'Drives accountability to show up everyday',
              'Builds a record of your work',
              'Reveals to you what\'s actually improving',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'hsl(198 93% 59%)' }} />
                <span className="text-base leading-relaxed" style={{ color: 'hsl(215 16% 56%)' }}>{item}</span>
              </li>
            ))}
          </ul>

          {/* Practice log mock */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: 'hsl(222 47% 11%)',
              borderColor: 'hsl(215 19% 28%)',
            }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(215 19% 24%)' }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'hsl(215 16% 46%)' }}>Practice Log Example</h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'hsl(215 19% 22%)' }}>
              {[
                { label: 'Date', value: 'March 8, 2026' },
                { label: 'Duration', value: '55 minutes' },
                { label: 'Focus areas', value: 'Scale patterns (20 min), chord voicings (20 min), sight reading (15 min)' },
                { label: 'Next session', value: 'Continue chord voicings with metronome at 80 bpm' },
              ].map(({ label, value }) => (
                <div key={label} className="px-6 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4" style={{ borderColor: 'hsl(215 19% 22%)' }}>
                  <span className="text-xs font-medium uppercase tracking-wider w-28 flex-shrink-0 pt-0.5" style={{ color: 'hsl(215 16% 46%)' }}>{label}</span>
                  <span className="text-sm" style={{ color: 'hsl(210 40% 90%)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm leading-relaxed mt-6" style={{ color: 'hsl(215 16% 50%)' }}>
            Over weeks and months, a practice log becomes a powerful record of improvement.
          </p>
        </div>
      </section>

      {/* Section 5 — Noteshare */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6" style={{ color: 'hsl(210 40% 98%)' }}>
            Practice Smarter With Noteshare
          </h2>
          <p className="text-base leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'hsl(215 16% 56%)' }}>
            Noteshare was designed specifically to support these practice principles. It gives musicians a dedicated space to log sessions, capture ideas, and track consistency.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 text-left">
            {[
              { icon: Clock, label: 'Log practice sessions' },
              { icon: BookOpen, label: 'Write practice notes and reflections' },
              { icon: ClipboardList, label: 'Set musical goals' },
              { icon: TrendingUp, label: 'Track consistency with streaks and stats' },
              { icon: Brain, label: 'Reflect on progress over time' },
              { icon: Music, label: 'Capture audio during practice' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-lg" style={{ background: 'hsl(217 32% 15%)' }}>
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'hsl(198 93% 59%)' }} />
                <span className="text-sm" style={{ color: 'hsl(210 40% 90%)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — FAQ */}
      <section className="py-20 px-6 md:px-12" style={{ background: 'hsl(217 32% 14%)' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-10" style={{ color: 'hsl(210 40% 98%)' }}>
            Common Questions About Music Practice
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {[
              {
                q: 'How long should you practice an instrument each day?',
                a: 'Consistency matters more than duration. For most musicians, 30–60 minutes of focused, structured practice is more effective than several hours of unfocused playing. The key is maintaining concentration and working on specific goals rather than simply accumulating time.',
              },
              {
                q: 'What is deliberate practice in music?',
                a: 'Deliberate practice means focusing on improving specific weaknesses rather than simply repeating pieces you already know. It involves setting clear goals for each session, working at the edge of your current ability, and reflecting on what improved. This approach, rooted in research by K. Anders Ericsson, is what separates effective musicians from those who plateau.',
              },
              {
                q: 'Should you track your practice sessions?',
                a: 'Tracking sessions helps musicians see progress that would otherwise remain invisible, stay consistent over time, and remember what they worked on. A simple log of duration, focus areas, and observations creates a powerful feedback loop that reinforces learning and builds motivation.',
              },
              {
                q: 'How do professional musicians structure practice?',
                a: 'Most professional musicians structure sessions around technique, repertoire, and focused skill development. They typically warm up, work on specific technical challenges, rehearse repertoire with clear goals, and finish with reflection or creative exploration. The exact structure varies, but intention and focus are consistent themes.',
              },
              {
                q: 'How can beginners practice more effectively?',
                a: 'Beginners benefit most from short, structured sessions, even 15–20 minutes, with a clear goal for each one. Breaking practice into small focused blocks, taking brief notes after each session, and reviewing progress weekly helps build strong habits early and prevents the frustration of aimless repetition.',
              },
            ].map(({ q, a }, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border px-6"
                style={{
                  background: 'hsl(222 47% 11% / 0.6)',
                  borderColor: 'hsl(215 19% 28%)',
                }}
              >
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-5" style={{ color: 'hsl(210 40% 98%)' }}>
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed pb-5" style={{ color: 'hsl(215 16% 56%)' }}>
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Section 7 — Closing */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg md:text-xl leading-relaxed mb-10" style={{ color: 'hsl(215 20% 65%)' }}>
            Musical progress rarely comes from sudden breakthroughs.<br /><br />
            It comes from consistent practice, clear focus, and reflection over time.<br /><br />
            When musicians make their practice visible and structured, improvement becomes far more predictable.
          </p>
          <Button
            size="lg"
            onClick={handleCTA}
            className="bg-[hsl(198_93%_59%)] hover:bg-[hsl(198_93%_50%)] text-[hsl(204_80%_15%)] font-bold px-10 shadow-lg transition-all duration-200 hover:scale-[1.02]"
          >
            Start practicing smarter
          </Button>
        </div>
      </section>

      {/* Footer */}
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

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'The Science of Effective Music Practice',
            description: 'Learn the principles behind effective music practice and how structured practice helps musicians improve faster.',
            author: { '@type': 'Organization', name: 'Noteshare' },
            publisher: { '@type': 'Organization', name: 'Noteshare' },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': 'https://jazz-scene-alive.lovable.app/science-of-practice',
            },
          }),
        }}
      />
    </div>
  );
};

export default ScienceOfPractice;
