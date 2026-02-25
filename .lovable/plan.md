

# Capitalize "Noteshare" Everywhere It's User-Visible

## Summary
Several places in the codebase still use lowercase "noteshare" in user-facing text. Internal storage keys, filenames, and URLs will be left as-is since they're not visible to users and changing them could break existing localStorage data.

## Changes

### 1. index.html -- Meta tags (2 fixes)
- Line 28: `content="noteshare"` → `content="Noteshare"` (author meta)
- Line 29: `content="noteshare, noteshare music, ..."` → `content="Noteshare, Noteshare music, ..."` (keywords meta)

### 2. supabase/functions/send-feedback-email/index.ts -- Email content (4 fixes)
- Line 87: `"New Feedback from noteshare"` → `"New Feedback from Noteshare"`
- Line 93: `"What do you like most about noteshare?"` → `"What do you like most about Noteshare?"`
- Line 113: `"noteshare Feedback <...>"` → `"Noteshare Feedback <...>"`
- Line 115: `` `noteshare Feedback from ${userName}` `` → `` `Noteshare Feedback from ${userName}` ``

## What stays lowercase (intentionally)
These are NOT user-visible and changing them would break existing user sessions/data:
- localStorage keys (e.g., `noteshare_remember_me`, `noteshare_active_session`)
- IndexedDB names (e.g., `noteshare-url-cache`, `noteshare_recordings`)
- File download names (e.g., `noteshare-practice.png`)
- Code comments
- Domain URLs (`notesharemusic.com`)

## Technical Details
- **index.html**: Simple text replacement in 2 meta tag attributes
- **send-feedback-email edge function**: 4 string replacements in the email HTML template; will need redeployment
