import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function useSeeding() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const queryClient = useQueryClient();

  const checkSeeded = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('seed-content', {
        body: { action: 'check' },
      });
      if (error) throw error;
      return data?.seeded || false;
    } catch (error) {
      console.error('Error checking seed status:', error);
      return false;
    }
  };

  const seedContent = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-content', {
        body: { action: 'seed' },
      });
      
      if (error) throw error;
      
      toast.success(`Seeded ${data.stats.posts} posts, ${data.stats.aiProfiles} AI personas!`);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['trendingTags'] });
      queryClient.invalidateQueries({ queryKey: ['suggestedUsers'] });
      
      return data;
    } catch (error) {
      console.error('Seeding error:', error);
      toast.error('Failed to seed content');
      throw error;
    } finally {
      setIsSeeding(false);
    }
  };

  const simulateActivity = async (intensity: 'normal' | 'high' = 'normal') => {
    setIsSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-activity', {
        body: { intensity },
      });
      
      if (error) throw error;
      
      const { results } = data;
      toast.success(`AI activity: ${results.posts} posts, ${results.comments} comments, ${results.reactions} reactions`);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      return data;
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error('Failed to simulate activity');
      throw error;
    } finally {
      setIsSimulating(false);
    }
  };

  return {
    isSeeding,
    isSimulating,
    checkSeeded,
    seedContent,
    simulateActivity,
  };
}
