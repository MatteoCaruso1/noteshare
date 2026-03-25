import { useEffect, useRef, useState } from 'react';
import landingFocus from '@/assets/landing-focus.png';
import landingSessions from '@/assets/landing-sessions.png';
import landingProgress from '@/assets/landing-progress.png';
import landingFriends from '@/assets/landing-friends.png';

const features = [
  {
    title: 'Track Practice Sessions',
    description: 'Start a timed session, record audio or video of your playing, and attach notes. Each session is saved to your timeline with duration and date. This loop is proven to improve your practice quality.',
    image: landingSessions,
    alt: 'Noteshare practice session screen showing a timed session with audio recording controls, attached notes, and a comment thread between musicians',
    cropTop: false,
    width: 979,
    height: 631,
  },
  {
    title: 'Reflect With Practice Notes',
    description: 'Write text notes, tag focus areas, and organize entries by topic. Notes are stored chronologically so you can review what you worked on and when. This helps you learn concepts faster.',
    image: landingFocus,
    alt: 'Noteshare daily focus view listing practice topics such as scales, sight-reading, and repertoire pieces with editable text fields',
    cropTop: false,
    width: 1225,
    height: 464,
  },
  {
    title: 'Measure Progress With Analytics',
    description: 'View total practice minutes, daily streaks, and session frequency over weeks and months. This truly strengthens your motivation to practice and helps maintain accountability.',
    image: landingProgress,
    alt: 'Noteshare analytics dashboard displaying a weekly practice minutes bar chart, current streak count, and a calendar heatmap of practice days',
    cropTop: false,
    width: 1075,
    height: 488,
  },
  {
    title: "Practice with Friends",
    description: 'Connect with other musicians to see their practice activity and learn from what they are working on. Share notes selectively with your friends and watch how this increases your practice motivation and pushes you to become a better player.',
    image: landingFriends,
    alt: 'Noteshare friends feed showing practice session summaries from connected musicians with timestamps and session durations',
    cropTop: false,
    width: 895,
    height: 649,
  },
];

// Preload all feature images on mount
function usePreloadImages() {
  useEffect(() => {
    features.forEach((feature) => {
      const img = new Image();
      img.src = feature.image;
    });
  }, []);
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      className={`flex items-center gap-4 md:gap-16 lg:gap-20 xl:gap-24 transition-all duration-700 ease-out ${
        isRight ? 'justify-end flex-row-reverse' : 'justify-start flex-row'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <div className={`max-w-[225px] sm:max-w-[320px] lg:max-w-[400px] xl:max-w-[480px] ${
        isRight ? 'text-right' : 'text-left'
      }`}>
        <h2
          id={`feature-heading-${index}`}
          className="text-base sm:text-xl md:text-2xl lg:text-3xl font-semibold text-foreground"
        >
          {feature.title}
        </h2>
        <p className="mt-2 text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-3xl opacity-50" />
        <div 
          className={`relative rounded-lg overflow-hidden shadow-xl shadow-black/25 border border-border/50 w-full max-w-xl lg:max-w-2xl xl:max-w-3xl ${
            feature.cropTop ? 'h-[220px]' : ''
          }`}
        >
          <img
            src={feature.image}
            alt={feature.alt}
            width={feature.width}
            height={feature.height}
            className={`w-full transition-opacity duration-500 ease-out ${
              feature.cropTop ? 'object-cover object-[center_58%]' : 'h-auto'
            } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={feature.cropTop ? { height: '420px', maxWidth: 'none', width: '100%' } : undefined}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      </div>
    </section>
  );
}

export function LandingFeatures() {
  // Preload images when component mounts
  usePreloadImages();

  return (
    <section className="relative rounded-t-3xl py-8 md:py-12 px-4 sm:px-8 md:px-16 lg:px-32 xl:px-40 w-full mt-0 md:mt-2 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(210 45% 22%) 40%, hsl(210 45% 22%) 80%, hsl(var(--background)) 100%)',
      }}
    >
      {/* Top transition fade */}
      <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, transparent 100%)' }}
      />
      {/* Subtle accent glow behind features */}
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="relative w-full space-y-8">
        {features.map((feature, index) => (
          <FeatureCard key={index} feature={feature} index={index} />
        ))}
      </div>
      {/* Bottom transition fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(0deg, hsl(var(--background)) 0%, transparent 100%)' }}
      />
    </section>
  );
}
