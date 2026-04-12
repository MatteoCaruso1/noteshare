

## Problem Analysis

Two issues with the gauge:

1. **Gauge appears empty**: The linear gradient's last color stop is `hsl(var(--muted))` — the same color as the background track. Since the gradient spans left-to-right and the arc starts from the left, the filled portion fades into the background, making it invisible.

2. **Pink and purple "nubs"**: These are the tiny visible portions of the gradient at the arc's start and end points. Because the rest blends into the background color, only these small colored fragments are visible at the edges.

## Plan

**File: `src/components/PracticeRanking.tsx` — GaugeArc component**

1. **Fix the gradient**: Remove the final `hsl(var(--muted))` stop. Use only the pink-to-purple color range so the entire filled arc is visibly colored:
   - 0%: `hsl(340, 80%, 65%)` (pink)
   - 50%: `hsl(280, 70%, 60%)` (purple)
   - 100%: `hsl(250, 60%, 55%)` (deep purple)

2. **Verify arc math is correct**: The fill logic (`fillFraction = 1 - percent/100`) and arc endpoint calculation look correct mathematically. The visual issue is purely the gradient coloring, not the path.

These two changes (gradient fix) will solve both problems simultaneously — the arc will be fully visible and there will be no misleading "nubs" since the entire stroke will be a solid gradient color.

