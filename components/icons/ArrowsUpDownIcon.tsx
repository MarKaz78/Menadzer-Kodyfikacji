import React from 'react';

export const ArrowsUpDownIcon = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className || "h-6 w-6"} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M3 7l6-6 6 6M21 17l-6 6-6-6m12-10H3m18 10H3" 
        />
    </svg>
);