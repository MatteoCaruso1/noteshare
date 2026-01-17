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
    title: 'Log your sessions and record your playing',
    image: landingSessions,
    alt: 'Practice session with audio recording and comments',
    cropTop: false,
  },
  {
    title: 'Track your progress over time',
    image: landingProgress,
    alt: 'Progress charts showing practice minutes and streak',
    cropTop: true,
  },
  {
    title: 'See what friends are working on',
    image: landingFriends,
    alt: 'Friends practice feed showing their sessions',
    cropTop: false,
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState(0);
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

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = windowHeight / 2;
        const offset = (elementCenter - viewportCenter) * 0.08;
        setParallaxOffset(offset);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isRight = index % 2 === 1;

  return (
    <div
      ref={ref}
      className={`flex items-center gap-8 md:gap-16 transition-all duration-700 ease-out ${
        isRight ? 'justify-end flex-row-reverse' : 'justify-start flex-row'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <h2 className={`text-xl sm:text-2xl md:text-3xl font-semibold text-foreground max-w-[320px] ${
        isRight ? 'text-right' : 'text-left'
      }`}>
        {feature.title}
      </h2>
      <div 
        className={`rounded-lg overflow-hidden shadow-xl shadow-black/15 border border-border/50 w-full max-w-lg ${
          feature.cropTop ? 'h-[200px]' : ''
        }`}
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        <img
          src={feature.image}
          alt={feature.alt}
          className={`w-full h-auto ${
            feature.cropTop ? 'object-cover object-bottom' : ''
          }`}
          style={feature.cropTop ? { marginTop: '-45%' } : undefined}
          loading="lazy"
        />
      </div>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section className="bg-background py-12 px-4 sm:px-8 md:px-16 lg:px-24 w-full -mt-12">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {features.map((feature, index) => (
          <FeatureCard key={index} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
}
