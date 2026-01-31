import { useState } from 'react';
import { GroupPost, useDeleteGroupPost } from '@/hooks/useGroupPosts';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, MoreVertical } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

interface GroupPostsListProps {
  posts: GroupPost[];
  groupId: string;
  isAdmin?: boolean;
}

export function GroupPostsList({ posts, groupId, isAdmin }: GroupPostsListProps) {
  if (posts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No posts yet. Be the first to share something!
      </p>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {posts.map((post) => (
        <GroupPostCard 
          key={post.id} 
          post={post} 
          groupId={groupId}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

function GroupPostCard({ 
  post, 
  groupId,
  isAdmin 
}: { 
  post: GroupPost; 
  groupId: string;
  isAdmin?: boolean;
}) {
  const { profile } = useAuth();
  const deletePost = useDeleteGroupPost();
  const { signedUrl: avatarUrl } = useSignedUrl(post.author?.avatar);
  const isOwner = post.author_id === profile?.id;
  const canDelete = isOwner || isAdmin;

  const handleDelete = () => {
    if (confirm('Delete this post?')) {
      deletePost.mutate({ postId: post.id, groupId });
    }
  };

  return (
    <div className="p-3 bg-card border border-border rounded-lg">
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {post.author?.name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{post.author?.name || 'Unknown'}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {post.text_content && (
            <p className="text-sm mt-1 whitespace-pre-wrap">{post.text_content}</p>
          )}
          
          {post.audio_files?.length > 0 && (
            <div className="space-y-2 mt-2">
              {post.audio_files.map((audioUrl, i) => (
                <AudioPreview 
                  key={i} 
                  url={audioUrl} 
                  name={post.audio_file_names?.[i]} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AudioPreview({ url, name }: { url: string; name?: string }) {
  const { signedUrl } = useSignedUrl(url);
  
  if (!signedUrl) {
    return <div className="h-12 bg-secondary/50 rounded animate-pulse" />;
  }
  
  return (
    <div className="bg-secondary/30 rounded-lg p-2">
      <WaveformPlayer src={signedUrl} title={name} />
    </div>
  );
}
