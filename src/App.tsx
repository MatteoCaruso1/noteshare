import { useEffect, lazy, Suspense, useRef, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PremiumProvider, usePremium } from "@/contexts/PremiumContext";
import { BottomNavProvider } from "@/contexts/BottomNavContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

import { ColorThemeProvider } from "@/contexts/ColorThemeContext";
import { MetronomeProvider } from "@/contexts/MetronomeContext";
import { PracticeTimerProvider } from "@/contexts/PracticeTimerContext";
import { FloatingInstruments } from "@/components/FloatingInstruments";
import { GlobalSessionBanner } from "@/components/GlobalSessionBanner";
import { SessionFocusOverlay } from "@/components/SessionFocusOverlay";
import { AppHeader } from "@/components/AppHeader";
import { ScrollToTop } from "@/components/ScrollToTop";
import UpdateAvailableToast from "@/components/UpdateAvailableToast";
import { ScrollLockDebugger } from "@/components/ScrollLockDebugger";
import { SyncManager, SyncState } from "@/components/SyncManager";
import { OfflineBanner } from "@/components/OfflineBanner";
import { BottomNav } from "@/components/BottomNav";
import { PremiumDialog } from "@/components/PremiumDialog";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

import { useAvatarPrefetch } from "@/hooks/useAvatarPrefetch";
import { useFriendIds } from "@/hooks/useFriendIds";
import { getFTUEState, clearFTUEState } from "@/hooks/useFTUEState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Lazy load Checkout Dialogs to defer Stripe.js (~155KB) until checkout is needed
const CheckoutDialog = lazy(() => 
  import("@/components/CheckoutDialog").then(module => ({ default: module.CheckoutDialog }))
);
const LifetimeCheckoutDialog = lazy(() => 
  import("@/components/LifetimeCheckoutDialog").then(module => ({ default: module.LifetimeCheckoutDialog }))
);

import { AddToHomescreenPrompt } from "@/components/AddToHomescreenPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eagerly load the landing/welcome pages for fast FCP
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";

// Lazy load all other pages to reduce initial bundle
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NoteDetail = lazy(() => import("./pages/NoteDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Discover = lazy(() => import("./pages/Discover"));
const Gigs = lazy(() => import("./pages/Gigs"));
const GigDetail = lazy(() => import("./pages/GigDetail"));
const FriendsJournals = lazy(() => import("./pages/FriendsJournals"));
const Groups = lazy(() => import("./pages/Groups"));
const GroupDetail = lazy(() => import("./pages/GroupDetail"));
const Pursuits = lazy(() => import("./pages/WorkingToward"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const ShortNoteRedirect = lazy(() => import("./pages/ShortNoteRedirect"));
const OAuthCatchRedirect = lazy(() => import("./pages/OAuthCatchRedirect"));
const QRCodePage = lazy(() => import("./pages/QRCode"));
const ScienceOfPractice = lazy(() => import("./pages/ScienceOfPractice"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogDailyRoutine = lazy(() => import("./pages/BlogDailyRoutine"));
const BlogPracticeJournal = lazy(() => import("./pages/BlogPracticeJournal"));
const BlogPianoTracker = lazy(() => import("./pages/BlogPianoTracker"));
const HowMusicianspractice = lazy(() => import("./pages/HowMusiciansPractice"));
const FTUEPage = lazy(() => import("./pages/FTUE"));
import { AdminGuard } from "./components/AdminGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors or auth-related errors
        if (error && typeof error === 'object') {
          const status = (error as { status?: number }).status;
          const code = (error as { code?: string }).code;
          const message = (error as { message?: string }).message;
          
          // Don't retry client errors (4xx)
          if (status && status >= 400 && status < 500) {
            return false;
          }
          // Don't retry auth token errors
          if (code === 'refresh_token_not_found' || code === 'invalid_token') {
            return false;
          }
          // Don't retry if message indicates auth failure
          if (message?.toLowerCase().includes('refresh token')) {
            return false;
          }
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false, // Prevent refetch thrashing on tab switch
    },
  },
});

// Wrapper to connect CheckoutDialog with PremiumContext - lazy loads Stripe.js only when opened
function CheckoutDialogWrapper() {
  const { isCheckoutDialogOpen, closeCheckoutDialog } = usePremium();
  
  // Only render (and thus load Stripe.js) when checkout dialog is requested
  if (!isCheckoutDialogOpen) return null;
  
  return (
    <Suspense fallback={null}>
      <CheckoutDialog open={isCheckoutDialogOpen} onOpenChange={closeCheckoutDialog} />
    </Suspense>
  );
}

// Wrapper for lifetime checkout dialog
function LifetimeCheckoutDialogWrapper() {
  const { isLifetimeCheckoutDialogOpen, closeLifetimeCheckoutDialog } = usePremium();
  
  // Only render (and thus load Stripe.js) when lifetime checkout dialog is requested
  if (!isLifetimeCheckoutDialogOpen) return null;
  
  return (
    <Suspense fallback={null}>
      <LifetimeCheckoutDialog open={isLifetimeCheckoutDialogOpen} onOpenChange={closeLifetimeCheckoutDialog} />
    </Suspense>
  );
}

// Component to run avatar prefetch and friend IDs prefetch inside auth context
function AppPrefetcher() {
  useAvatarPrefetch();
  useFriendIds(); // Eagerly load friend IDs so Friends feed loads instantly from cache
  return null;
}

// Retry failed FTUE commits on app load when user is authenticated
function FTUERetryCommit() {
  const { user, refreshProfile, clearNewUserFlag } = useAuth();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!user || attemptedRef.current) return;
    // Don't retry if we're on the FTUE page — it handles its own commit
    if (window.location.pathname === '/ftue') return;
    const state = getFTUEState();
    if (!state || !state.readyForSignup || state.currentStep < 4) return;

    attemptedRef.current = true;
    console.log('[FTUE] Retrying uncommitted FTUE data...');

    supabase.functions.invoke('commit-ftue', {
      body: {
        name: state.name.trim(),
        instrument: state.instrument,
        instruments: state.instruments || [state.instrument],
        idempotencyKey: `${state.startedAt}`,
      },
    }).then(async ({ error }) => {
      if (!error) {
        console.log('[FTUE] Retry commit succeeded');
        clearFTUEState();
        await refreshProfile();
        clearNewUserFlag();
      } else {
        console.error('[FTUE] Retry commit failed:', error);
      }
    });
  }, [user]);

  return null;
}

