import React from 'react';

interface VideoBackgroundProps {
  videoUrl: string;
  children: React.ReactNode;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ videoUrl, children }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

export default VideoBackground;