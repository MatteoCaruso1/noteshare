export function LandingTestimonial() {
  return (
    <section className="bg-background py-24 px-6 md:px-12 lg:px-24 border-t border-border/30">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground leading-tight max-w-md">
          Empowering the world's best musicians
        </h2>
        <div className="max-w-lg">
          <p className="text-gray-500 text-lg leading-relaxed">
            "Using Noteshare has greatly improved my musical life. The quality of my practice has skyrocketed"
            <span className="block mt-3 text-muted-foreground text-base">
              Toronto Jazz Pianist
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