function AppInner() {
  useEffect(() => {
    // Prevent mobile browsers from trying to restore scroll positions on SPA navigations.
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PremiumProvider>
            <ColorThemeProvider>
            <OnboardingProvider>
              
                <BottomNavProvider>
                  <MetronomeProvider>
                    <PracticeTimerProvider>
                      <TooltipProvider>
                    <BrowserRouter>
                      <ScrollToTop />
                      <ScrollLockDebugger />
                      <FloatingInstruments />
                      <SessionFocusOverlay />
                      <AppHeader />
                      <GlobalSessionBanner />
                      <AddToHomescreenPrompt />
                      <PremiumDialog />
                      <CheckoutDialogWrapper />
                      <LifetimeCheckoutDialogWrapper />
                      <OnboardingFlow />
                      
                      <AppPrefetcher />
                      <FTUERetryCommit />
                      <UpdateAvailableToast />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/welcome" element={<Welcome />} />
                      <Route path="/projects" element={<Suspense fallback={null}><Projects /></Suspense>} />
                      <Route path="/projects/:id" element={<Suspense fallback={null}><ProjectDetail /></Suspense>} />
                      <Route path="/notes/:id" element={<Suspense fallback={null}><NoteDetail /></Suspense>} />
                      <Route path="/profile" element={<Suspense fallback={null}><Profile /></Suspense>} />
                      <Route path="/user/:id" element={<Suspense fallback={null}><PublicProfile /></Suspense>} />
                      <Route path="/profile/:username" element={<Suspense fallback={null}><PublicProfile /></Suspense>} />
                      <Route path="/discover" element={<Suspense fallback={null}><Discover /></Suspense>} />
                      <Route path="/gigs" element={<Suspense fallback={null}><Gigs /></Suspense>} />
                      <Route path="/gigs/:id" element={<Suspense fallback={null}><GigDetail /></Suspense>} />
                      <Route path="/friends" element={<Suspense fallback={null}><FriendsJournals /></Suspense>} />
                      <Route path="/groups" element={<Suspense fallback={null}><Groups /></Suspense>} />
                      <Route path="/groups/:id" element={<Suspense fallback={null}><GroupDetail /></Suspense>} />
                      <Route path="/pursuits" element={<Suspense fallback={null}><Pursuits /></Suspense>} />
                      <Route path="/n/:shortId" element={<Suspense fallback={null}><ShortNoteRedirect /></Suspense>} />
                      <Route path="/auth" element={<Suspense fallback={null}><Auth /></Suspense>} />
                      {/* Catch OAuth routes that might hit the app on custom domains - redirect to auth */}
                      <Route path="/~oauth/*" element={<Suspense fallback={null}><OAuthCatchRedirect /></Suspense>} />
                      <Route path="/admin/analytics" element={
                        <AdminGuard>
                          <Suspense fallback={null}><AdminAnalytics /></Suspense>
                        </AdminGuard>
                      } />
                      <Route path="/qr" element={<Suspense fallback={null}><QRCodePage /></Suspense>} />
                      <Route path="/science-of-practice" element={<Suspense fallback={null}><ScienceOfPractice /></Suspense>} />
                      <Route path="/pricing" element={<Suspense fallback={null}><Pricing /></Suspense>} />
                      <Route path="/blog" element={<Suspense fallback={null}><Blog /></Suspense>} />
                      <Route path="/blog/daily-practice-routine" element={<Suspense fallback={null}><BlogDailyRoutine /></Suspense>} />
                      <Route path="/blog/practice-journal" element={<Suspense fallback={null}><BlogPracticeJournal /></Suspense>} />
                      <Route path="/blog/piano-practice-tracker" element={<Suspense fallback={null}><BlogPianoTracker /></Suspense>} />
                      <Route path="/how-musicians-practice-effectively" element={<Suspense fallback={null}><HowMusicianspractice /></Suspense>} />
                      <Route path="/ftue" element={<Suspense fallback={null}><FTUEPage /></Suspense>} />
                      <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
                    </Routes>
                    <BottomNav />
                    {/* Toasts render AFTER all page content to ensure they paint above all stacking contexts */}
                    <Toaster />
                    <Sonner />
                    </BrowserRouter>
                  </TooltipProvider>
                </PracticeTimerProvider>
              </MetronomeProvider>
            </BottomNavProvider>
              
            </OnboardingProvider>
            </ColorThemeProvider>
          </PremiumProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default AppInner;

