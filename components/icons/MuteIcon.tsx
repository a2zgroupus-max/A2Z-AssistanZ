import React from 'react';

export const MuteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l-2.25 2.25m2.25-2.25L17.25 15M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.563A.562.562 0 0 1 9 14.437V9.564z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12a10.5 10.5 0 1 1 21 0 10.5 10.5 0 0 1-21 0z" />
  </svg>
);