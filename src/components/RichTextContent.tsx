import { useState, useMemo, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { ExternalLink, Youtube, ChevronDown, ChevronUp, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextContentProps {
  content: string;
  className?: string;
  lineClamp?: number;
  onShowMore?: () => void;
}

// Regex to match URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Parse inline markdown formatting (**bold**, *italic*, __underline__)
 * and return React elements. Handles nested formatting.
 */
function parseInlineFormatting(text: string, keyPrefix: string): React.ReactNode[] {
  // Combined regex: **bold**, __underline__, *italic* (order matters - longest markers first)
  const INLINE_REGEX = /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*))/g;
  
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_REGEX.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(<span key={`${keyPrefix}-t${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
    }

    if (match[2] !== undefined) {
      // **bold**
      result.push(<strong key={`${keyPrefix}-b${match.index}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      // __underline__
      result.push(<span key={`${keyPrefix}-u${match.index}`} className="underline">{match[3]}</span>);
    } else if (match[4] !== undefined) {
      // *italic*
      result.push(<em key={`${keyPrefix}-i${match.index}`}>{match[4]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(<span key={`${keyPrefix}-t${lastIndex}`}>{text.substring(lastIndex)}</span>);
  }

  return result.length > 0 ? result : [<span key={`${keyPrefix}-raw`}>{text}</span>];
}

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

// Extract Spotify content info from various Spotify URL formats
function getSpotifyInfo(url: string): { type: string; id: string } | null {
  // Matches: open.spotify.com/track/ID, open.spotify.com/album/ID, open.spotify.com/playlist/ID, open.spotify.com/artist/ID, open.spotify.com/episode/ID
  const pattern = /open\.spotify\.com\/(track|album|playlist|artist|episode)\/([a-zA-Z0-9]+)/;
  const match = url.match(pattern);
  if (match) {
    return { type: match[1], id: match[2] };
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

function SpotifyPreview({ type, id, url }: { type: string; id: string; url: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Spotify embed URL
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  
  // Determine height based on content type
  const getHeight = () => {
    switch (type) {
      case 'track':
      case 'episode':
        return 152;
      case 'album':
      case 'playlist':
        return 352;
      case 'artist':
        return 352;
      default:
        return 152;
    }
  };

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

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
        <Music className="w-4 h-4 text-[#1DB954]" />
        <span>Spotify {typeLabel}</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </Button>
      
      {isExpanded && (
        <div 
          className="mt-2 max-w-sm rounded-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <iframe
            src={embedUrl}
            width="100%"
            height={getHeight()}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
          />
        </div>
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
  
  // Check if it's a Spotify URL
  const spotifyInfo = getSpotifyInfo(url);
  if (spotifyInfo) {
    return <SpotifyPreview type={spotifyInfo.type} id={spotifyInfo.id} url={url} />;
  }
  
  return null;
}

// Check if content contains HTML tags
function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

// Extract plain text from HTML for URL detection
function extractTextFromHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export function RichTextContent({ content, className = '', lineClamp, onShowMore }: RichTextContentProps) {
  const isHtml = useMemo(() => isHtmlContent(content), [content]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  
  // Extract URLs from content (works for both plain text and HTML)
  const urls = useMemo(() => {
    const textContent = isHtml ? extractTextFromHtml(content) : content;
    return textContent.match(URL_REGEX) || [];
  }, [content, isHtml]);
  
  // Collect URLs that have previews (YouTube or Spotify)
  const previewUrls = useMemo(() => 
    urls.filter(url => getYouTubeVideoId(url) || getSpotifyInfo(url)),
    [urls]
  );

  // Use 8 line clamp for both mobile and desktop when lineClamp is specified
  const lineClampClass = lineClamp ? 'line-clamp-[8]' : '';

  // Check if content is truncated
  useEffect(() => {
    if (contentRef.current && lineClamp) {
      const element = contentRef.current;
      setIsTruncated(element.scrollHeight > element.clientHeight);
    }
  }, [content, lineClamp]);

  const sanitizedHtml = useMemo(() => {
    if (!isHtml) return '';
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'br', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span', 'div', 's', 'sub', 'sup', 'hr'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-type', 'data-id', 'data-label'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [content, isHtml]);

  // For HTML content (from TipTap), render as sanitized HTML
  if (isHtml) {
    return (
      <div className={className}>
        <div 
          ref={contentRef}
          className={`text-sm prose prose-sm prose-invert max-w-none ${lineClampClass}`}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
        {/* Show more link - X style */}
        {lineClamp && isTruncated && onShowMore && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowMore();
            }}
            className="text-sm text-primary hover:underline mt-1 block"
          >
            Show more
          </button>
        )}
        {/* Show previews below the text */}
        {previewUrls.map((url, i) => (
          <LinkPreview key={`preview-${i}`} url={url} />
        ))}
      </div>
    );
  }

  // For plain text content, split by URLs and create elements
  const parts = content.split(URL_REGEX);
  
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

  return (
    <div className={className}>
      <p ref={contentRef} className={`text-sm whitespace-pre-wrap ${lineClampClass}`}>
        {elements}
      </p>
      {/* Show more link - X style */}
      {lineClamp && isTruncated && onShowMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowMore();
          }}
          className="text-sm text-primary hover:underline mt-1 block"
        >
          Show more
        </button>
      )}
      {/* Show previews below the text */}
      {previewUrls.map((url, i) => (
        <LinkPreview key={`preview-${i}`} url={url} />
      ))}
    </div>
  );
}
