export function LandingTestimonial() {
  return (
    <>
      <section className="bg-transparent pt-6 pb-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground leading-tight max-w-md">
            Empowering the world's musicians
          </h2>
          <div className="max-w-lg">
            <p className="text-gray-500 text-base leading-relaxed">
              "Since using Noteshare, the quality of my practice has skyrocketed"
              <span className="block mt-3 text-muted-foreground text-sm text-right">
                Toronto Jazz Pianist
              </span>
            </p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-zinc-900 py-3 px-6 md:px-12 lg:px-24 relative z-20">
        <div className="max-w-6xl mx-auto">
          <p className="text-muted-foreground text-xs italic">
            Built by Maruso
          </p>
        </div>
      </footer>
    </>
  );
}
