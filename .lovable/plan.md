

# Update Onboarding & Highlight for Friends List Button

## Context
The recent change moved "Add Friend" inside the Friends List dialog and removed it as a standalone header button. This requires two updates:

## What's NOT Broken
- The onboarding spotlight tour step 4 highlights the **bottom nav "Friends" tab** (`data-tour="friends-nav"`), which is unchanged and still works fine.

## Changes Needed

### 1. Add `data-tour` attribute to the Friends List button
In `FriendsJournals.tsx`, add `data-tour="friends-list"` to the Friends List button (the Users icon in the header) so the spotlight tour can target it.

### 2. Add a new onboarding tour step for the Friends List button
In `SpotlightTour.tsx`, add a step after the current Friends nav step that:
- Navigates to `/friends`
- Targets `[data-tour="friends-list"]`
- Shows a message like "View your friends list and add new friends here"
- This means the tour will go from 5 steps to 6 (plus the final "Happy practicing!" screen), updating the final step number from 6 to 7

### 3. Add persistent highlight (pulse) on the Friends List button until first clicked
Similar to how `HelpTipsDialog` uses `localStorage` to track whether the help icon has been viewed:
- Create a `localStorage` key like `noteshare_friends_list_viewed_{userId}`
- In `FriendsJournals.tsx`, check this key and apply `text-primary animate-pulse` to the Users icon when not yet viewed
- When the Friends List dialog opens, mark it as viewed and stop the pulse

### Technical Details

**Files to modify:**

1. **`src/pages/FriendsJournals.tsx`**
   - Add `data-tour="friends-list"` to the Friends List button div
   - Add localStorage-based pulse highlight logic (check `noteshare_friends_list_viewed_{userId}`)
   - On FriendsList `onOpenChange`, mark as viewed when opened

2. **`src/components/onboarding/SpotlightTour.tsx`**
   - Insert new tour step at index 4 (after friends-nav): `{ targetSelector: '[data-tour="friends-list"]', message: 'View your friends and add new ones here!', position: 'bottom', navigateTo: '/friends' }`
   - Update final step check from `step === 6` to `step === 7`
   - Update step indicator dots from 5 to 6

3. **`src/contexts/OnboardingContext.tsx`**
   - Update the max step from 6 to 7 in `nextStep()`
