import { useEffect, useRef, useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MarketingCTA } from './MarketingCTA';
import landingFocus from '@/assets/landing-focus.webp';
import landingSessions from '@/assets/landing-sessions.webp';
import landingProgress from '@/assets/landing-progress.webp';
import landingFriends from '@/assets/landing-friends.webp';
import landingMusicalTraining from '@/assets/landing-musical-training.webp';

const features = [
  {
    eyebrow: 'Core Feature',
    title: 'Track Practice Sessions',
    description: 'Start a timed session, record audio or video of your playing, and attach notes. Each session is saved to your timeline with duration and date. This loop is **proven to improve your practice quality**.',
    image: landingSessions,
    alt: 'Noteshare practice session screen showing a timed session with audio recording controls, attached notes, and a comment thread between musicians',
    cropTop: false,
    width: 979,
    height: 631,
  },
  {
    eyebrow: 'Insight',
    title: 'Reflect With Practice Notes',
    description: 'Write text notes, tag focus areas, and organize entries by topic. Notes are stored chronologically so you can **review what you worked on** and **learn faster**.',
    image: landingFocus,
    alt: 'Noteshare daily focus view listing practice topics such as scales, sight-reading, and repertoire pieces with editable text fields',
    cropTop: false,
    width: 1225,
    height: 464,
  },
  {
    eyebrow: 'The Payoff',
    title: 'Measure Progress With Analytics',
    description: 'View total practice minutes, daily streaks, and session frequency over weeks and months. See your **progress, trends, and improvement**, and stay accountable to your goals.',
    image: landingProgress,
    alt: 'Noteshare analytics dashboard displaying a weekly practice minutes bar chart, current streak count, and a calendar heatmap of practice days',
    cropTop: false,
    width: 1075,
    height: 488,
  },
  {
    eyebrow: 'Community',
    title: "Practice with Friends",
    description: 'Connect with other musicians to see their practice activity and learn from what they are working on. Share notes selectively with your friends and watch how this **increases your motivation** to practice.',
    image: landingFriends,
    alt: 'Noteshare friends feed showing practice session summaries from connected musicians with timestamps and session durations',
    cropTop: false,
    width: 895,
    height: 649,
  },
];

// Render description with **bold** support
function renderDescription(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-foreground/95 font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// Native lazy-loading on the <img> tags handles below-the-fold images.

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const displayDescription = useMemo(() => {
    if (!isMobile) return feature.description;
    const firstSentenceEnd = feature.description.indexOf('. ');
    if (firstSentenceEnd === -1) return feature.description;
    return feature.description.slice(0, firstSentenceEnd + 1);
  }, [isMobile, feature.description]);

  useEffect(() => {
    // On mobile, skip the fade-in animation entirely — show content immediately.
    // The IntersectionObserver + transform/opacity animations were causing
    // jank during fast scrolls combined with the heavy blurs and large images.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const isRight = index % 2 === 1;

  return (
    <section
      ref={ref}
      aria-labelledby={`feature-heading-${index}`}
      className={`flex items-center gap-4 md:gap-16 lg:gap-20 xl:gap-24 transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform] ${
        isRight ? 'justify-end flex-row-reverse' : 'justify-start flex-row'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ contain: 'layout style' }}
    >
      <div className={`max-w-[225px] sm:max-w-[320px] lg:max-w-[400px] xl:max-w-[480px] ${
        isRight ? 'text-right' : 'text-left'
      }`}>
        {feature.eyebrow && (
          <div className={`mb-3 flex ${isRight ? 'justify-end' : 'justify-start'}`}>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">
              {feature.eyebrow}
            </span>
          </div>
        )}
        <h2
          id={`feature-heading-${index}`}
          className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold text-foreground tracking-tight"
        >
          {feature.title}
        </h2>
        <p className="mt-3 text-xs sm:text-sm md:text-base text-muted-foreground/90 leading-relaxed">
          {renderDescription(displayDescription)}
        </p>
      </div>
      <div className="relative z-[12] group">
        {/* Layered glow */}
        <div className="hidden md:block absolute -inset-6 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-2xl md:blur-3xl rounded-3xl opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
        <div 
          className={`relative rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-border/60 w-full max-w-xl lg:max-w-2xl xl:max-w-3xl ring-1 ring-white/5 transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:shadow-primary/20 ${
            feature.cropTop ? 'h-[220px]' : ''
          }`}
        >
          <img
            src={feature.image}
            alt={feature.alt}
            width={feature.width}
            height={feature.height}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'low'}
            className={`w-full ${
              feature.cropTop ? 'object-cover object-[center_58%]' : 'h-auto'
            }`}
            style={feature.cropTop ? { height: '420px', maxWidth: 'none', width: '100%' } : undefined}
          />
        </div>
      </div>
    </section>
  );
}

export function LandingFeatures() {
  return (
    <section data-landing-divider className="relative py-8 md:py-12 px-4 sm:px-8 md:px-16 lg:px-32 xl:px-40 w-full mt-0 md:mt-2"
      style={{
        background: 'hsl(210 35% 18%)',
      }}
    >
      {/* Subtle accent glow behind features */}
      <div className="hidden md:block absolute top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[80px] md:blur-[160px] pointer-events-none" />
      <div className="relative w-full max-w-7xl mx-auto space-y-8">
        {features.map((feature, index) => (
          <FeatureCard key={index} feature={feature} index={index} />
        ))}

        {/* Repeated CTA + testimonial after features */}
        <div className="relative pt-12 md:pt-20 flex flex-col items-center text-center">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <blockquote className="max-w-2xl mx-auto text-base md:text-lg text-foreground/85 font-medium leading-relaxed">
            "Noteshare changed how I practice. I <span className="font-semibold text-foreground">wouldn't want to go back</span> to a world without it."
          </blockquote>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
            Jazz pianist, Toronto
          </p>
          <div className="mt-8 flex justify-center">
            <MarketingCTA variant="hero" className="justify-center" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground/70">
            No credit card required · Free to use
          </p>
        </div>
      </div>
    </section>
  );
}
