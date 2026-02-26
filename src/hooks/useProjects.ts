import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types';
import { useFriendIds } from './useFriendIds';
import { useAuth } from './useAuth';

export function useProjects() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Fetch owned + collab projects in parallel
      const [ownedResult, collabResult] = await Promise.all([
        supabase
          .from('projects')
          .select('*, profiles!projects_owner_id_fkey (*)')
          .eq('owner_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('*, profiles!projects_owner_id_fkey (*)')
          .contains('collaborator_ids', [profile.id])
          .neq('owner_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);

      if (ownedResult.error) throw ownedResult.error;
      if (collabResult.error) throw collabResult.error;

      const all = [...(ownedResult.data || []), ...(collabResult.data || [])];
      return all.map((p: any) => ({ ...p, owner: p.profiles })) as Project[];
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFeedProjects() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['feed-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (*)
        `)
        .eq('owner_id', profile.id)
        .eq('show_on_feed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((project: any) => ({
        ...project,
        owner: project.profiles,
      }));
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

export function useFriendsFeedProjects() {
  const { data: friendIds } = useFriendIds();

  return useQuery({
    queryKey: ['friends-feed-projects'],
    queryFn: async () => {
      if (!friendIds || friendIds.length === 0) return [];

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
    enabled: friendIds !== undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

export function useFriendsProjects() {
  const { profile } = useAuth();
  const { data: friendIds } = useFriendIds();

  return useQuery({
    queryKey: ['friends-projects', profile?.id, friendIds],
    queryFn: async () => {
      if (!profile?.id || !friendIds || friendIds.length === 0) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (*)
        `)
        .in('owner_id', friendIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filter out projects where the current user is a collaborator (those show in My Folders)
      return data
        .filter((p: any) => !(p.collaborator_ids || []).includes(profile.id))
        .map((project: any) => ({
          ...project,
          owner: project.profiles,
        }));
    },
    enabled: !!profile?.id && !!friendIds && friendIds.length > 0,
    staleTime: 2 * 60 * 1000,
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
      collaboratorIds,
    }: {
      projectId: string;
      title?: string;
      description?: string;
      coverImage?: string;
      tags?: string[];
      showOnFeed?: boolean;
      releaseDate?: string;
      collaboratorIds?: string[];
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (coverImage !== undefined) updates.cover_image = coverImage;
      if (tags !== undefined) updates.tags = tags;
      if (showOnFeed !== undefined) updates.show_on_feed = showOnFeed;
      if (releaseDate !== undefined) updates.release_date = releaseDate || null;
      if (collaboratorIds !== undefined) updates.collaborator_ids = collaboratorIds;

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
