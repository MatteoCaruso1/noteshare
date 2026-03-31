import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TapTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  /** When set, mobile taps call this instead of toggling the popover. Tooltip still shows on desktop hover. */
  onTap?: () => void;
}

/**
 * A tooltip component that works on both mobile (tap to open) and desktop (hover + click).
 * Uses Popover under the hood for reliable tap/click behavior across devices.
 */
export function TapTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 4,
  className,
  onTap,
}: TapTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const isTouchRef = React.useRef(false);

  // Clear timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    // Small delay to prevent flicker when moving between trigger and content
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 100);
  };

  const handleTouchStart = () => {
    isTouchRef.current = true;
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    // If onTap is provided and this is a touch interaction, fire the action directly
    if (onTap && isTouchRef.current) {
      isTouchRef.current = false;
      onTap();
      return;
    }
    isTouchRef.current = false;
    setOpen((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onTap) {
        onTap();
      } else {
        setOpen((prev) => !prev);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      // Only allow Radix to close (e.g. clicking outside / pressing Escape).
      // Opening is handled manually in handleClick to avoid double-toggle.
      if (!newOpen) setOpen(false);
    }}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          onTouchStart={handleTouchStart}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onKeyDown={handleKeyDown}
          className={cn('inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full', className)}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-auto max-w-[240px] px-3 py-1.5 text-sm rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
