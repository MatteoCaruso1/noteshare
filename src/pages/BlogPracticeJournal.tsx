import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, CheckCircle2, HelpCircle } from 'lucide-react';
import blogHeroImage from '@/assets/blog-practice-journal.jpg';

const h2Style = 'text-2xl sm:text-3xl font-semibold tracking-tight leading-tight mb-6';
const textColor = { color: 'hsl(215 20% 65%)' };
const headingColor = { color: 'hsl(210 40% 98%)' };
const cardBg = { background: 'hsl(222 47% 14%)' };
const accentColor = { color: 'hsl(198 93% 59%)' };
const tableBorder = { borderColor: 'hsl(222 47% 20%)' };

const BlogPracticeJournal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Why Every Musician Needs a Practice Journal | Noteshare';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Writing about your practice may be the fastest way to improve. Learn how a simple practice journal builds focus, reveals progress, and transforms your sessions.');
    }
    window.scrollTo(0, 0);
  }, []);

  const handleCTA = () => {
    window.scrollTo(0, 0);
    navigate(user ? '/' : '/auth?from=blog');
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
          <p className="text-xs uppercase tracking-wider font-medium mb-4" style={accentColor}>
            Matteo, Musician and Noteshare Developer &nbsp;|&nbsp; Feb 26
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-6" style={headingColor}>
            Why Every Musician Needs a Practice Journal
          </h1>
          <p className="text-xl md:text-2xl leading-relaxed" style={textColor}>
            Writing about your practice may be the fastest way to improve your playing.
          </p>
        </div>
      </section>

      {/* Hero image */}
      <section className="px-6 md:px-12 pb-14">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl overflow-hidden border" style={tableBorder}>
            <img src={blogHeroImage} alt="Practice journal beside a guitar" className="w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Most Practice Is Forgotten */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Most Practice Is Forgotten</h2>
          <p className="leading-relaxed mb-4" style={textColor}>
            A typical practice session follows a familiar arc: you sit down, work through a few exercises, play through a piece, and stop when time runs out. It feels productive in the moment, but by the next day, most of the details have already slipped away.
          </p>
          <p className="leading-relaxed mb-6" style={textColor}>
            You try to remember what tempo you reached, which section gave you trouble, what actually improved, and what you'd planned to work on next. Usually, that information is gone.
          </p>
          <p className="leading-relaxed mb-6" style={textColor}>
            Learning research consistently shows that reflection and documentation dramatically improve skill development. When musicians track what they practice and how each session goes, they make better decisions moving forward and progress noticeably faster.
          </p>
          <p className="leading-relaxed" style={textColor}>
            A practice journal transforms practice from scattered effort into a structured feedback loop, one where every session builds meaningfully on the last.
          </p>
        </div>
      </section>

      {/* What a Practice Journal Actually Does */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>What a Practice Journal Actually Does</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            At its core, a practice journal is simply a record of your sessions. But its impact runs deeper than it might seem at first. Keeping one helps musicians:
          </p>
          <ul className="space-y-2 mb-6" style={textColor}>
            {[
              'Stay focused and intentional during each session',
              'Remember what was covered previously so nothing falls through the cracks',
              'Identify weaknesses and recurring trouble spots more clearly',
              'Track improvement across weeks and months in a way that feels tangible',
              'Build the kind of consistency that compounds into real progress',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={accentColor} />
                {item}
              </li>
            ))}
          </ul>
          <p className="leading-relaxed" style={textColor}>
            Instead of guessing what to practice each day, you start building each session on the foundation of the last one.
          </p>
        </div>
      </section>

      {/* The Science Behind Reflective Practice */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>The Science Behind Reflective Practice</h2>
          <p className="leading-relaxed mb-4" style={textColor}>
            Educational researchers call this process <em>metacognition</em>: essentially, thinking about how you learn. It sounds abstract, but it has very concrete effects on skill development.
          </p>
          <p className="leading-relaxed mb-6" style={textColor}>
            Studies in music education consistently show that musicians who reflect on their practice develop stronger problem-solving skills and improve faster than those who simply repeat material without pausing to think about what's working and what isn't.
          </p>
          <p className="leading-relaxed mb-4" style={textColor}>
            When you write about your practice, you naturally start asking better questions, the kind that lead to breakthroughs:
          </p>
          <ul className="space-y-2 mb-4" style={textColor}>
            {[
              'Why did this section feel so difficult today?',
              'What specific technique caused the mistake?',
              'What should I try differently tomorrow?',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'hsl(198 93% 59%)' }} />
                {item}
              </li>
            ))}
          </ul>
          <p className="leading-relaxed" style={textColor}>
            These small insights might seem minor in isolation, but they compound powerfully over time.
          </p>
        </div>
      </section>

      {/* What to Write */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>What to Write in a Practice Journal</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            A practice journal doesn't need to be complicated. In fact, the most effective ones are simple and quick to fill out. A good entry usually covers five things.
          </p>

          {/* Journal entry components */}
          {[
            {
              title: 'Date',
              body: 'Tracking dates lets you see your consistency at a glance and build practice streaks over time. Consistency is one of the strongest predictors of musical improvement, and simply seeing a chain of dates on the page can be surprisingly motivating.',
            },
            {
              title: 'Duration',
              body: 'Recording how long you practiced gives you a clearer, more honest sense of effort over time. Many musicians tend to either underestimate or overestimate how much time they actually spend, and having a written record keeps you grounded.',
            },
            {
              title: 'Focus Areas',
              body: 'Write down the main things you worked on: major scale patterns, chord transitions, sight reading, the verse section of a particular song, rhythm exercises. This simple act helps ensure your sessions stay intentional rather than drifting.',
            },
            {
              title: 'Observations',
              body: 'This is the most valuable part of any journal entry. Jot down a few honest notes about what happened during practice: struggling with timing in bar 12, feeling left-hand tension during fast passages, a scale sounding clean at 80 bpm but falling apart at 100. These notes reveal patterns that are remarkably easy to miss without writing them down.',
            },
            {
              title: 'Next Session Goal',
              body: 'End each entry by deciding what comes next. For example, "Practice the chorus section slowly at 70 bpm and focus on clean chord transitions." This small step removes the decision-making friction when your next practice session begins, so you can sit down and start working immediately.',
            },
          ].map(({ title, body }, i) => (
            <div key={i} className="mb-8">
              <h3 className="text-lg font-semibold mb-2" style={headingColor}>{title}</h3>
              <p className="leading-relaxed text-sm" style={textColor}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example Entry */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Example Practice Journal Entry</h2>
          <div className="rounded-lg overflow-hidden border" style={tableBorder}>
            <div className="divide-y" style={{ ...cardBg, ...tableBorder }}>
              {[
                { label: 'Date', value: 'March 12' },
                { label: 'Duration', value: '50 minutes' },
                { label: 'Focus areas', value: 'Scale exercises, chord transitions, bridge section of song' },
                { label: 'Observations', value: 'Bridge rhythm still uneven. Sounds noticeably better when practicing at 75 bpm.' },
                { label: 'Next session', value: 'Practice bridge with metronome and isolate bars 16 to 20.' },
              ].map(({ label, value }, i) => (
                <div key={i} className="px-5 py-3 flex gap-4" style={{ borderColor: 'hsl(222 47% 20%)' }}>
                  <span className="text-xs font-medium w-24 shrink-0" style={headingColor}>{label}</span>
                  <span className="text-sm" style={textColor}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm mt-4" style={textColor}>
            Entries like this take less than two minutes to write, but they provide enormous long-term value by creating a clear thread between your sessions.
          </p>
        </div>
      </section>

      {/* Why Journaling Makes Practice More Effective */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Why Journaling Makes Practice More Effective</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            Practice journals improve learning in several interconnected ways.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'They Force Intentional Practice',
                body: 'When you know you\'ll be writing down what you practiced, you naturally become more focused. Instead of wandering through material randomly, you practice with real purpose, and that shift alone can transform a session.',
              },
              {
                title: 'They Reveal Progress',
                body: 'Musical improvement is often so gradual that it\'s hard to feel in the moment. A journal creates a tangible record that shows how far you\'ve come, and seeing that progress is one of the strongest motivators for continuing to show up.',
              },
              {
                title: 'They Prevent Repeating Mistakes',
                body: 'Without written notes, musicians often fall into the same practice patterns session after session without fixing the underlying issue. A journal helps you spot recurring problems so you can address them directly instead of just working around them.',
              },
              {
                title: 'They Build Consistency',
                body: 'Writing down each session creates a gentle sense of accountability. Many musicians find that simply tracking their practice, seeing the streak grow, increases how often they sit down to play.',
              },
            ].map(({ title, body }, i) => (
              <div key={i} className="rounded-lg p-5" style={cardBg}>
                <p className="text-sm font-medium mb-3" style={headingColor}>{title}</p>
                <p className="text-xs leading-relaxed" style={textColor}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Paper vs Digital */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Paper Journal vs Digital Practice Tracking</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            Both approaches work well, and the best system is simply the one you'll actually use consistently. A notebook is simple and accessible, and there's something satisfying about writing by hand. But digital tools offer some meaningful advantages that are hard to replicate on paper:
          </p>
          <ul className="space-y-2 mb-4" style={textColor}>
            {[
              'Automatic practice streak tracking that keeps you motivated',
              'Searchable notes so you can find past observations instantly',
              'Easy organization of sessions by date, project, or focus area',
              'The ability to attach audio recordings captured during practice',
              'Long-term progress visualization that reveals patterns over months',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={accentColor} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Getting Started Today</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            You can start a practice journal in less than five minutes. After your next session, simply write down:
          </p>
          <div className="rounded-lg p-5 mb-6" style={cardBg}>
            <ol className="space-y-2" style={textColor}>
              {[
                'The date',
                'How long you practiced',
                'What you worked on',
                'One honest observation',
                'One goal for tomorrow',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ border: '1px solid hsl(198 93% 59% / 0.3)', color: 'hsl(198 93% 59%)' }}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <p className="leading-relaxed" style={textColor}>
            That small habit can completely change how you approach practice. Over time, your journal becomes a detailed map of your musical development — something you can look back on and feel genuinely proud of.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-xl p-8 sm:p-12" style={cardBg}>
            <BookOpen className="w-8 h-8 mx-auto mb-4" style={accentColor} />
            <h2 className="text-xl sm:text-2xl font-semibold mb-3" style={headingColor}>
              Practice Smarter With Noteshare
            </h2>
            <p className="text-sm mb-4 max-w-md mx-auto leading-relaxed" style={textColor}>
              Noteshare was built to support structured practice and reflection. It gives musicians a dedicated space to log sessions, track consistency, and capture ideas during practice.
            </p>
            <ul className="space-y-2 mb-6 text-left max-w-sm mx-auto" style={textColor}>
              {[
                'Log practice sessions quickly',
                'Write reflections after playing',
                'Track consistency and streaks',
                'Capture audio recordings',
                'Review your musical progress over time',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={accentColor} />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/25"
              onClick={handleCTA}
            >
              Start tracking your practice
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Common Questions About Practice Journals</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Do professional musicians keep practice journals?',
                a: 'Many advanced musicians track their practice in some form — whether in a notebook, an app, or even voice notes. It helps organize technical work and monitor long-term progress in a way that memory alone can\'t match.',
              },
              {
                q: 'How long should a journal entry be?',
                a: 'Short entries are best. A sentence or two of observations is usually more than enough. The goal is to capture what matters without turning journaling into a chore.',
              },
              {
                q: 'Should beginners track their practice?',
                a: 'Absolutely — beginners often benefit the most because journaling builds strong, intentional practice habits from the very start, before bad patterns have a chance to set in.',
              },
              {
                q: 'What if I miss a day?',
                a: 'Simply pick up where you left off. The goal is consistency over time, not perfection. A missed day doesn\'t erase the value of every entry that came before it.',
              },
            ].map(({ q, a }, i) => (
              <div key={i} className="rounded-lg p-5" style={cardBg}>
                <div className="flex items-start gap-3 mb-2">
                  <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" style={accentColor} />
                  <p className="text-sm font-medium" style={headingColor}>{q}</p>
                </div>
                <p className="text-sm leading-relaxed pl-7" style={textColor}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <p className="leading-relaxed mb-2" style={textColor}>
            Musical progress rarely happens by accident.
          </p>
          <p className="leading-relaxed mb-2" style={textColor}>
            It happens when practice becomes intentional, consistent, and reflective.
          </p>
          <p className="text-lg font-medium" style={headingColor}>
            A practice journal is one of the simplest tools that makes that possible.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 md:px-12 text-center" style={{ borderTop: '1px solid hsl(222 47% 20%)' }}>
        <p className="text-xs flex flex-wrap justify-center gap-2" style={textColor}>
          <span className="font-medium" style={headingColor}>Noteshare — Practice Smarter</span>
          <span>—</span>
          <span>Contact: notesharemusic@gmail.com</span>
          <span>—</span>
          <span>© 2026 Noteshare</span>
        </p>
      </footer>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'Why Every Musician Needs a Practice Journal',
            description: 'Writing about your practice may be the fastest way to improve your playing.',
            author: { '@type': 'Organization', name: 'Noteshare' },
            publisher: { '@type': 'Organization', name: 'Noteshare' },
            datePublished: '2026-03-12',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': 'https://jazz-scene-alive.lovable.app/blog/practice-journal',
            },
          }),
        }}
      />
    </div>
  );
};

export default BlogPracticeJournal;
