/**
 * PathlyLogo — The official Pathly "P" lettermark
 *
 * Usage:
 *   <PathlyLogo size={32} />                     — dark navy (default)
 *   <PathlyLogo size={32} color="white" />        — white fill
 *   <PathlyLogo size={32} gradient />             — brand gradient fill
 */

import React from 'react';

interface PathlyLogoProps {
  size?: number;
  color?: string;
  gradient?: boolean;
  className?: string;
}

export const PATHLY_P_PATH = "M20 8 L20 54 C14 57 9 62 9 68 C9 75 15 80 22 80 C29 80 36 76 40 70 C43 65 43 59 43 54 C54 57 65 55 73 49 C83 42 86 30 83 19 C80 9 70 3 58 3 C44 3 30 5 20 8 Z M37 13 C45 10 56 11 64 16 C72 21 74 30 71 38 C68 45 60 50 51 49 L37 48 Z M20 62 C25 59 33 58 39 60 C35 66 30 72 25 75 C22 77 18 76 17 73 C16 69 17 65 20 62 Z";

export const PathlyLogo: React.FC<PathlyLogoProps> = ({
  size = 32,
  color = '#0F1835',
  gradient = false,
  className,
}) => {
  const id = `pathly-grad-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pathly"
    >
      {gradient && (
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5B5FEF" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      )}
      <path
        d={PATHLY_P_PATH}
        fill={gradient ? `url(#${id})` : color}
        fillRule="evenodd"
      />
    </svg>
  );
};

export const PathlyPMark: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d={PATHLY_P_PATH} fill={color} fillRule="evenodd" />
  </svg>
);

