export function LandingTestimonial() {
  return (
    <>
      {/* Empowering section - temporarily hidden
      <section className="bg-transparent pt-6 pb-48 px-4 sm:px-8 md:px-16 lg:px-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-8">
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
      */}

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm px-6 md:px-12 lg:px-24 pt-10 pb-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-foreground font-semibold text-lg tracking-tight">Noteshare</span>
            <span className="text-muted-foreground text-sm">Practice smarter</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Contact: matteo.m.caruso1@gmail.com
          </p>
          <div className="border-t border-border/30 pt-4">
            <p className="text-muted-foreground text-xs text-center">
              © 2026 Noteshare. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
