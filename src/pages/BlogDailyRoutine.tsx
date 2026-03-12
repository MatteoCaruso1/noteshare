import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Music, Lightbulb, BookOpen, Target, CheckCircle2, ArrowLeft } from 'lucide-react';
import blogHeroImage from '@/assets/blog-daily-routine.jpg';

const h2Style = 'text-2xl sm:text-3xl font-semibold tracking-tight leading-tight mb-6';
const textColor = { color: 'hsl(215 20% 65%)' };
const headingColor = { color: 'hsl(210 40% 98%)' };
const cardBg = { background: 'hsl(222 47% 14%)' };
const accentColor = { color: 'hsl(198 93% 59%)' };
const tableBorder = { borderColor: 'hsl(222 47% 20%)' };

const BlogDailyRoutine = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Build the Perfect Daily Music Practice Routine | Noteshare';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'A structured 60-minute daily practice routine for musicians. Research-backed approach covering warmup, technique, repertoire, and reflection.');
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
            Matteo, Musician and Noteshare Developer &nbsp;|&nbsp; Mar 5
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] mb-6" style={headingColor}>
            Build the Perfect Daily Music Practice Routine
          </h1>
          <p className="text-xl md:text-2xl leading-relaxed" style={textColor}>
            Why some practice routines accelerate progress while others lead to frustration.
          </p>
        </div>
      </section>

      {/* Hero image */}
      <section className="px-6 md:px-12 pb-14">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl overflow-hidden border" style={tableBorder}>
            <img src={blogHeroImage} alt="Daily music practice routine" className="w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Most Musicians Practice Without a System */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Most Musicians Practice Without a System</h2>
          <p className="leading-relaxed mb-4" style={textColor}>
            A common pattern among beginners is simple: pick up the instrument, play a few songs, maybe run through scales, and stop when time runs out.
          </p>
          <p className="leading-relaxed mb-6" style={textColor}>
            It feels productive, but improvement is often slow.
          </p>
          <p className="leading-relaxed mb-6" style={textColor}>
            Research in music education and cognitive psychology shows that unstructured repetition produces weaker skill development than targeted practice. Studies from Anders Ericsson's work on deliberate practice and research from institutions like Florida State University consistently show that musicians who use structured routines improve faster and retain skills longer.
          </p>
          <p className="text-sm font-medium mb-3" style={headingColor}>Common issues beginners run into:</p>
          <ul className="space-y-2 mb-8" style={textColor}>
            {[
              'Sitting down to practice without a clear focus',
              'Spending most of the time playing songs already learned',
              'Ignoring technical weaknesses',
              'Practicing inconsistently across days',
              'Ending sessions without reflecting on progress',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'hsl(198 93% 59%)' }} />
                {item}
              </li>
            ))}
          </ul>
          <p className="leading-relaxed mb-2" style={textColor}>
            A simple daily routine solves most of these problems.
          </p>
          <p className="leading-relaxed" style={textColor}>
            Structure reduces decision fatigue, ensures important skills get attention, and makes progress easier to measure.
          </p>
        </div>
      </section>

      {/* What Effective Daily Practice Looks Like */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>What Effective Daily Practice Actually Looks Like</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            Most productive sessions include four core components:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { icon: Music, label: 'Warmup' },
              { icon: Target, label: 'Technical development' },
              { icon: BookOpen, label: 'Repertoire or song work' },
              { icon: Lightbulb, label: 'Reflection and review' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="rounded-lg p-4 text-center" style={cardBg}>
                <Icon className="w-5 h-5 mx-auto mb-2" style={accentColor} />
                <p className="text-xs font-medium" style={headingColor}>{label}</p>
              </div>
            ))}
          </div>
          <p className="leading-relaxed mb-2" style={textColor}>
            Each section targets a different part of musical development. Instead of randomly practicing, you move through a structured progression.
          </p>
          <p className="leading-relaxed" style={textColor}>
            Here is a practical example of a 60-minute daily routine that works well for beginners.
          </p>
        </div>
      </section>

      {/* Routine Block: Warmup */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <RoutineBlock
            duration="10 Minutes"
            title="Warmup"
            description="Warmups prepare both the brain and the hands. Neuromuscular research shows that gradually increasing movement complexity improves coordination and reduces mistakes later in practice."
            items={[
              'Slow scales',
              'Finger independence exercises',
              'Long tones for wind instruments',
              'Simple chord transitions',
              'Rhythm clapping with a metronome',
            ]}
            tip="Keep warmups slow and controlled. The goal is accuracy, not speed."
          />
        </div>
      </section>

      {/* Routine Block: Technique */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <RoutineBlock
            duration="15 Minutes"
            title="Technique"
            description="This section targets the mechanical skills of your instrument. Technical practice strengthens the motor patterns needed for clean performance."
            items={[
              'Scale patterns',
              'Arpeggios',
              'Picking or bowing patterns',
              'Chord transitions',
              'Rhythm exercises',
              'Sight reading',
            ]}
          />
          <div className="mt-6 rounded-lg p-5" style={cardBg}>
            <p className="text-sm font-medium mb-3" style={headingColor}>Tips that dramatically increase effectiveness:</p>
            <ul className="space-y-2" style={textColor}>
              {[
                'Use a metronome',
                'Start slower than you think necessary',
                'Increase tempo gradually',
                'Focus on precision rather than speed',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={accentColor} />
                  {tip}
                </li>
              ))}
            </ul>
            <p className="text-sm mt-4" style={textColor}>
              Small improvements in technique compound quickly over weeks of consistent practice.
            </p>
          </div>
        </div>
      </section>

      {/* Routine Block: Repertoire */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <RoutineBlock
            duration="25 Minutes"
            title="Repertoire"
            description="This is where you apply technique to actual music. Instead of playing a full piece repeatedly, isolate difficult sections. Research on motor learning shows that chunking small sections leads to faster mastery than full repetitions."
            items={[]}
          />
          <div className="mt-6 rounded-lg p-5" style={cardBg}>
            <p className="text-sm font-medium mb-3" style={headingColor}>Try this approach:</p>
            <ol className="space-y-2" style={textColor}>
              {[
                'Identify the hardest 2 to 4 bars',
                'Slow them down',
                'Repeat until mistakes disappear',
                'Gradually increase tempo',
                'Reinsert the section into the full piece',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ ...cardBg, border: '1px solid hsl(198 93% 59% / 0.3)', color: 'hsl(198 93% 59%)' }}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="text-sm mt-4" style={textColor}>
              This prevents reinforcing mistakes and makes practice more efficient.
            </p>
          </div>
        </div>
      </section>

      {/* Routine Block: Exploration */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <RoutineBlock
            duration="5 to 10 Minutes"
            title="Exploration or Creativity"
            description="Musical development is not only technical. Creative play strengthens musical intuition and keeps practice engaging."
            items={[
              'Improvisation',
              'Writing melodies',
              'Experimenting with new sounds',
              'Playing along with recordings',
              'Transcribing a short phrase by ear',
            ]}
            tip="Even a few minutes of exploration builds listening skills and musical expression."
          />
        </div>
      </section>

      {/* Routine Block: Reflection */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <RoutineBlock
            duration="5 Minutes"
            title="Reflection"
            description="Reflection is one of the most overlooked parts of practice. Research in learning science shows that self-reflection improves retention and guides future improvement."
            items={[
              'What improved today',
              'What still feels difficult',
              'What you will focus on tomorrow',
            ]}
          />
          {/* Example reflection table */}
          <div className="mt-6 rounded-lg overflow-hidden border" style={tableBorder}>
            <div className="px-5 py-3 border-b" style={{ ...tableBorder, ...cardBg }}>
              <p className="text-xs font-medium uppercase tracking-wider" style={accentColor}>Example practice reflection</p>
            </div>
            <div className="divide-y" style={{ ...cardBg, ...tableBorder }}>
              {[
                { label: 'Date', value: 'March 10' },
                { label: 'Focus', value: 'Major scale patterns, chord transitions, verse section of song' },
                { label: 'Observation', value: 'Chord switch between G and C still inconsistent at 90 bpm' },
                { label: 'Next session', value: 'Practice transition slowly at 70 bpm with metronome' },
              ].map(({ label, value }, i) => (
                <div key={i} className="px-5 py-3 flex gap-4" style={{ borderColor: 'hsl(222 47% 20%)' }}>
                  <span className="text-xs font-medium w-24 shrink-0" style={headingColor}>{label}</span>
                  <span className="text-sm" style={textColor}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm mt-4" style={textColor}>
            Over time these notes become a powerful record of progress.
          </p>
        </div>
      </section>

      {/* Ideal Practice Duration */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>The Ideal Practice Duration for Beginners</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            Long sessions are not required. Consistency matters far more than duration.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { time: '20 to 30 min/day', desc: 'Brand new players' },
              { time: '45 to 60 min/day', desc: 'After the first few months' },
              { time: '5 days/week', desc: 'Better than 1 long weekend session' },
            ].map(({ time, desc }, i) => (
              <div key={i} className="rounded-lg p-4 text-center" style={cardBg}>
                <p className="text-lg font-semibold mb-1" style={accentColor}>{time}</p>
                <p className="text-xs" style={textColor}>{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm" style={textColor}>
            Daily repetition strengthens neural pathways involved in motor control and timing. Practicing five days per week is significantly more effective than one long session on the weekend.
          </p>
        </div>
      </section>

      {/* Small Habits That Multiply Progress */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Small Habits That Multiply Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Use a metronome',
                points: ['Builds rhythmic accuracy', 'Prevents rushing', 'Makes progress measurable'],
              },
              {
                title: 'Record yourself occasionally',
                points: ['Reveals timing issues', 'Improves self-awareness', 'Tracks improvement over time'],
              },
              {
                title: 'Practice slower than performance speed',
                points: ['Reduces mistakes', 'Builds clean muscle memory', 'Improves control'],
              },
              {
                title: 'Focus on one improvement per session',
                points: ['Prevents cognitive overload', 'Leads to faster skill acquisition'],
              },
            ].map(({ title, points }, i) => (
              <div key={i} className="rounded-lg p-5" style={cardBg}>
                <p className="text-sm font-medium mb-3" style={headingColor}>{title}</p>
                <ul className="space-y-1.5">
                  {points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs leading-relaxed" style={textColor}>
                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'hsl(198 93% 59%)' }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Beginner Routine */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className={h2Style} style={headingColor}>Example Beginner Practice Routine</h2>
          <p className="leading-relaxed mb-6" style={textColor}>
            Here is a simple routine you can follow immediately.
          </p>
          <div className="rounded-lg overflow-hidden border" style={tableBorder}>
            <div className="px-5 py-3 border-b" style={{ ...tableBorder, ...cardBg }}>
              <p className="text-xs font-medium uppercase tracking-wider" style={accentColor}>Daily 45-Minute Routine</p>
            </div>
            <div className="divide-y" style={{ ...cardBg, ...tableBorder }}>
              {[
                { time: '5 min', activity: 'Warmup scales' },
                { time: '10 min', activity: 'Technique exercise' },
                { time: '20 min', activity: 'Work on one song section' },
                { time: '5 min', activity: 'Improvisation or ear training' },
                { time: '5 min', activity: 'Practice notes and reflection' },
              ].map(({ time, activity }, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-4" style={{ borderColor: 'hsl(222 47% 20%)' }}>
                  <span className="text-sm font-medium w-16 shrink-0" style={accentColor}>{time}</span>
                  <span className="text-sm" style={textColor}>{activity}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm mt-6 leading-relaxed" style={textColor}>
            This structure ensures every session develops physical technique, musical understanding, repertoire, and awareness of progress.
          </p>
        </div>
      </section>


      {/* CTA */}
      <section className="py-14 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-xl p-8 sm:p-12" style={cardBg}>
            <Clock className="w-8 h-8 mx-auto mb-4" style={accentColor} />
            <h2 className="text-xl sm:text-2xl font-semibold mb-3" style={headingColor}>
              Start tracking your practice
            </h2>
            <p className="text-sm mb-6 max-w-md mx-auto" style={textColor}>
              Noteshare helps you capture, organize, and reflect on every practice session so you can build the routine that works for you.
            </p>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/25"
              onClick={handleCTA}
            >
              Start practicing
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 md:px-12 text-center" style={{ borderTop: '1px solid hsl(222 47% 20%)' }}>
        <p className="text-xs flex flex-wrap justify-center gap-2" style={textColor}>
          <span className="font-medium" style={headingColor}>Noteshare</span>
          <span>·</span>
          <span>Practice Smarter</span>
          <span>·</span>
          <span>Contact: notesharemusic@gmail.com</span>
          <span>·</span>
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
            headline: 'Build the Perfect Daily Music Practice Routine',
            description: 'A structured 60-minute daily practice routine for musicians covering warmup, technique, repertoire, and reflection.',
            author: { '@type': 'Organization', name: 'Noteshare' },
            publisher: { '@type': 'Organization', name: 'Noteshare' },
            datePublished: '2026-03-12',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': 'https://jazz-scene-alive.lovable.app/blog/daily-practice-routine',
            },
          }),
        }}
      />
    </div>
  );
};

/* Reusable routine block component */
function RoutineBlock({
  duration,
  title,
  description,
  items,
  tip,
}: {
  duration: string;
  title: string;
  description: string;
  items: string[];
  tip?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: 'hsl(198 93% 59% / 0.15)', color: 'hsl(198 93% 59%)' }}>
          {duration}
        </span>
        <h3 className="text-xl font-semibold" style={{ color: 'hsl(210 40% 98%)' }}>{title}</h3>
      </div>
      <p className="leading-relaxed mb-4" style={{ color: 'hsl(215 20% 65%)' }}>{description}</p>
      {items.length > 0 && (
        <ul className="space-y-2 mb-4" style={{ color: 'hsl(215 20% 65%)' }}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'hsl(198 93% 59%)' }} />
              {item}
            </li>
          ))}
        </ul>
      )}
      {tip && (
        <p className="text-sm italic" style={{ color: 'hsl(215 20% 55%)' }}>{tip}</p>
      )}
    </div>
  );
}

export default BlogDailyRoutine;
