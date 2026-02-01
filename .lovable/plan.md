
# Theme Customization for Pro Users

## Overview
Add a feature that allows Pro users to customize Noteshare's accent color theme (changing from the default blue to red, purple, green, amber, or teal).

## Technical Approach

### 1. Database Schema Update
Add a new column to the `profiles` table to store the user's theme preference:
```sql
ALTER TABLE profiles 
ADD COLUMN color_theme TEXT DEFAULT 'blue';
```

### 2. CSS Theme Variants
Define color theme classes in `src/index.css` that override the primary accent colors. Each theme variant will modify:
- `--primary` (main accent color)
- `--ring` (focus rings)
- `--primary-foreground` (text on primary backgrounds)

Available themes:
- **Blue** (default) - Current color scheme
- **Red/Coral** - Warm, energetic feel
- **Purple** - Creative, elegant
- **Green/Teal** - Calm, focused
- **Amber/Gold** - Warm, premium feel

### 3. Theme Provider Integration
Extend the existing theme system to:
- Read the user's `color_theme` preference from their profile
- Apply the corresponding CSS class to the document root
- Persist changes when the user selects a new theme

### 4. Theme Picker Component
Create a `ThemePicker` component that:
- Displays colored circles/swatches for each theme option
- Shows a checkmark on the currently selected theme
- Only appears for Pro users (gated via `usePremium()`)
- Lives in the Profile edit mode settings

### 5. File Changes

| File | Change |
|------|--------|
| `src/index.css` | Add theme variant CSS classes with color overrides |
| `src/contexts/ThemeContext.tsx` | New context for managing color theme state |
| `src/components/ThemePicker.tsx` | New component for theme selection UI |
| `src/pages/Profile.tsx` | Add ThemePicker to the Pro Features settings card |
| `src/App.tsx` | Wrap app with ThemeProvider to apply the selected theme class |
| Database migration | Add `color_theme` column to profiles |

---

## Technical Details

### CSS Theme Structure
```css
/* Example theme variant */
.theme-red {
  --primary: 0 72% 50%;
  --primary-foreground: 0 0% 100%;
  --ring: 0 72% 50%;
}

.theme-purple {
  --primary: 265 55% 55%;
  --primary-foreground: 265 100% 97%;
  --ring: 265 55% 55%;
}
```

### Theme Context Hook
```tsx
interface ThemeContextType {
  colorTheme: string;
  setColorTheme: (theme: string) => Promise<void>;
  availableThemes: ThemeOption[];
}
```

### Theme Picker UI (in Profile settings)
The picker will render as a row of colored circles in the "Pro Features" card, each representing a theme option. Tapping a circle switches the theme instantly and saves to the database.

---

## User Experience

1. Pro user opens Profile and taps the Settings icon
2. Scrolls to "Pro Features" section
3. Sees a new "Color Theme" row with colored circles
4. Taps a color to preview it immediately
5. The change persists across sessions and devices

---

## Considerations

- **Performance**: Theme changes use CSS variables, so they apply instantly without re-renders
- **Dark/Light Mode**: Theme accents work independently of dark/light mode preference
- **Default for Free Users**: Free users see the default blue theme with no picker shown
- **Graceful Degradation**: If a user downgrades from Pro, they keep the default blue theme
