import React from 'react';

export const SortAscendingIcon = ({ className }: { className?: string }) => (
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
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" 
        />
    </svg>
);