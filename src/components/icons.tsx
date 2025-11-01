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
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <rect
        fill="url(#logo-gradient)"
        width="200"
        height="200"
        rx="20"
      ></rect>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        fill="white"
        fontSize="70"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
      >
        JMK
      </text>
      <path
        fill="white"
        d="M52.5 75c-5.52 0-10 4.48-10 10v2.5h-5c-2.76 0-5 2.24-5 5v15c0 2.76 2.24 5 5 5h5v5c0 2.76 2.24 5 5 5h12.5v-5h-10v-2.5c0-2.76-2.24-5-5-5h-2.5v-10h2.5c2.76 0 5-2.24 5-5v-2.5h10v-5H52.5zM22.5 92.5c-1.38 0-2.5 1.12-2.5 2.5v10c0 1.38 1.12 2.5 2.5 2.5h2.5v-15h-2.5z"
      ></path>
      <g fill="white" transform="translate(135, 80) scale(1.5)">
        <rect x="0" y="15" width="4" height="10" rx="1"></rect>
        <rect x="7" y="10" width="4" height="15" rx="1"></rect>
        <rect x="14" y="5" width="4" height="20" rx="1"></rect>
      </g>
    </svg>
  );
}
