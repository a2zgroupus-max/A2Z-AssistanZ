import React, { useRef, useEffect } from 'react';

interface VoiceVisualizerProps {
  stream: MediaStream | null;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Initialize useRef with null to satisfy TypeScript. `useRef<number>()` is invalid as it has no initial value.
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;
    // FIX: Use cross-browser compatible AudioContext instantiation.
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    source.connect(analyser);

    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount; // 64
    const dataArray = new Uint8Array(bufferLength);

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3.5;
    
    const renderFrame = () => {
      if (!isMounted) return;
      animationFrameId.current = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Draw outer circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(192, 178, 131, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw pulsing lines
      const bars = 64;
      for (let i = 0; i < bars; i++) {
        const barHeight = (dataArray[i] / 255) * 40; // max height of 40px
        const angle = (i / bars) * 2 * Math.PI;

        const startX = centerX + Math.cos(angle) * radius;
        const startY = centerY + Math.sin(angle) * radius;
        const endX = centerX + Math.cos(angle) * (radius + barHeight);
        const endY = centerY + Math.sin(angle) * (radius + barHeight);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(192, 178, 131, ${Math.max(0.2, dataArray[i] / 255)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    renderFrame();

    return () => {
      isMounted = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return (
    <div style={{
        width: '128px',
        height: '128px',
        borderRadius: '50%',
        backgroundColor: 'rgba(192, 178, 131, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        border: '2px solid var(--color-primary)',
        padding: '8px',
        flexShrink: 0
    }}>
        <canvas ref={canvasRef} width="128" height="128" />
    </div>
  );
};

export default VoiceVisualizer;