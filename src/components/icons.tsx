import type { SVGProps } from 'react';

export function JMKTradingLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <path
        fill="#004d61"
        d="M232,216a8,8,0,0,1-8,8H32a8,8,0,0,1-6.4-12.8l96-128a8,8,0,0,1,12.8,0l96,128A8,8,0,0,1,232,216Z"
        transform="scale(1, 0.2) translate(0, 830)"
      />
      <path
        fill="#007a99"
        d="M24,72v128h88V48.15A7.94,7.94,0,0,0,105.6,40L24,56Z"
        transform="translate(0, -10)"
      />
      <path
        fill="#007a99"
        d="M232,72v128h-88V48.15a7.94,7.94,0,0,1,6.4-7.85L232,56Z"
        transform="translate(0, -10)"
      />
      <path
        fill="#00c2e0"
        d="M112,48.15V190H32V64.21Z"
        transform="translate(0, -10)"
      />
      <path
        fill="#00c2e0"
        d="M144,48.15V190h80V64.21Z"
        transform="translate(0, -10)"
      />
    </svg>
  );
}
