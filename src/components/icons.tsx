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
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        {/* Background Circle */}
        <circle fill="#F0F0F0" cx="100" cy="100" r="100"></circle>
        
        {/* Handshake Icon */}
        <g transform="translate(35, 55)" fill="#1f3f98">
          <path d="M48.7,33.5 C46.9,31.7 44.6,30.7 42.2,30.7 L39.3,30.7 L39.3,27.8 C39.3,25.9 37.8,24.4 35.9,24.4 C34,24.4 32.5,25.9 32.5,27.8 L32.5,30.7 L29.6,30.7 C27.1,30.7 24.8,31.7 23,33.5 L10.1,46.4 L10.1,63.9 C10.1,65.8 11.6,67.3 13.5,67.3 L25.4,67.3 C26.7,67.3 27.8,66.2 27.8,64.9 L27.8,54.7 L31.9,50.6 L31.9,64.9 C31.9,66.2 33,67.3 34.3,67.3 L42.2,67.3 C43.5,67.3 44.6,66.2 44.6,64.9 L44.6,50.6 L48.7,54.7 L48.7,64.9 C48.7,66.2 49.8,67.3 51.1,67.3 L59,67.3 C60.9,67.3 62.4,65.8 62.4,63.9 L62.4,46.4 L48.7,33.5 Z"></path>
        </g>
        
        {/* JMK Text */}
        <text fontFamily="Arial-BoldMT, Arial" fontSize="24" fontWeight="bold" fill="#333333">
          <tspan x="80" y="130">JMK</tspan>
        </text>
        
        {/* TRADING Text */}
        <text fontFamily="Arial-BoldMT, Arial" fontSize="12" fontWeight="bold" fill="#333333">
          <tspan x="73" y="148">TRADING</tspan>
        </text>

        {/* Bar Chart */}
        <g transform="translate(110, 55)" fill="#d12f37">
          <rect x="0" y="32" width="8" height="18"></rect>
          <rect x="12" y="24" width="8" height="26"></rect>
          <rect x="24" y="15" width="8" height="35"></rect>
          <rect x="36" y="8" width="8" height="42"></rect>
        </g>
      </g>
    </svg>
  );
}