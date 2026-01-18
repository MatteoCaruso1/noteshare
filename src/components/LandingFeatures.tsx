import { useEffect, useRef, useState } from 'react';
import landingFocus from '@/assets/landing-focus.png';
import landingSessions from '@/assets/landing-sessions.png';
import landingProgress from '@/assets/landing-progress.png';
import landingFriends from '@/assets/landing-friends.png';

const features = [
  {
    title: 'Organize your focus areas',
    image: landingFocus,
    alt: 'Practice Board showing exercises and songs to focus on',
    cropTop: false,
  },
  {
    title: 'Log practice sessions and record your playing',
    image: landingSessions,
    alt: 'Practice session with audio recording and comments',
    cropTop: false,
  },
  {
    title: 'Track your progress over time',
    image: landingProgress,
    alt: 'Progress charts showing practice minutes and streak',
    cropTop: false,
  },
  {
    title: 'See what your friends are working on',
    image: landingFriends,
    alt: 'Friends practice feed showing their sessions',
    cropTop: false,
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
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
    <div
      ref={ref}
      className={`flex items-center gap-4 md:gap-16 transition-all duration-700 ease-out ${
        isRight ? 'justify-end flex-row-reverse' : 'justify-start flex-row'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <h2 className={`text-lg sm:text-2xl md:text-3xl font-semibold text-foreground max-w-[180px] sm:max-w-[320px] ${
        isRight ? 'text-right' : 'text-left'
      }`}>
        {feature.title}
      </h2>
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-3xl opacity-50" />
        <div 
          className={`relative rounded-lg overflow-hidden shadow-xl shadow-black/25 border border-border/50 w-full max-w-xl ${
            feature.cropTop ? 'h-[220px]' : ''
          }`}
        >
          <img
            src={feature.image}
            alt={feature.alt}
            className={`w-full ${
              feature.cropTop ? 'object-cover object-[center_58%]' : 'h-auto'
            }`}
            style={feature.cropTop ? { height: '420px', maxWidth: 'none', width: '100%' } : undefined}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section className="bg-transparent py-12 px-4 sm:px-8 md:px-16 lg:px-24 w-full mt-2">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {features.map((feature, index) => (
          <FeatureCard key={index} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
}
