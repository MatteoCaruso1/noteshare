

## Fix Floating Symbol Z-Index Layering

**Problem**: At `z-[4]`, the floating symbols fall behind the entire WelcomeHero component which sits at `z-10`. They need to be visible over the section backgrounds but behind the screenshot images.

**Root cause**: `WelcomeHero` has `z-10` on its outermost div, creating a stacking context that covers everything at `z-[4]`.

**Solution** (2 files):

1. **`src/components/FloatingInstruments.tsx`** — Change container from `z-[4]` to `z-[8]`
   - This places symbols above most backgrounds but below the `z-10` WelcomeHero content

2. **`src/components/LandingFeatures.tsx`** — Add `relative z-[12]` to each screenshot's outer container (the `<div className="relative">` wrapping each image)
   - This ensures screenshots stack above the floating symbols

3. **`src/components/WelcomeHero.tsx`** — No changes needed; `z-10` on the hero content keeps text/CTA above symbols

**Resulting layer order** (back to front):
- Page background
- Section gradient backgrounds
- Floating symbols (`z-[8]`)
- Hero text/CTA (`z-10`)
- Feature screenshots (`z-[12]` within `z-10` parent = effective `z-12`)

