import React from 'react';

export default function TanMyLogo({ className = "h-16 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 420"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo Phường Tân Mỹ - TP.Hồ Chí Minh"
    >
      <defs>
        {/* Crisp Brand Blue for Tan My Ward */}
        <linearGradient id="tanMyBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#008BE3" />
          <stop offset="100%" stopColor="#0072CE" />
        </linearGradient>
      </defs>

      {/* GRAPHIC SYMBOL */}
      <g id="tan-my-symbol">
        {/* Main Blue Outer Arc & Swoosh Base */}
        <path
          d="M 135,200 C 85,200 85,85 260,78 C 205,95 200,130 345,200 Z"
          fill="url(#tanMyBlue)"
        />

        {/* Five-Pointed Blue Star at Top Right */}
        <polygon
          points="320,35 334,80 380,80 343,107 357,152 320,124 283,152 297,107 260,80 306,80"
          fill="url(#tanMyBlue)"
        />
      </g>

      {/* TEXT SECTION - Uniform Blue & Consistent Sans-serif Font */}
      <g id="tan-my-text" fill="#0072CE">
        {/* Line 1: PHƯỜNG TÂN MỸ */}
        <text
          x="250"
          y="272"
          fontSize="40"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          textAnchor="middle"
          letterSpacing="0.5"
        >
          PHƯỜNG TÂN MỸ
        </text>

        {/* Line 2: TP.HỒ CHÍ MINH */}
        <text
          x="250"
          y="330"
          fontSize="34"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          textAnchor="middle"
          letterSpacing="0.5"
        >
          TP.HỒ CHÍ MINH
        </text>
      </g>
    </svg>
  );
}

