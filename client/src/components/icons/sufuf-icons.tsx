import * as React from "react";

export const SufufIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative ${className}`} style={{ filter: 'brightness(0) saturate(100%) invert(36%) sepia(18%) saturate(1643%) hue-rotate(307deg) brightness(93%) contrast(89%)' }}>
    <img 
      src="/shalat_2914744.png"
      alt="Sufuf Icon"
      className="w-full h-full object-contain"
    />
  </div>
);