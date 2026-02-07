# Focus Mode Dark Box Fix - COMPLETED

## Summary
Replaced `filter: brightness()` with `opacity` for section dimming to eliminate GPU rasterization artifacts. Re-added teal glow effect on focus cards using isolated `::before` pseudo-element.

## Changes Made
- Sections now use `opacity: 0.35` instead of `filter: brightness(0.35) saturate(0.8)`
- Added `will-change: opacity` for smoother transitions
- Restored `.session-focus-card::before` glow with radial gradient
- Cleaned up redundant `filter: none` overrides
