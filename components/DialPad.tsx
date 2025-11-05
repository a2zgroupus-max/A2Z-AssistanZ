import React, { useState } from 'react';

interface DialPadProps {
  onDial: (number: string) => void;
}

const DialPad: React.FC<DialPadProps> = ({ onDial }) => {
  const [number, setNumber] = useState('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const handleKeyPress = (key: string) => {
    setNumber(prev => prev + key);
  };

  const handleDial = () => {
    onDial(number);
    setNumber('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <input 
        type="text" 
        value={number} 
        readOnly 
        style={{ 
            width: '100%', 
            textAlign: 'center', 
            fontSize: '1.5rem', 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            color: 'var(--color-text)',
            padding: '0.5rem', 
            borderRadius: '8px', 
            marginBottom: '1rem' 
        }} 
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {keys.map(key => (
          <button 
            key={key} 
            onClick={() => handleKeyPress(key)} 
            className="btn btn-secondary"
            style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%',
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                padding: 0
            }}
          >
            {key}
          </button>
        ))}
      </div>
      <button 
        onClick={handleDial} 
        disabled={!number} 
        className="btn btn-primary"
        style={{ 
            marginTop: '1rem', 
            padding: '0.75rem 2rem',
            borderRadius: '9999px', 
            backgroundColor: '#22c55e',
            borderColor: '#22c55e'
        }}
      >
        Call
      </button>
    </div>
  );
};

export default DialPad;