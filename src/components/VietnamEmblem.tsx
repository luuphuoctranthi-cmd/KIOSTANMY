import React from 'react';

export default function VietnamEmblem({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Quốc huy nước Cộng hòa Xã hội Chủ nghĩa Việt Nam"
    >
      <defs>
        {/* Official Vietnam Flag & Emblem Red */}
        <linearGradient id="vnNationalRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E70008" />
          <stop offset="100%" stopColor="#C40000" />
        </linearGradient>

        {/* Official Vietnam Flag & Emblem Gold */}
        <linearGradient id="vnNationalGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFEA00" />
          <stop offset="100%" stopColor="#FFC107" />
        </linearGradient>

        {/* Drop Shadow for Depth */}
        <filter id="emblemShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>

      <g filter="url(#emblemShadow)">
        {/* 1. Main Red Circular Shield with Gold Border */}
        <circle cx="250" cy="205" r="180" fill="url(#vnNationalRed)" stroke="url(#vnNationalGold)" strokeWidth="8" />
        <circle cx="250" cy="205" r="175" fill="none" stroke="#A80000" strokeWidth="1.5" />

        {/* 2. Central Five-pointed Yellow Star */}
        <polygon
          points="250,60 271,124 338,124 284,163 305,227 250,187 195,227 216,163 162,124 229,124"
          fill="url(#vnNationalGold)"
          stroke="#C40000"
          strokeWidth="0.8"
        />

        {/* 3. Left Rice Ear Sheaf (Bông lúa bên trái) */}
        <g id="left-rice-ear" fill="url(#vnNationalGold)" stroke="#A80000" strokeWidth="0.8">
          {/* Main Curved Stem */}
          <path d="M 115,265 C 80,215 85,140 142,90 C 136,110 120,150 125,190 C 128,215 140,240 155,255 Z" />
          {/* Individual Oval Grains */}
          <ellipse cx="92" cy="185" rx="14" ry="7" transform="rotate(-38 92 185)" />
          <ellipse cx="100" cy="160" rx="14" ry="7" transform="rotate(-42 100 160)" />
          <ellipse cx="110" cy="135" rx="13" ry="6.5" transform="rotate(-46 110 135)" />
          <ellipse cx="126" cy="112" rx="12" ry="6" transform="rotate(-52 126 112)" />
          <ellipse cx="146" cy="96" rx="11" ry="5.5" transform="rotate(-58 146 96)" />

          <ellipse cx="114" cy="202" rx="14" ry="7" transform="rotate(-28 114 202)" />
          <ellipse cx="122" cy="176" rx="13" ry="6.5" transform="rotate(-33 122 176)" />
          <ellipse cx="132" cy="150" rx="12" ry="6" transform="rotate(-38 132 150)" />
          <ellipse cx="146" cy="128" rx="12" ry="6" transform="rotate(-44 146 128)" />

          <ellipse cx="136" cy="220" rx="14" ry="7" transform="rotate(-18 136 220)" />
          <ellipse cx="144" cy="195" rx="13" ry="6.5" transform="rotate(-22 144 195)" />
          <ellipse cx="154" cy="170" rx="12" ry="6" transform="rotate(-27 154 170)" />
        </g>

        {/* 4. Right Rice Ear Sheaf (Bông lúa bên phải) */}
        <g id="right-rice-ear" fill="url(#vnNationalGold)" stroke="#A80000" strokeWidth="0.8">
          {/* Main Curved Stem */}
          <path d="M 385,265 C 420,215 415,140 358,90 C 364,110 380,150 375,190 C 372,215 360,240 345,255 Z" />
          {/* Individual Oval Grains */}
          <ellipse cx="408" cy="185" rx="14" ry="7" transform="rotate(38 408 185)" />
          <ellipse cx="400" cy="160" rx="14" ry="7" transform="rotate(42 400 160)" />
          <ellipse cx="390" cy="135" rx="13" ry="6.5" transform="rotate(46 390 135)" />
          <ellipse cx="374" cy="112" rx="12" ry="6" transform="rotate(52 374 112)" />
          <ellipse cx="354" cy="96" rx="11" ry="5.5" transform="rotate(58 354 96)" />

          <ellipse cx="386" cy="202" rx="14" ry="7" transform="rotate(28 386 202)" />
          <ellipse cx="378" cy="176" rx="13" ry="6.5" transform="rotate(33 378 176)" />
          <ellipse cx="368" cy="150" rx="12" ry="6" transform="rotate(38 368 150)" />
          <ellipse cx="354" cy="128" rx="12" ry="6" transform="rotate(44 354 128)" />

          <ellipse cx="364" cy="220" rx="14" ry="7" transform="rotate(18 364 220)" />
          <ellipse cx="356" cy="195" rx="13" ry="6.5" transform="rotate(22 356 195)" />
          <ellipse cx="346" cy="170" rx="12" ry="6" transform="rotate(27 346 170)" />
        </g>

        {/* 5. Industrial Cogwheel (Bánh răng công nghiệp) at Bottom Center */}
        <g id="cogwheel-center">
          <circle cx="250" cy="285" r="50" fill="url(#vnNationalGold)" stroke="#A80000" strokeWidth="2" />
          <circle cx="250" cy="285" r="32" fill="#E70008" stroke="url(#vnNationalGold)" strokeWidth="2.5" />
          <circle cx="250" cy="285" r="16" fill="url(#vnNationalGold)" stroke="#A80000" strokeWidth="1" />

          {/* Cog Teeth Around Perimeter */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <rect
              key={deg}
              x="243"
              y="228"
              width="14"
              height="15"
              rx="2"
              fill="url(#vnNationalGold)"
              stroke="#A80000"
              strokeWidth="0.8"
              transform={`rotate(${deg} 250 285)`}
            />
          ))}
        </g>

        {/* 6. Red Ribbon Wrapped Around Stalks (Dải lụa đỏ) */}
        <g id="red-ribbon-group">
          {/* Left Wing Loop */}
          <path
            d="M 95,255 C 65,265 75,295 100,305 C 120,312 142,285 142,285 Z"
            fill="url(#vnNationalRed)"
            stroke="url(#vnNationalGold)"
            strokeWidth="2.5"
          />
          <path d="M 82,295 C 95,282 125,292 138,292" fill="none" stroke="url(#vnNationalGold)" strokeWidth="1.5" />

          {/* Right Wing Loop */}
          <path
            d="M 405,255 C 435,265 425,295 400,305 C 380,312 358,285 358,285 Z"
            fill="url(#vnNationalRed)"
            stroke="url(#vnNationalGold)"
            strokeWidth="2.5"
          />
          <path d="M 418,295 C 405,282 375,292 362,292" fill="none" stroke="url(#vnNationalGold)" strokeWidth="1.5" />

          {/* Main Curved Banner Ribbon */}
          <path
            d="M 110,290 C 180,345 320,345 390,290 L 400,330 C 310,385 190,385 100,330 Z"
            fill="url(#vnNationalRed)"
            stroke="url(#vnNationalGold)"
            strokeWidth="2.5"
          />

          {/* Curved Text Paths */}
          <path id="bannerPathUpper" d="M 125,315 C 190,352 310,352 375,315" fill="none" />
          <path id="bannerPathLower" d="M 155,345 C 205,372 295,372 345,345" fill="none" />

          {/* Text Line 1: CỘNG HÒA XÃ HỘI CHỦ NGHĨA */}
          <text fill="#FFEA00" fontSize="16" fontWeight="900" fontFamily="Times New Roman, serif">
            <textPath href="#bannerPathUpper" startOffset="50%" textAnchor="middle">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA
            </textPath>
          </text>

          {/* Text Line 2: VIỆT NAM */}
          <text fill="#FFEA00" fontSize="20" fontWeight="900" fontFamily="Times New Roman, serif">
            <textPath href="#bannerPathLower" startOffset="50%" textAnchor="middle">
              VIỆT NAM
            </textPath>
          </text>
        </g>

        {/* 7. Bottom Trapezoidal Pedestal (Đế chân Quốc huy) */}
        <g id="bottom-pedestal-base">
          <polygon
            points="170,365 330,365 352,440 148,440"
            fill="url(#vnNationalRed)"
            stroke="url(#vnNationalGold)"
            strokeWidth="3"
          />

          {/* Golden Horizontal Hatch Lines */}
          {[380, 392, 404, 416, 428].map((yPos, idx) => (
            <line
              key={idx}
              x1={168 + idx * 3.5}
              y1={yPos}
              x2={332 - idx * 3.5}
              y2={yPos}
              stroke="url(#vnNationalGold)"
              strokeWidth="1.5"
              opacity="0.85"
            />
          ))}

          {/* Vertical Bars (|||||) in Center Pedestal */}
          <g fill="url(#vnNationalGold)" stroke="#A80000" strokeWidth="0.5">
            <rect x="224" y="382" width="6.5" height="42" rx="1" />
            <rect x="237" y="382" width="6.5" height="42" rx="1" />
            <rect x="250" y="382" width="6.5" height="42" rx="1" />
            <rect x="263" y="382" width="6.5" height="42" rx="1" />
            <rect x="276" y="382" width="6.5" height="42" rx="1" />
          </g>
        </g>
      </g>
    </svg>
  );
}


