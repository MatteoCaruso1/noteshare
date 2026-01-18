import { memo } from 'react';
import { StreakTierInfo } from '@/lib/streakUtils';

interface TrophyWithNumberProps {
  tier: StreakTierInfo;
  count?: number;
  size?: number;
  className?: string;
}

/**
 * SVG-based trophy icon with embedded number text.
 * Uses SVG coordinate system for pixel-perfect, consistent positioning
 * across all platforms, pages, and screen sizes.
 */
export const TrophyWithNumber = memo(function TrophyWithNumber({
  tier,
  count,
  size = 14,
  className = '',
}: TrophyWithNumberProps) {
  if (tier.tier === 'none') return null;

  const displayCount = count && count > 0
    ? (count > 99 ? '99+' : String(count))
    : null;

  // Map tier color classes to actual HSL values for SVG fill
  const colorMap: Record<string, string> = {
    'text-yellow-500': 'hsl(48, 96%, 53%)',
    'text-slate-400': 'hsl(215, 14%, 62%)',
    'text-amber-600': 'hsl(32, 95%, 44%)',
    'text-primary': 'hsl(var(--primary))',
  };

  const fillColor = colorMap[tier.colorClass] || 'currentColor';

  // Calculate font size based on digit count for optimal fit
  const getFontSize = () => {
    if (!displayCount) return 7;
    if (displayCount.length === 1) return 7;
    if (displayCount.length === 2) return 6;
    return 5; // For "99+"
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Trophy icon paths from Lucide - rendered as filled shape */}
      <g
        fill="none"
        stroke={fillColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      >
        {/* Left handle */}
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        {/* Right handle */}
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        {/* Base */}
        <path d="M4 22h16" />
        {/* Left stem */}
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        {/* Right stem */}
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        {/* Cup body */}
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </g>

      {/* Number text - positioned precisely in SVG coordinate space */}
      {displayCount && (
        <text
          x="12"
          y="8"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={getFontSize()}
          fontWeight="bold"
          fill={fillColor}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {displayCount}
        </text>
      )}
    </svg>
  );
});
