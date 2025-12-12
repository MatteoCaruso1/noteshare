import { Post, JazzReaction, MediaItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { JazzReactions } from './JazzReactions';
import { MessageCircle, Share2, Bookmark, MoreHorizontal, AlertTriangle, Bot, ExternalLink, Youtube, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: Post;
  onReact: (postId: string, reaction: JazzReaction) => void;
  onTagClick: (tag: string) => void;
  onEngagement: () => void;
  isFlagged?: boolean;
}

function MediaLinks({ media }: { media: MediaItem[] }) {
  if (!media || media.length === 0) return null;
  
  return (
    <div className="flex flex-col gap-2 mb-4">
      {media.map((item, index) => {
        const isYoutube = item.type === 'youtube';
        const isTranscription = item.type === 'transcription' || item.type === 'lead_sheet';
        
        return (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.01] ${
              isYoutube 
                ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' 
                : 'bg-jazz-gold/10 border-jazz-gold/30 hover:border-jazz-gold/50'
            }`}
          >
            {isYoutube ? (
              <Youtube className="h-5 w-5 text-red-500 flex-shrink-0" />
            ) : (
              <FileText className="h-5 w-5 text-jazz-gold flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isYoutube ? 'text-red-400' : 'text-jazz-gold'}`}>
                {isYoutube ? 'Watch Performance' : isTranscription ? 'View Transcription' : 'View Resource'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.description || item.url}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </a>
        );
      })}
    </div>
  );
}

export function PostCard({ post, onReact, onTagClick, onEngagement, isFlagged }: PostCardProps) {
  const navigate = useNavigate();
  
  const handleInteraction = (action: () => void) => {
    onEngagement();
    action();
  };

  const handleViewComments = () => {
    navigate(`/posts/${post.id}`);
  };

  // Parse media from post (handles both camelCase and snake_case)
  const media = (post as any).media as MediaItem[] | null;

  return (
    <article className="group bg-gradient-card border border-border/50 rounded-xl p-5 hover:border-border transition-all duration-300 hover:shadow-card">
      {/* Moderation warning */}
      {isFlagged && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs text-destructive">This post is under review</span>
        </div>
      )}

      {/* Author info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-jazz-gold/30 to-jazz-amber/30 flex items-center justify-center text-lg border border-jazz-gold/20 overflow-hidden">
              {post.author.avatar ? (
                <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
              ) : (
                post.author.name.charAt(0)
              )}
            </div>
            {post.author.isAI && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[10px] border-2 border-card">
                <Bot className="w-3 h-3" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground hover:text-jazz-gold cursor-pointer transition-colors">
                {post.author.name}
              </span>
              <span className="text-muted-foreground text-sm">@{post.author.username}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Content - clickable to view comments */}
      <div className="mb-4 cursor-pointer" onClick={handleViewComments}>
        <p className="text-foreground leading-relaxed whitespace-pre-wrap hover:text-foreground/90 transition-colors">
          {post.content}
        </p>
      </div>

      {/* Media links */}
      {media && media.length > 0 && <MediaLinks media={media} />}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {post.tags.map((tag) => (
          <Badge
            key={tag}
            variant="jazz"
            className="cursor-pointer hover:bg-jazz-gold/20 transition-colors text-xs"
            onClick={() => handleInteraction(() => onTagClick(tag))}
          >
            #{tag}
          </Badge>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <JazzReactions
          reactions={post.reactions}
          userReaction={post.userReaction}
          onReact={(reaction) => handleInteraction(() => onReact(post.id, reaction))}
        />

        <div className="flex items-center gap-1">
          <button
            onClick={handleViewComments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">{post.commentCount}</span>
          </button>
          <button
            onClick={() => handleInteraction(() => {})}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleInteraction(() => {})}
            className="p-2 rounded-full text-muted-foreground hover:text-jazz-gold hover:bg-jazz-gold/10 transition-colors"
          >
            <Bookmark className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
