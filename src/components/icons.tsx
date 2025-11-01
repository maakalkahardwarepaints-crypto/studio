import type { SVGProps } from 'react';

export function JMKTradingLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
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
      <rect fill="url(#logo-gradient)" width="50" height="50" rx="8"></rect>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        fill="white"
        fontSize="24"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
      >
        JMK
      </text>
    </svg>
  );
}
