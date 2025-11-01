import type { SVGProps } from 'react';

export function JMKTradingLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width="1em"
      height="1em"
      {...props}
    >
      <g strokeWidth="0" transform="translate(0, 0) scale(1)">
        <circle cx="100" cy="100" r="95" fill="#1F3F98" />
        <path
          d="M100 5 A 95 95 0 0 1 100 195 A 95 95 0 0 1 100 5 M 100 15 A 85 85 0 0 0 100 185 A 85 85 0 0 0 100 15"
          fill="#B7232A"
        />
        <text
          x="100"
          y="115"
          fontFamily="Arial-BoldMT, Arial"
          fontSize="40"
          fontWeight="bold"
          fill="white"
          textAnchor="middle"
        >
          JMK
        </text>
        <text
          x="100"
          y="150"
          fontFamily="Arial-BoldMT, Arial"
          fontSize="24"
          fontWeight="bold"
          fill="white"
          textAnchor="middle"
        >
          TRADING
        </text>
      </g>
    </svg>
  );
}
