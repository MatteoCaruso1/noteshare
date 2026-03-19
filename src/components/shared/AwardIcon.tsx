import { memo } from 'react';
import { AwardTier } from '@/lib/awardUtils';

interface AwardIconProps {
  tier: AwardTier;
  achieved: boolean;
  size?: number;
  count?: number;  // For streak trophies: how many times achieved
  className?: string;
}

/**
 * SVG icon for an award badge. Uses category-specific icon shape.
 * Filled when achieved, outlined when not.
 */
export const AwardIcon = memo(function AwardIcon({
  tier,
  achieved,
  size = 14,
  count,
  className = '',
}: AwardIconProps) {
  // All categories use outline-only (colored stroke, no fill)
  const fillColor = 'transparent';
  const strokeColor = achieved ? tier.fillColor : 'hsl(var(--muted-foreground) / 0.4)';
  const opacity = achieved ? 1 : 0.4;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ opacity }}
    >
      {tier.category === 'streak' && (
        // Trophy icon
        <g fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill={fillColor} />
          {achieved && count != null && count > 0 && (
            <text
              x="12"
              y="8"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={String(count).length === 1 ? 7 : String(count).length === 2 ? 6 : 5}
              fontWeight="bold"
              fill={strokeColor}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {count > 99 ? '99+' : count}
            </text>
          )}
        </g>
      )}
      {tier.category === 'notes' && (
        // Notebook/document icon
        <g fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill={fillColor} />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 13H8" />
          <path d="M16 17H8" />
          <path d="M16 13h-2" />
        </g>
      )}
      {tier.category === 'hours' && (
        // Clock icon
        <g fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" fill={fillColor} />
          <polyline points="12 6 12 12 16 14" />
        </g>
      )}
      {tier.category === 'legend' && (
        // Noteshare double eighth notes icon
        <g transform="translate(2, 1) scale(0.833)">
          <ellipse cx="7" cy="19" rx="3" ry="2.4" fill={strokeColor} transform="rotate(-15, 7, 19)" />
          <ellipse cx="17" cy="17" rx="3" ry="2.4" fill={strokeColor} transform="rotate(-15, 17, 17)" />
          <rect x="9.2" y="5" width="1.6" height="14.5" rx="0.8" fill={strokeColor} />
          <rect x="19.2" y="3" width="1.6" height="14.5" rx="0.8" fill={strokeColor} />
          <rect x="9.2" y="3" width="11.6" height="2" rx="1" fill={strokeColor} />
          <rect x="9.2" y="7" width="11.6" height="2" rx="1" fill={strokeColor} />
        </g>
      )}
    </svg>
  );
});
