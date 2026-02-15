import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      // Get current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return [];

      // Only fetch projects owned by the current user
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', currentProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useFeedProjects() {
  return useQuery({
    queryKey: ['feed-projects'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (*)
        `)
        .eq('owner_id', currentProfile.id)
        .eq('show_on_feed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((project: any) => ({
        ...project,
        owner: project.profiles,
      }));
    },
  });
}

export function useFriendsFeedProjects() {
  return useQuery({
    queryKey: ['friends-feed-projects'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return [];

      // Get friend IDs from accepted friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentProfile.id},addressee_id.eq.${currentProfile.id}`);

      if (friendshipsError) throw friendshipsError;

      const friendIds = friendships.map(f => 
        f.requester_id === currentProfile.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) return [];

      // Get projects from friends with show_on_feed enabled
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (*)
        `)
        .in('owner_id', friendIds)
        .eq('show_on_feed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((project: any) => ({
        ...project,
        owner: project.profiles,
      }));
    },
  });
}

export function useFriendsProjects() {
  return useQuery({
    queryKey: ['friends-projects'],
    queryFn: async () => {
      // First get the current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return [];

      // Get friend IDs from accepted friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentProfile.id},addressee_id.eq.${currentProfile.id}`);

      if (friendshipsError) throw friendshipsError;

      const friendIds = friendships.map(f => 
        f.requester_id === currentProfile.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) return [];

      // Get projects from friends only
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (*)
        `)
        .in('owner_id', friendIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((project: any) => ({
        ...project,
        owner: project.profiles,
      }));
    },
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (*)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return {
        ...data,
        owner: data.profiles,
      };
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ownerId,
      title,
      description,
      coverImage,
      tags = [],
      showOnFeed = false,
      collaboratorIds = [],
      releaseDate,
    }: {
      ownerId: string;
      title: string;
      description?: string;
      coverImage?: string;
      tags?: string[];
      showOnFeed?: boolean;
      collaboratorIds?: string[];
      releaseDate?: string;
    }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          owner_id: ownerId,
          title,
          description,
          cover_image: coverImage,
          tags,
          show_on_feed: showOnFeed,
          collaborator_ids: collaboratorIds,
          release_date: releaseDate || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['friends-projects'] });
      queryClient.invalidateQueries({ queryKey: ['feed-projects'] });
      toast.success('Folder created!');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Failed to create folder');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      title,
      description,
      coverImage,
      tags,
      showOnFeed,
      releaseDate,
    }: {
      projectId: string;
      title?: string;
      description?: string;
      coverImage?: string;
      tags?: string[];
      showOnFeed?: boolean;
      releaseDate?: string;
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (coverImage !== undefined) updates.cover_image = coverImage;
      if (tags !== undefined) updates.tags = tags;
      if (showOnFeed !== undefined) updates.show_on_feed = showOnFeed;
      if (releaseDate !== undefined) updates.release_date = releaseDate || null;

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['friends-projects'] });
      queryClient.invalidateQueries({ queryKey: ['feed-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
      toast.success('Folder updated!');
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error('Failed to update folder');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['friends-projects'] });
      queryClient.invalidateQueries({ queryKey: ['feed-projects'] });
      toast.success('Folder deleted');
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete folder');
    },
  });
}
