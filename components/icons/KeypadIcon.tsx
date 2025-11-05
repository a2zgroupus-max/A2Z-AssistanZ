import React from 'react';

export const KeypadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="8" cy="8" r="1.5" />
    <circle cx="12" cy="8" r="1.5" />
    <circle cx="16" cy="8" r="1.5" />
    <circle cx="8" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="16" cy="12" r="1.5" />
    <circle cx="8" cy="16" r="1.5" />
    <circle cx="12" cy="16" r="1.5" />
    <circle cx="16" cy="16" r="1.5" />
  </svg>
);