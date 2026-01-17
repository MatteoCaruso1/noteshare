import landingFocus from '@/assets/landing-focus.png';
import landingSessions from '@/assets/landing-sessions.png';
import landingProgress from '@/assets/landing-progress.png';
import landingFriends from '@/assets/landing-friends.png';

const features = [
  {
    title: 'Organize your focus areas',
    image: landingFocus,
    alt: 'Practice Board showing exercises and songs to focus on',
  },
  {
    title: 'Log your sessions and record your playing',
    image: landingSessions,
    alt: 'Practice session with audio recording and comments',
  },
  {
    title: 'Track your progress over time',
    image: landingProgress,
    alt: 'Progress charts showing practice minutes and streak',
  },
  {
    title: 'See what your friends are working on',
    image: landingFriends,
    alt: 'Friends practice feed showing their sessions',
  },
];

export function LandingFeatures() {
  return (
    <section className="bg-background py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto space-y-12">
        {features.map((feature, index) => {
          // Zig-zag pattern: 0,2 = left, 1,3 = right
          const isRight = index % 2 === 1;
          
          return (
            <div
              key={index}
              className={`flex flex-col gap-4 max-w-md ${
                isRight ? 'ml-auto' : 'mr-auto'
              }`}
            >
              <h2 className={`text-lg sm:text-xl font-semibold text-foreground ${
                isRight ? 'text-right' : 'text-left'
              }`}>
                {feature.title}
              </h2>
              <div className="rounded-lg overflow-hidden shadow-xl shadow-black/15 border border-border/50">
                <img
                  src={feature.image}
                  alt={feature.alt}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
