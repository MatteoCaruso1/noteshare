import { useState, useEffect } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { Feed } from '@/components/Feed';
import { AuthModal } from '@/components/AuthModal';

const ENGAGEMENT_THRESHOLD = 5;

const Index = () => {
  const [showHero, setShowHero] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTriggerReason, setAuthTriggerReason] = useState<string>('');
  const [engagementCount, setEngagementCount] = useState(0);

  // Track engagement and trigger auth modal after threshold
  useEffect(() => {
    if (engagementCount >= ENGAGEMENT_THRESHOLD && !showAuthModal) {
      setAuthTriggerReason('engagement');
      setShowAuthModal(true);
    }
  }, [engagementCount, showAuthModal]);

  const handleEnterFeed = () => {
    setShowHero(false);
  };

  const handleAuthClick = () => {
    setAuthTriggerReason('action');
    setShowAuthModal(true);
  };

  const handleEngagement = () => {
    setEngagementCount((prev) => prev + 1);
  };

  return (
    <>
      {showHero ? (
        <HeroSection onEnterFeed={handleEnterFeed} />
      ) : (
        <Feed onAuthClick={handleAuthClick} onEngagement={handleEngagement} />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        triggerReason={authTriggerReason}
      />
    </>
  );
};

export default Index;
