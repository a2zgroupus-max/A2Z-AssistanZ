import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  style?: React.CSSProperties;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, style = {} }) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div style={{
        width: '100%',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '9999px',
        height: '0.625rem',
        ...style
    }}>
      <div
        style={{
            backgroundColor: 'var(--color-primary)',
            height: '0.625rem',
            borderRadius: '9999px',
            transition: 'width 300ms ease-in-out',
            width: `${clampedProgress}%`
        }}
      ></div>
    </div>
  );
};

export default ProgressBar;