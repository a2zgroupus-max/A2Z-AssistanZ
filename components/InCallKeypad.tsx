import React, { useState } from 'react';
import { useDTMF } from '../hooks/useDTMF';

interface InCallKeypadProps {
  onKeyPress: (key: string) => void;
}

const InCallKeypad: React.FC<InCallKeypadProps> = ({ onKeyPress }) => {
  const { startTone, stopTone } = useDTMF();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const handlePress = (key: string) => {
      setPressedKey(key);
      startTone(key);
  };
  
  const handleRelease = (key: string) => {
      setPressedKey(null);
      stopTone();
      onKeyPress(key);
  };

  return (
    <div className="animate-pop-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', justifyItems: 'center', padding: '1rem 2rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', margin: '0 auto' }}>
      {keys.map(key => (
        <button
            key={key}
            style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none', color: 'var(--color-text)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                transition: 'background-color 0.2s ease, transform 0.1s ease',
                fontSize: '1.5rem', fontWeight: 500,
                userSelect: 'none',
                transform: pressedKey === key ? 'scale(0.9)' : 'scale(1)',
            }}
            onMouseLeave={() => { stopTone(); setPressedKey(null); }}
            onMouseDown={() => handlePress(key)}
            onMouseUp={() => handleRelease(key)}
            onTouchStart={(e) => { e.preventDefault(); handlePress(key); }}
            onTouchEnd={(e) => { e.preventDefault(); handleRelease(key); }}
        >
            {key}
        </button>
      ))}
    </div>
  );
};

export default InCallKeypad;