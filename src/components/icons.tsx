import type { SVGProps } from 'react';

export function JMKTradingLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="1em"
      height="1em"
      {...props}
    >
      <g transform="translate(0, -2)">
        {/* Bar chart */}
        <rect x="30" y="32" width="8" height="12" fill="currentColor" />
        <rect x="42" y="26" width="8" height="18" fill="currentColor" />
        <rect x="54" y="20" width="8" height="24" fill="currentColor" />
        <rect x="66" y="14" width="8" height="30" fill="currentColor" />

        {/* Text "JMK TRADING" */}
        <text
          x="50"
          y="58"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fontSize="14"
          textAnchor="middle"
          fill="currentColor"
        >
          JMK
        </text>
        <text
          x="50"
          y="72"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fontSize="10"
          textAnchor="middle"
          fill="currentColor"
        >
          TRADING
        </text>
        
        {/* Handshake */}
        <path 
          d="M 20 80 C 25 70, 40 65, 50 75 C 60 65, 75 70, 80 80 L 85 90 L 60 90 L 60 85 C 58 82, 55 80, 50 80 C 45 80, 42 82, 40 85 L 40 90 L 15 90 Z" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
        />
        <path d="M 20 80 C 25 70, 40 65, 50 75" fill="none" stroke="#d9534f" strokeWidth="6" />
        <path d="M 50 75 C 60 65, 75 70, 80 80" fill="none" stroke="#0275d8" strokeWidth="6" />
      </g>
    </svg>
  );
}
