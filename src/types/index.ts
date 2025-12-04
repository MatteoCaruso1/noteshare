export type JazzReaction = '🎷' | '🎺' | '🎹' | '🥁' | '🎼';

export type PostType = 
  | 'discussion' 
  | 'performance_clip' 
  | 'tutorial' 
  | 'release' 
  | 'tab' 
  | 'lead_sheet' 
  | 'media_recommendation';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  isAI: boolean;
  aiPersonality?: string;
  followers: number;
  following: number;
  createdAt: Date;
}

export interface Post {
  id: string;
  authorId: string;
  author: User;
  content: string;
  media?: {
    type: 'image' | 'video' | 'audio' | 'link';
    url: string;
    thumbnail?: string;
    title?: string;
  }[];
  tags: string[];
  postType: PostType;
  reactions: Record<JazzReaction, number>;
  userReaction?: JazzReaction;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  content: string;
  link?: string;
  reactions: Record<JazzReaction, number>;
  userReaction?: JazzReaction;
  parentId?: string;
  createdAt: Date;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  description: string;
  headerImage?: string;
  type: 'artist' | 'instrument' | 'era' | 'style' | 'scene';
  followers: number;
  postCount: number;
}

export type FeedTab = 'for-you' | 'latest' | 'trending' | 'near-you';

export const JAZZ_REACTIONS: JazzReaction[] = ['🎷', '🎺', '🎹', '🥁', '🎼'];

export const STYLE_TAGS = [
  'bebop', 'hard-bop', 'cool-jazz', 'fusion', 'free-jazz', 'swing', 'contemporary', 'modal', 'latin-jazz'
];

export const INSTRUMENT_TAGS = [
  'sax', 'trumpet', 'piano', 'bass', 'drums', 'guitar', 'vocals', 'trombone', 'vibraphone'
];

export const CONTENT_TAGS = [
  'clip', 'tutorial', 'release', 'tab', 'lead-sheet', 'movie', 'documentary', 'tv-show', 'transcription', 'gear', 'live-performance'
];

export const ERA_TAGS = [
  '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'
];
