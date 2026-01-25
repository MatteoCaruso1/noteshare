import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PremiumProvider, usePremium } from "@/contexts/PremiumContext";
import { FloatingInstruments } from "@/components/FloatingInstruments";
import { GlobalSessionBanner } from "@/components/GlobalSessionBanner";
import { AppHeader } from "@/components/AppHeader";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PremiumDialog } from "@/components/PremiumDialog";

// Lazy load CheckoutDialog to defer Stripe.js (~155KB) until checkout is needed
// Lazy load CheckoutDialog to defer Stripe.js (~155KB) until checkout is needed
const CheckoutDialog = lazy(() => 
  import("@/components/CheckoutDialog").then(module => ({ default: module.CheckoutDialog }))
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
const WorkingToward = lazy(() => import("./pages/WorkingToward"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
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
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <FloatingInstruments />
                <AppHeader />
                <GlobalSessionBanner />
                <AddToHomescreenPrompt />
                <PremiumDialog />
                <CheckoutDialogWrapper />
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
                  <Route path="/working-toward" element={<Suspense fallback={null}><WorkingToward /></Suspense>} />
                  <Route path="/auth" element={<Suspense fallback={null}><Auth /></Suspense>} />
                  <Route path="/admin/analytics" element={
                    <AdminGuard>
                      <Suspense fallback={null}><AdminAnalytics /></Suspense>
                    </AdminGuard>
                  } />
                  <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </PremiumProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default AppInner;

