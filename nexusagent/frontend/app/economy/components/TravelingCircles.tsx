import React, { useEffect, useRef } from 'react';
import { TravelingCircle } from '../types';

interface TravelingCirclesProps {
  circles: TravelingCircle[];
}

interface AnimatedCircleProps {
  circle: TravelingCircle;
}

// Bug Fix 1: Store cleanup timeouts in ref, clear all on unmount
const AnimatedCircle: React.FC<AnimatedCircleProps> = ({ circle }) => {
  const elapsed = Date.now() - circle.startTime;
  const progress = Math.min(elapsed / circle.duration, 1);
  const x = circle.fromX + (circle.toX - circle.fromX) * progress;
  const y = circle.fromY + (circle.toY - circle.fromY) * progress;
  const opacity = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;

  return (
    <g>
      {/* Glow trail — slightly larger, more transparent circle behind */}
      <circle
        cx={x}
        cy={y}
        r={10}
        fill={circle.color}
        opacity={opacity * 0.2}
        className="circle-trail"
      />
      {/* Mid trail */}
      <circle
        cx={x}
        cy={y}
        r={7}
        fill={circle.color}
        opacity={opacity * 0.4}
      />
      {/* Main circle */}
      <circle
        cx={x}
        cy={y}
        r={5}
        fill={circle.color}
        opacity={opacity}
        style={{ filter: `drop-shadow(0 0 4px ${circle.color})` }}
      />
    </g>
  );
};

export const TravelingCircles: React.FC<TravelingCirclesProps> = ({ circles }) => {
  const frameRef = useRef<number | null>(null);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const cleanupTimers = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    const animate = () => {
      forceUpdate();
      frameRef.current = requestAnimationFrame(animate);
    };

    if (circles.length > 0) {
      frameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [circles.length]);

  // Bug Fix 1: cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all stored timeouts to prevent memory leaks
      cleanupTimers.current.forEach(t => clearTimeout(t));
      cleanupTimers.current.clear();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (circles.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-20"
      style={{ isolation: 'isolate' }}
    >
      <defs>
        <filter id="circle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#circle-glow)">
        {circles.map(circle => (
          <AnimatedCircle key={circle.id} circle={circle} />
        ))}
      </g>
    </svg>
  );
};
