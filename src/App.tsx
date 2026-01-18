import { useEffect } from "react";
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
import { CheckoutDialog } from "@/components/CheckoutDialog";

import { AddToHomescreenPrompt } from "@/components/AddToHomescreenPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import NoteDetail from "./pages/NoteDetail";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Discover from "./pages/Discover";
import Gigs from "./pages/Gigs";
import GigDetail from "./pages/GigDetail";
import FriendsJournals from "./pages/FriendsJournals";
import WorkingToward from "./pages/WorkingToward";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminAnalytics from "./pages/AdminAnalytics";
import { AdminGuard } from "./components/AdminGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

// Wrapper to connect CheckoutDialog with PremiumContext
function CheckoutDialogWrapper() {
  const { isCheckoutDialogOpen, closeCheckoutDialog } = usePremium();
  return <CheckoutDialog open={isCheckoutDialogOpen} onOpenChange={closeCheckoutDialog} />;
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
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/notes/:id" element={<NoteDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/user/:id" element={<PublicProfile />} />
                  <Route path="/profile/:username" element={<PublicProfile />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/gigs" element={<Gigs />} />
                  <Route path="/gigs/:id" element={<GigDetail />} />
                  <Route path="/friends" element={<FriendsJournals />} />
                  <Route path="/working-toward" element={<WorkingToward />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin/analytics" element={
                    <AdminGuard>
                      <AdminAnalytics />
                    </AdminGuard>
                  } />
                  <Route path="*" element={<NotFound />} />
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

