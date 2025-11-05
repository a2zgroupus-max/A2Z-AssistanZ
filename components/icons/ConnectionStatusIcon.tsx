import React from 'react';

interface ConnectionStatusIconProps {
  quality: number; // 1: poor, 2: fair, 3: good, 4: excellent
}

export const ConnectionStatusIcon: React.FC<ConnectionStatusIconProps> = ({ quality }) => {
  const getColor = () => {
    if (quality >= 3) return 'text-green-500'; // Good or Excellent
    if (quality === 2) return 'text-yellow-500'; // Fair
    return 'text-red-500'; // Poor
  };

  const colorClass = getColor();
  const barHeights = ['h-1', 'h-2', 'h-3', 'h-4'];
  const opacities = [
    quality >= 1 ? 'opacity-100' : 'opacity-30',
    quality >= 2 ? 'opacity-100' : 'opacity-30',
    quality >= 3 ? 'opacity-100' : 'opacity-30',
    quality >= 4 ? 'opacity-100' : 'opacity-30',
  ];
  const titleText = ['Poor', 'Fair', 'Good', 'Excellent'][quality - 1] || 'Unknown';

  return (
    <div className={`flex items-end space-x-1 ${colorClass}`} title={`Connection: ${titleText}`}>
      <span className={`w-1.5 ${barHeights[0]} ${opacities[0]} bg-current rounded-full transition-opacity`}></span>
      <span className={`w-1.5 ${barHeights[1]} ${opacities[1]} bg-current rounded-full transition-opacity`}></span>
      <span className={`w-1.5 ${barHeights[2]} ${opacities[2]} bg-current rounded-full transition-opacity`}></span>
      <span className={`w-1.5 ${barHeights[3]} ${opacities[3]} bg-current rounded-full transition-opacity`}></span>
    </div>
  );
};