export function LandingTestimonial() {
  return (
    <>
      <section className="bg-transparent pt-6 pb-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground leading-tight max-w-md">
            Empowering the world's best musicians
          </h2>
          <div className="max-w-lg">
            <p className="text-gray-500 text-lg leading-relaxed">
              "Using Noteshare has greatly improved my musical life. The quality of my practice has skyrocketed"
              <span className="block mt-3 text-muted-foreground text-base text-right">
                Toronto Jazz Pianist
              </span>
            </p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-muted/80 backdrop-blur-sm py-3 px-6 md:px-12 lg:px-24 relative z-20">
        <div className="max-w-6xl mx-auto">
          <p className="text-muted-foreground text-xs italic">
            Built by Maruso
          </p>
        </div>
      </footer>
    </>
  );
}
