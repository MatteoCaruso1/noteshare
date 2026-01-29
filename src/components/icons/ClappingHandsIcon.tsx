import { cn } from '@/lib/utils';

interface ClappingHandsIconProps {
  className?: string;
}

export function ClappingHandsIcon({ className }: ClappingHandsIconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={cn("w-4 h-4", className)}
    >
      {/* Left hand */}
      <path d="M7 15.5c-1.5-1-2.5-2.5-2.5-4.5 0-1 .5-2 1.5-2.5" />
      <path d="M6 8.5c-.5-.5-.5-1.5 0-2s1.5-.5 2 0l4 4" />
      <path d="M4.5 11c-.5-.5-.5-1.5 0-2s1.5-.5 2 0" />
      
      {/* Right hand */}
      <path d="M17 15.5c1.5-1 2.5-2.5 2.5-4.5 0-1-.5-2-1.5-2.5" />
      <path d="M18 8.5c.5-.5.5-1.5 0-2s-1.5-.5-2 0l-4 4" />
      <path d="M19.5 11c.5-.5.5-1.5 0-2s-1.5-.5-2 0" />
      
      {/* Impact lines */}
      <path d="M12 3v2" />
      <path d="M9 4l1 1.5" />
      <path d="M15 4l-1 1.5" />
    </svg>
  );
}
