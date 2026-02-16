

# Setting Up Capacitor for iOS App Store Distribution

This plan adds Capacitor to your project so you can publish a native iOS app alongside your existing web/PWA version. Nothing about the current web app changes.

## What Lovable Will Do

1. **Install Capacitor dependencies** (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`)
2. **Create `capacitor.config.ts`** in the project root with your app ID and live preview URL for development
3. **Add a `build` script** to `package.json` if not already present

That's it on Lovable's side -- the rest happens on your Mac.

## What You Do After (Step-by-Step)

1. **Export to GitHub** -- Use the "Export to GitHub" button in Lovable project settings to push your code to your own GitHub repo

2. **Clone and install** on your Mac:
   ```
   git clone <your-repo-url>
   cd <your-project>
   npm install
   ```

3. **Add the iOS platform**:
   ```
   npx cap add ios
   ```

4. **Build the web app and sync it to the native project**:
   ```
   npm run build
   npx cap sync ios
   ```

5. **Open in Xcode**:
   ```
   npx cap open ios
   ```

6. **In Xcode**:
   - Sign in with your Apple Developer account (Xcode > Settings > Accounts)
   - Select your Team under Signing and Capabilities
   - Set a Display Name and Bundle Identifier
   - Choose a connected iPhone or simulator, then hit Run to test

7. **Submit to App Store**:
   - In Xcode, select "Any iOS Device" as the target
   - Go to Product > Archive
   - Once archived, click "Distribute App" > "App Store Connect"
   - Follow the prompts to upload
   - Go to [App Store Connect](https://appstoreconnect.apple.com), fill in your app listing (screenshots, description, etc.), and submit for review

## Requirements

- A Mac with Xcode installed (free from the Mac App Store)
- An Apple Developer account ($99/year) -- needed to publish to the App Store
- An iPhone or simulator for testing

## What This Does NOT Change

- Your existing web app at jazz-scene-alive.lovable.app stays exactly the same
- The PWA install flow continues to work
- No changes to any existing components, routing, or service worker logic

## Technical Details

- **App ID**: `app.lovable.b0e3704a3b8b44b8b0820d726401d97a`
- **App Name**: `Noteshare`
- **Capacitor config** includes a dev server URL pointing to your Lovable preview so you can hot-reload during development on a physical device
- When you're ready to publish, you'll remove the `server.url` from the config so the app uses the bundled build instead

