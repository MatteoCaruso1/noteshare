import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, CheckCircle2, HelpCircle, Target, Eye, TrendingUp, Shield } from 'lucide-react';
import blogHeroImage from '@/assets/blog-piano-tracker.jpg';

const h2Style = 'text-2xl sm:text-3xl font-semibold tracking-tight leading-tight mb-6';
const textColor = { color: 'hsl(215 20% 65%)' };
const headingColor = { color: 'hsl(210 40% 98%)' };
const cardBg = { background: 'hsl(222 47% 14%)' };
const accentColor = { color: 'hsl(198 93% 59%)' };
const tableBorder = { borderColor: 'hsl(222 47% 20%)' };

const BlogPianoTracker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Best Piano Practice Tracker for 2026 | Noteshare';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Find the best piano practice tracker for 2026. Learn how tracking sessions builds consistency, reveals progress, and helps you improve faster at piano.');
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
            Matteo, Musician and Noteshare Developer &nbsp;|&nbsp; Mar 12
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-6" style={headingColor}>
            Best Piano Practice Tracker for 2026
          </h1>
          <p className="text-xl md:text-2xl leading-relaxed" style={textColor}>
            Why tracking your piano practice might be the easiest way to improve faster.
          </p>
        </div>
      </section>

      {/* Hero image */}
      <section className="px-6 md:px-12 pb-14">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl overflow-hidden border" style={tableBorder}>
            <img src={blogHeroImage} alt="Piano practice tracker on a tablet next to a keyboard" className="w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Most Pianists Don't Know How They Practice */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Most Pianists Don't Actually Know How They Practice</h2>
          <p className="leading-relaxed mb-4" style={textColor}>
            Ask a beginner pianist what they practiced last week and the answer is usually vague. Maybe a few scales, maybe part of a song, maybe whatever felt right that day. The details fade quickly, and that's the problem.
          </p>
          <p className="leading-relaxed mb-4" style={textColor}>
            Musical progress depends on two things, consistency and feedback, and both are difficult to maintain when your practice disappears the moment you walk away from the piano.
          </p>
          <p className="leading-relaxed mb-4" style={textColor}>
            Research in music education and skill acquisition consistently shows that musicians improve faster when they track what they practice. Recording sessions helps you notice patterns, identify weaknesses, and stay consistent over long stretches of time.
          </p>
          <p className="leading-relaxed" style={textColor}>
            In other words, tracking turns practice from something casual into something intentional. That's exactly where a piano practice tracker comes in.
          </p>
        </div>
      </section>

      {/* What Is a Piano Practice Tracker */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>What Is a Piano Practice Tracker</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            A piano practice tracker is a simple tool for recording your sessions so you can see what you worked on and how your playing improves over time. Instead of relying on memory, you log things like:
          </p>
          <ul className="space-y-2 mb-6" style={textColor}>
            {[
              'How long you practiced',
              'What exercises or techniques you worked on',
              'Which pieces you spent time with',
              'What improved during the session',
              'What needs attention next time',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'hsl(198 93% 59%)' }} />
                {item}
              </li>
            ))}
          </ul>
          <p className="leading-relaxed" style={textColor}>
            At first this might seem like a small habit, but over weeks and months it becomes incredibly valuable. Your tracker slowly builds a clear record of your progress, helping you understand exactly how your playing is evolving.
          </p>
        </div>
      </section>

      {/* Why Tracking Works */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Why Tracking Piano Practice Works</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            There are a few reasons practice tracking has such a powerful effect on learning.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                title: 'It Creates Accountability',
                body: 'When you track your sessions, practice stops being something vague like "I should probably practice today" and becomes measurable. Many musicians find that simply logging their practice increases how often they sit down at the piano. Seeing a streak of consistent sessions can be surprisingly motivating.',
              },
              {
                icon: Target,
                title: 'It Makes Practice More Intentional',
                body: 'Without a tracker, practice tends to drift toward whatever feels easiest in the moment. With one, you begin each session knowing what you covered yesterday and what needs improvement next. That small shift changes your entire approach and practice becomes focused rather than random.',
              },
              {
                icon: Eye,
                title: 'It Reveals Progress Over Time',
                body: 'Musical progress is often so gradual that day-to-day improvements are invisible. A tracker makes that progress visible. You might notice a scale that felt impossible two weeks ago now feels natural, or that sight reading is getting noticeably easier. Seeing those changes written down builds confidence.',
              },
              {
                icon: TrendingUp,
                title: 'It Helps You Identify Weaknesses',
                body: 'Patterns start to appear when you track consistently. Maybe certain chord transitions keep showing up in your notes, or rhythm is the recurring challenge across several pieces. Once those patterns become visible, you can target them directly in future sessions.',
              },
            ].map(({ icon: Icon, title, body }, i) => (
              <div key={i} className="rounded-lg p-5" style={cardBg}>
                <Icon className="w-5 h-5 mb-3" style={accentColor} />
                <p className="text-sm font-medium mb-3" style={headingColor}>{title}</p>
                <p className="text-xs leading-relaxed" style={textColor}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What to Look For */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>What to Look for in a Piano Practice Tracker</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            Not all trackers are the same. The best ones support both structure and reflection. Here are a few features that make a meaningful difference.
          </p>

          {[
            {
              title: 'Practice Session Logging',
              body: 'The foundation of any tracker is the ability to record sessions quickly. A good tracker should let you log the date, duration, focus areas, and notes from each session, and it should take less than a minute so it doesn\'t interrupt your routine.',
            },
            {
              title: 'Goal Setting',
              body: 'Tracking works best when it connects to clear goals. Whether it\'s playing a scale cleanly at 100 bpm, learning the first page of a new piece, or improving left-hand rhythm consistency, a good tracker keeps these goals visible so your practice stays aligned with them.',
            },
            {
              title: 'Progress Tracking',
              body: 'Over time, your practice history should reveal trends. Helpful metrics might include total practice time, weekly consistency, practice streaks, tempo improvements, and completed pieces. Seeing this data makes your improvement much easier to understand and appreciate.',
            },
            {
              title: 'Reflection and Notes',
              body: 'This is where the real learning happens. After each session, a short reflection captures insights while they\'re fresh. Things like "right hand fingering felt smoother today" or "measure 12 still uneven with metronome." These notes guide the next session and prevent repeating the same mistakes.',
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
          <h2 className={h2Style} style={headingColor}>Example Piano Practice Tracker Entry</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            A good practice entry should be quick and simple, something you can fill out in under a minute.
          </p>
          <div className="rounded-lg overflow-hidden border" style={tableBorder}>
            <div className="divide-y" style={{ ...cardBg, ...tableBorder }}>
              {[
                { label: 'Date', value: 'March 15' },
                { label: 'Duration', value: '45 minutes' },
                { label: 'Focus areas', value: 'C major scale, chord inversions, Chopin prelude section' },
                { label: 'Observations', value: 'Left hand rhythm improved when practicing slowly with metronome.' },
                { label: 'Next session', value: 'Continue prelude section and increase tempo gradually.' },
              ].map(({ label, value }, i) => (
                <div key={i} className="px-5 py-3 flex gap-4" style={{ borderColor: 'hsl(222 47% 20%)' }}>
                  <span className="text-xs font-medium w-24 shrink-0" style={headingColor}>{label}</span>
                  <span className="text-sm" style={textColor}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm mt-4" style={textColor}>
            Even short entries like this become incredibly useful when you look back after a few weeks and see how much ground you've covered.
          </p>
        </div>
      </section>

      {/* Paper vs Digital */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Paper vs Digital Piano Practice Trackers</h2>
          <p className="leading-relaxed mb-4" style={textColor}>
            Both approaches work well, and the right choice depends on your personal preference. A paper journal is simple and distraction-free, and many musicians genuinely enjoy the tactile experience of writing notes by hand and keeping a physical record.
          </p>
          <p className="leading-relaxed mb-6" style={textColor}>
            A digital tracker, on the other hand, adds a few meaningful advantages:
          </p>
          <ul className="space-y-2 mb-4" style={textColor}>
            {[
              'Automatic practice streaks that keep you motivated',
              'Easy organization of sessions by date or focus area',
              'Searchable notes so you can find past insights instantly',
              'Long-term practice statistics and visualizations',
              'The ability to capture audio recordings during practice',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={accentColor} />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm" style={textColor}>
            For many musicians, the convenience of digital tracking makes it easier to stay consistent, which is ultimately what matters most.
          </p>
        </div>
      </section>

      {/* CTA — Best Tracker for 2026 */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-xl p-8 sm:p-12" style={cardBg}>
            <BarChart3 className="w-8 h-8 mx-auto mb-4" style={accentColor} />
            <h2 className="text-xl sm:text-2xl font-semibold mb-3" style={headingColor}>
              The Best Piano Practice Tracker for 2026
            </h2>
            <p className="text-sm mb-4 max-w-md mx-auto leading-relaxed" style={textColor}>
              Noteshare is designed specifically for musicians who want a dedicated place to track their practice. Unlike generic note apps, it focuses on the workflow you actually use during and after sessions.
            </p>
            <ul className="space-y-2 mb-6 text-left max-w-sm mx-auto" style={textColor}>
              {[
                'Log piano practice sessions quickly',
                'Write reflections after each session',
                'Track consistency with streaks and stats',
                'Capture ideas or recordings while practicing',
                'Review your progress over time',
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

      {/* Getting Started */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Getting Started With Practice Tracking</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            Starting a piano practice tracker takes almost no effort. After your next session, write down:
          </p>
          <div className="rounded-lg p-5 mb-6" style={cardBg}>
            <ol className="space-y-2" style={textColor}>
              {[
                'The date',
                'How long you practiced',
                'What you worked on',
                'One thing that improved',
                'One thing to focus on tomorrow',
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
          <p className="leading-relaxed mb-4" style={textColor}>
            That small habit can transform how you approach practice. Over time, your tracker becomes something more than a log — it becomes a clear map of your musical progress.
          </p>
          <p className="leading-relaxed" style={textColor}>
            And when practice becomes visible and intentional, improvement tends to follow naturally.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Common Questions About Piano Practice Tracking</h2>
          <div className="space-y-6">
            {[
              {
                q: 'How long should piano practice sessions be?',
                a: 'Beginners often benefit from 30 to 60 minutes per day. Consistency matters far more than occasional marathon sessions — showing up regularly is what builds real skill.',
              },
              {
                q: 'Do professional pianists track their practice?',
                a: 'Many advanced musicians keep detailed notes about their sessions, especially when preparing for performances or working through complex repertoire. Tracking helps them stay organized and intentional.',
              },
              {
                q: 'Is a practice tracker useful for beginners?',
                a: 'Absolutely. Beginners often benefit the most because tracking builds strong, intentional practice habits from the very start — before less productive patterns have a chance to take hold.',
              },
              {
                q: 'What if I forget to log a session?',
                a: 'Just pick up again the next day. The goal is long-term consistency, not perfect records. A missed entry doesn\'t undo the value of everything you\'ve already captured.',
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
            Improving at piano rarely comes from sudden breakthroughs.
          </p>
          <p className="leading-relaxed mb-2" style={textColor}>
            It usually comes from hundreds of small, focused sessions that build on each other over time.
          </p>
          <p className="text-lg font-medium" style={headingColor}>
            A practice tracker simply helps make those sessions visible, intentional, and easier to build upon.
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
            headline: 'Best Piano Practice Tracker for 2026',
            description: 'Why tracking your piano practice might be the easiest way to improve faster.',
            author: { '@type': 'Person', name: 'Matteo' },
            publisher: { '@type': 'Organization', name: 'Noteshare' },
            datePublished: '2026-03-12',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': 'https://jazz-scene-alive.lovable.app/blog/piano-practice-tracker',
            },
          }),
        }}
      />
    </div>
  );
};

export default BlogPianoTracker;
