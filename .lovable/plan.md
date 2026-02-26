

# Move Groups from Bottom Nav to Friends Page Header

## Overview
Remove the Groups tab from the bottom navigation bar and add a Groups button to the Friends page header. This simplifies the bottom nav to 4 tabs and makes Groups accessible from the social section where it logically belongs.

## Changes

### 1. BottomNav.tsx -- Remove Groups entry
- Remove the `{ to: '/groups', icon: Waypoints, label: 'Groups', mobileLabel: 'Groups' }` entry from the `links` array
- Remove the `Waypoints` import
- Bottom nav goes from 5 tabs to 4: Practice, Organize, Friends, Profile

### 2. FriendsJournals.tsx -- Add Groups button to header
- Add a Groups button to the left of the notifications button (first in the row)
- Style it distinctly from the other icon-only buttons: use the `Waypoints` icon with a label "Groups" beside it, styled with a subtle primary tint/border to make it feel like a destination rather than just another action button
- Clicking navigates to `/groups` via `useNavigate`

### 3. Groups.tsx -- Clean up duplicate header buttons
- Remove the duplicated notifications, messages, friends list, and add-friend buttons from the Groups page header
- Replace with a simple back button that returns to `/friends`, since Groups is now a sub-destination of the Friends flow
- This eliminates ~120 lines of duplicated dialog state and UI code

### 4. Groups.tsx -- BottomNav active state
- Use `useBottomNavOverride` to set the active route to `/friends` while on the Groups page, so the Friends tab stays highlighted

## Styling for the Groups Button
The Groups button will stand out from the standard icon buttons by:
- Including the "Groups" text label next to the Waypoints icon (similar to the Friends count button pattern)
- Using a subtle primary color accent (`bg-primary/10 border-primary/30`) to differentiate it as a navigation destination

## What Won't Break
- `/groups` route remains in App.tsx -- direct links, back navigation, and invite redirects (`/groups?tab=my`) all continue to work
- Onboarding/SpotlightTour has no Groups references
- GroupDetail back button navigates to `/groups` which still works
- PendingGroupInviteCard navigates to `/groups?tab=my` which still works

## Technical Details

```text
Bottom Nav (before):  Practice | Organize | Friends | Groups | Profile
Bottom Nav (after):   Practice | Organize | Friends | Profile

Friends Page Header (after):
  "Friends' Practice"   [Groups] [Bell] [Chat] [Friends N] [Add]
```

Files modified:
- `src/components/BottomNav.tsx` (remove Groups link)
- `src/pages/FriendsJournals.tsx` (add Groups navigation button)
- `src/pages/Groups.tsx` (add bottom nav override, simplify header)
