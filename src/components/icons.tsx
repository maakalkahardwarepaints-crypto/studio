import type { SVGProps } from 'react';

export function SwiftBillLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="1em"
      height="1em"
      {...props}
    >
      <rect width="100" height="100" rx="20" fill="hsl(var(--primary))" />
      <text
        x="50"
        y="55"
        fontFamily="Arial, sans-serif"
        fontSize="50"
        fill="hsl(var(--primary-foreground))"
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="bold"
      >
        SB
      </text>
    </svg>
  );
}
