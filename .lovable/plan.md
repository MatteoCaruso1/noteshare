

## "Get Inspired" Section on Organize Page

### What we're building
A collapsible "Get Inspired" card below Gigs on the Organize page with two options. Only "Generate a Practice Routine" will be functional now; "Find Personalized Training Content" will be a placeholder button (coming soon).

The routine generator takes free-text inputs, combines them with the user's existing routine and note history, sends everything to AI, and outputs a structured practice routine in the five required categories.

### Architecture

```text
WorkingToward.tsx
  └─ <GetInspiredSection />  (new component)
       ├─ Collapsible card with Sparkles icon
       ├─ "Generate a Practice Routine" → opens a dialog/inline form
       │    ├─ 4 free-text inputs (instrument, level, genre, practice type)
       │    ├─ "Generate" button → calls edge function
       │    ├─ Shows AI output in a styled text box
       │    └─ "Copy to Routine" button to load into TodaysFocus
       └─ "Find Personalized Training Content" → disabled/coming soon badge

Edge function: supabase/functions/generate-routine/index.ts
  ├─ Accepts: user inputs + existing routine + recent notes
  ├─ Calls Lovable AI Gateway (google/gemini-2.5-flash-lite — cheapest model)
  └─ Returns structured routine text
```

### Implementation Steps

**1. Create edge function `supabase/functions/generate-routine/index.ts`**
- Accepts POST with `{ instrument, level, genre, practiceType, existingRoutine, recentNotes }`
- Builds a system prompt requiring output in 5 bulleted sections: Warmup, Technique, Repertoire, Improvisation/Musical Application, Reflection
- Uses `google/gemini-2.5-flash-lite` (cheapest available model) via Lovable AI Gateway
- Non-streaming response (simple invoke pattern) since output is short
- Handles 429/402 errors

**2. Create `src/components/GetInspiredSection.tsx`**
- Collapsible card matching Folders/Gigs style (Sparkles icon, chevron)
- Two buttons inside: "Generate a Practice Routine" and "Find Personalized Training Content" (disabled, "Coming Soon" badge)
- Clicking "Generate" opens a dialog with 4 `Textarea` inputs:
  - Instrument (placeholder: "e.g., Piano, Guitar, Violin, Drums")
  - Current Level (placeholder: "e.g., Beginner, Intermediate, Advanced, 3 years experience")
  - Genre (placeholder: "e.g., Jazz, Classical, Rock, Blues, Pop")
  - Ideal Practice Type (placeholder: "e.g., Technical drills, Creative exploration, Repertoire focused")
- Generate button calls the edge function via `supabase.functions.invoke`
- Passes the user's current routine text (from `useDailyFocus`) and recent note content (last ~20 notes from `useNotes` or a dedicated lightweight query)
- Displays AI result in a read-only styled text box
- "Copy to Clipboard" button for the output

**3. Wire into `src/pages/WorkingToward.tsx`**
- Add `<GetInspiredSection />` after the Gigs Collapsible, inside the `<main>` container
- Pass `profileId` as prop

### Data flow for context enrichment
- **Existing routine**: Fetched from `daily_focus` table via `useDailyFocus` hook (already available)
- **Note history**: Query last 20 notes' `content` field from Supabase in the component, sending just the text snippets (truncated) to the edge function to stay within token limits
- **User inputs**: The 4 free-text fields from the form

### AI Prompt Structure
The system prompt will instruct the model to create a practice routine using exactly these 5 sections with bullet points:
1. **Warmup** — gentle exercises to prepare
2. **Technique** — focused skill-building drills
3. **Repertoire** — pieces/songs to work on
4. **Improvisation / Musical Application** — creative application
5. **Reflection** — review and self-assessment prompts

The model will incorporate context from the user's existing routine and note history to personalize suggestions.

### Cost
Using `google/gemini-2.5-flash-lite` — the cheapest model available. Short input/output means minimal token usage per generation.

