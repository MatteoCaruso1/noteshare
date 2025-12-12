import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useFriendsProjects() {
  return useQuery({
    queryKey: ['friends-projects'],
    queryFn: async () => {
      // Get projects from users that we have mutual follows with
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_owner_id_fkey (*)
        `)
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
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as Project;
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
    }: {
      ownerId: string;
      title: string;
      description?: string;
      coverImage?: string;
      tags?: string[];
      showOnFeed?: boolean;
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
        })
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['friends-projects'] });
      toast.success('Project created!');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
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
    }: {
      projectId: string;
      title?: string;
      description?: string;
      coverImage?: string;
      tags?: string[];
      showOnFeed?: boolean;
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (coverImage !== undefined) updates.cover_image = coverImage;
      if (tags !== undefined) updates.tags = tags;
      if (showOnFeed !== undefined) updates.show_on_feed = showOnFeed;

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['friends-projects'] });
      toast.success('Project updated!');
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
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
      toast.success('Project deleted');
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    },
  });
}
