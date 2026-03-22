

## Problem

The FTUE tour (step 3) renders hand-built mockup cards for Practice Session, Quick Note, Practice Routine, Timeline, and Save Dialog. These look different from the real app and will drift further over time. The user wants the actual components used by the real home page.

## Root Cause

1. `FTUEInteractiveTour` (lines 67-521 of FTUE.tsx) is a self-contained component with its own JSX for every card, session UI, and save dialog — none of it uses the real components.
2. The real components (`PracticeControls`, `QuickNoteCapture`, `TodaysFocus`) return `null` or a minimal shell when `profile` is missing, so they can't be dropped into the FTUE directly.
3. `EndSessionDialog` requires a real `PracticeSession` object from the database.

## Approach

Rather than trying to make every real component work without auth (which would require deep refactoring of dozens of hooks), I'll take a **hybrid approach**:

1. **Render the real Index page layout** for the tour background — use the actual `Index.tsx` structure but with an FTUE context that provides fake profile/session data so components render their full UI.
2. **Create an FTUE context** that the real components can check to determine if they're in FTUE mode, providing local-only state instead of querying the database.

Actually, the cleanest approach given the deep hook coupling is:

### Strategy: FTUE Preview Context + Component Adaptations

Create a `FTUEPreviewContext` that signals to components they're in an FTUE walkthrough. Each component checks this context and, when active, uses local state instead of database queries. This keeps the real component rendering code (JSX, styles, icons) identical while swapping only the data source.

### Files to Change

**1. New file: `src/contexts/FTUEPreviewContext.tsx`**
- Provides: `isFTUEPreview`, `previewSession` (fake active session object), `previewProfile` (minimal profile), callbacks for start/end/save
- Components check `isFTUEPreview` to bypass auth guards and use preview data

**2. `src/components/PracticeControls.tsx`**
- Import `useFTUEPreview` context
- When `isFTUEPreview` is true:
  - Use `previewProfile` instead of `useAuth().profile` for the early return guard
  - Use `previewSession` instead of `useActiveSession` data
  - Replace `startSession.mutate()` with `previewCallbacks.startSession()`
  - Replace end session flow with `previewCallbacks.endSession()`
  - Skip all database mutations (note creation, shares, etc.)
  - The component renders its FULL real UI (collapsible, session choice, active session layout, end session button) — zero mockup JSX needed

**3. `src/components/QuickNoteCapture.tsx`**
- When `isFTUEPreview`: use `previewProfile`, skip mutations, render full collapsed card UI

**4. `src/components/TodaysFocus.tsx`**
- When `isFTUEPreview`: use `previewProfile`, render with example content, skip database save

**5. `src/components/EndSessionDialog.tsx`**
- Accept optional `onPreviewSave` callback prop
- When provided, call it instead of the real `onSave` (which triggers database mutations)
- All UI rendering stays identical — same duration input, focus level selector, notes field, save button

**6. `src/components/Timeline.tsx`**
- Accept optional `previewNotes` prop
- When provided, merge them into the display list (used to show the saved session note)

**7. `src/pages/FTUE.tsx`**
- Replace `FTUEInteractiveTour` entirely:
  - Wrap real components in `FTUEPreviewProvider`
  - Render: `<PracticeControls />`, `<QuickNoteCapture />`, `<TodaysFocus />`, Timeline section — same layout as `Index.tsx`
  - Keep the spotlight overlay system (SVG mask + tooltip) on top
  - The spotlight targets the same `data-tour` selectors already on the real components
  - Phase transitions use callbacks from `FTUEPreviewContext` (e.g., when session starts, advance to phase 5)
- Remove all mockup JSX (fake cards, fake save dialog, fake timeline note, fake bottom nav, fake header)
- Use real `AppHeader` and `BottomNav` components (they already handle unauthenticated states)

### Tour Flow (unchanged phases, real components)

| Phase | Spotlight Target | What User Sees |
|-------|-----------------|----------------|
| 0 | `data-tour="practice-start-btn"` | Real PracticeControls collapsed card |
| 1 | Quick note card | Real QuickNoteCapture collapsed card |
| 2 | Practice routine | Real TodaysFocus card |
| 3 | Notes section | Real Timeline empty state |
| 4 | Practice button (interactive) | User taps → preview session starts via context |
| 5 | Session notes area | Real PracticeControls expanded with textarea |
| 6 | End session button | Real end session button in PracticeControls |
| 7 | Save dialog | Real EndSessionDialog with preview callback |
| 8 | Timeline with note | Real Timeline showing preview note |

### Key Design Decisions

- The `FTUEPreviewContext` creates a fake `PracticeSession` object matching the real type shape so components like `EndSessionDialog` work without changes to their type signatures
- The fake profile has the FTUE user's name and a generated UUID
- No database writes occur — everything is local state in the context
- The save dialog callback creates a fake `NoteWithAuthor` and passes it to Timeline as a preview note
- Bottom nav and header render their real unauthenticated versions

