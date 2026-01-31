
# Plan: Fix "Something Went Wrong" Errors on Groups Page

## Problem Summary

The Groups page is triggering ErrorBoundary errors. After investigation, I've identified several potential issues:

1. **Problematic TypeScript type** in GroupDetail.tsx causing potential runtime errors
2. **Missing error handling** in group-related components  
3. **Excessive API calls** from GroupCard calling `useGroupMembership` for every card in the list
4. **Null/undefined handling issues** in event detail components

## Solution Overview

### Phase 1: Fix Type Issues in GroupDetail

**File: `src/pages/GroupDetail.tsx`**

Replace the problematic type declaration:
```typescript
// FROM (line 51):
const [selectedEvent, setSelectedEvent] = useState<typeof events extends (infer T)[] | undefined ? T : never | null>(null);

// TO:
const [selectedEvent, setSelectedEvent] = useState<GroupEvent | null>(null);
```

This requires importing `GroupEvent` from `@/hooks/useGroupDetails`.

### Phase 2: Add Error Handling to GroupCard

**File: `src/components/groups/GroupCard.tsx`**

Add proper error handling for the `useGroupMembership` hook:
- Handle loading and error states gracefully
- Add a try-catch wrapper for the join mutation
- Consider memoizing the card to prevent re-renders

### Phase 3: Optimize GroupCard API Calls

The current implementation calls `useGroupMembership(group.id)` for every card in the list, which creates N+1 query problems.

**Solution Options:**
1. **Batch fetch memberships** - Fetch all memberships in the parent component and pass down as props
2. **Lazy load membership** - Only check membership when user interacts with Join button
3. **Use the myGroups data** - Since we already have the user's groups from `useMyGroups`, we can derive membership status from that

**Recommended approach:** Pass membership status from parent component for the "Active" tab (already have myRole from useMyGroups), and lazy-load for "Find" tab.

### Phase 4: Add Defensive Null Checks

**File: `src/pages/GroupDetail.tsx`**

Add additional guards in the EventDetailSheet component:
- Ensure all memoized values handle null event gracefully
- Move hooks before conditional returns

**File: `src/components/groups/ShareGroupSheet.tsx` and `ShareEventSheet.tsx`**

Verify all hooks are called unconditionally and memoized values handle edge cases.

### Phase 5: Add Inline Error Boundaries

Wrap critical sections in InlineErrorBoundary to prevent full-page crashes:

```typescript
import { InlineErrorBoundary } from '@/components/ErrorBoundary';

// Wrap posts section, events section, and share dialogs
<InlineErrorBoundary>
  <GroupPostCapture ... />
</InlineErrorBoundary>
```

## Implementation Steps

1. Fix the TypeScript type in GroupDetail.tsx (add GroupEvent import, fix useState type)
2. Add error state handling to GroupCard component
3. Refactor membership checking to avoid N+1 queries
4. Add null guards to EventDetailSheet and share components
5. Wrap volatile sections with InlineErrorBoundary
6. Test the groups page end-to-end

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/GroupDetail.tsx` | Fix type, add import, add error boundaries |
| `src/components/groups/GroupCard.tsx` | Add error handling, optimize membership check |
| `src/pages/Groups.tsx` | Pass membership data to GroupCard for "Active" tab |

### Risk Assessment

- **Low risk**: Type fixes and null guards
- **Medium risk**: Refactoring membership checking (requires testing both tabs)
- **Low risk**: Adding error boundaries (defensive, doesn't change behavior)

## Expected Outcome

After these changes:
- Groups page will load without "Something went wrong" errors
- Failed individual components will show graceful fallbacks instead of crashing the entire page
- Reduced API calls will improve performance
- Better error visibility in console logs for debugging
