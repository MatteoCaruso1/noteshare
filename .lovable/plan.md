

## Fix: Date Input Overflowing on Mobile

Two places where the date input field overflows on mobile screens:

1. **Project Settings dialog** (`src/pages/ProjectDetail.tsx`) -- the "Expected Release Date" input
2. **Log Past Session dialog** (`src/components/OfflineSessionInput.tsx`) -- the date picker input

### Root Cause

The native `<Input type="date">` element can render wider than its container on mobile Safari/iOS due to the browser's built-in date formatting and picker chrome. The dialog content doesn't constrain it enough.

### Fix Approach

For both files, apply explicit width constraints directly on the date `<Input>` elements:

- Add `w-full max-w-full min-w-0` classes to force the input to stay within its container
- Add `box-border` to ensure padding is included in the width calculation

Additionally, ensure the **ProjectDetail dialog** has the same overflow-safe wrapper classes already present on the OfflineSessionInput dialog (`max-w-[calc(100vw-2rem)] sm:max-w-lg w-full overflow-x-hidden box-border`).

### Technical Details

**File 1: `src/pages/ProjectDetail.tsx` (line ~254)**
- Add responsive `max-w` and `overflow-x-hidden` classes to the `<DialogContent>` wrapper
- Add `w-full max-w-full min-w-0 box-border` to the date `<Input>` at line ~292

**File 2: `src/components/OfflineSessionInput.tsx` (line ~68)**
- Add `w-full max-w-full min-w-0 box-border` to the existing date `<Input>` className

Both changes ensure the native date input can never exceed its parent container width on any viewport.
