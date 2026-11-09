import React from 'react';

interface PixelMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const PixelMenuButton: React.FC<PixelMenuButtonProps> = ({
  className = '',
  onClick,
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Menu / Settings"
      className={`px-1.5 py-0.5 bg-[#fffdf5] border border-[#191244] text-[#191244] font-pixel text-[7px] font-bold hover:bg-[#ffe6f0] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center leading-none shadow-pixel-xs select-none app-no-drag ${className}`}
      style={{ WebkitAppRegion: 'no-drag' as any }}
      {...props}
    >
      <span>MENU</span>
    </button>
  );
};
