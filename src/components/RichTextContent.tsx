import { useState } from 'react';
import { ExternalLink, Youtube, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextContentProps {
  content: string;
  className?: string;
  lineClamp?: number;
}

// Regex to match URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Extract YouTube video ID from various YouTube URL formats
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function YouTubePreview({ videoId, url }: { videoId: string; url: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <div className="mt-2 mb-2">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
      >
        <Youtube className="w-4 h-4 text-red-500" />
        <span>YouTube Preview</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </Button>
      
      {isExpanded && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative overflow-hidden rounded-lg border border-border bg-secondary/30 max-w-sm">
            <img
              src={thumbnailUrl}
              alt="YouTube video thumbnail"
              className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
                <div className="w-0 h-0 border-l-[16px] border-l-white border-y-[10px] border-y-transparent ml-1" />
              </div>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

function LinkPreview({ url }: { url: string }) {
  // Check if it's a YouTube URL
  const youtubeId = getYouTubeVideoId(url);
  
  if (youtubeId) {
    return <YouTubePreview videoId={youtubeId} url={url} />;
  }
  
  return null;
}

export function RichTextContent({ content, className = '', lineClamp }: RichTextContentProps) {
  // Split content by URLs and create an array of text and link elements
  const parts = content.split(URL_REGEX);
  const urls: string[] = content.match(URL_REGEX) || [];
  
  // Build elements array
  const elements: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    if (urls.includes(part)) {
      // This is a URL - render as a link
      elements.push(
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      );
    } else if (part) {
      // Regular text
      elements.push(<span key={`text-${index}`}>{part}</span>);
    }
  });

  // Collect YouTube URLs for preview
  const youtubeUrls = urls.filter(url => getYouTubeVideoId(url));

  return (
    <div className={className}>
      <p className={`text-sm whitespace-pre-wrap ${lineClamp ? `line-clamp-${lineClamp}` : ''}`}>
        {elements}
      </p>
      {/* Show YouTube previews below the text */}
      {youtubeUrls.map((url, i) => (
        <LinkPreview key={`preview-${i}`} url={url} />
      ))}
    </div>
  );
}
