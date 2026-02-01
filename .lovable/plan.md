
# Fix: Theme Picker Not Applying Colors

## Problem Identified

The theme picker selection saves correctly to the database (I verified your profile has `color_theme: green`), but the visual theme doesn't change. The root cause is a **CSS selector mismatch**:

- The `dark` class is on the `<body>` element (set in `index.html`)
- The theme class (e.g., `theme-green`) is added to `document.documentElement` (the `<html>` element)
- The CSS selectors `.dark.theme-green` require both classes on the **same** element

Current DOM structure:
```text
<html class="theme-green">      ← theme class here
  <body class="dark">           ← dark class here
```

Required for CSS to work:
```text
<html class="dark theme-green"> ← both classes on same element
```

---

## Solution

Apply the theme class to the `<body>` element instead of `document.documentElement`, so both `dark` and the theme class are on the same element.

### File Change: `src/contexts/ColorThemeContext.tsx`

Change the theme application logic from:
```tsx
const root = document.documentElement;
root.classList.add(`theme-${colorTheme}`);
```

To:
```tsx
const body = document.body;
body.classList.add(`theme-${colorTheme}`);
```

This ensures both `dark` and `theme-green` are on `<body>`, making the compound CSS selectors work correctly.

---

## Technical Details

| File | Change |
|------|--------|
| `src/contexts/ColorThemeContext.tsx` | Change `document.documentElement` to `document.body` in the `useEffect` that applies/removes theme classes |

### Updated Code

```tsx
// Apply theme class to body (where 'dark' class also lives)
useEffect(() => {
  const body = document.body;
  
  // Remove all theme classes
  AVAILABLE_THEMES.forEach(theme => {
    body.classList.remove(`theme-${theme.id}`);
  });
  
  // Add current theme class (skip for default blue)
  if (colorTheme !== 'blue') {
    body.classList.add(`theme-${colorTheme}`);
  }
}, [colorTheme]);
```

---

## Why This Fixes It

After the fix, the DOM will be:
```text
<html>
  <body class="dark theme-green">  ← both classes on same element
```

The CSS selector `.dark.theme-green` will now match, and the green primary color will override the default blue.
