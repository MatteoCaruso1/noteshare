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
    <section className="bg-background py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto space-y-32">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-8"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground text-center max-w-2xl">
              {feature.title}
            </h2>
            <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl shadow-black/20 border border-border/50">
              <img
                src={feature.image}
                alt={feature.alt}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
