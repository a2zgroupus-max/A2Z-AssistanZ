import React, { useState } from 'react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onAccept }) => {
  const [isHovered, setIsHovered] = useState(false);
  if (!isOpen) return null;

  return (
    <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem'
    }} className="animate-fade-in">
      <div className="animate-pop-in" style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
          padding: '2rem',
          width: '100%',
          maxWidth: '32rem',
          margin: '1rem',
          border: '1px solid rgba(192, 178, 131, 0.2)',
      }}>
        <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: 'var(--color-primary)'
        }}>Important Disclaimer</h2>
        <div style={{
            color: 'var(--color-text)',
            marginBottom: '1.5rem',
            maxHeight: '15rem',
            overflowY: 'auto',
            paddingRight: '0.5rem'
        }}>
          <p style={{ marginBottom: '1rem' }}>Welcome to A²Z Legal AI. Before you proceed, please read and acknowledge the following:</p>
          <ul style={{ listStyleType: 'disc', listStylePosition: 'inside', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>Not Legal Advice:</strong> This is an AI assistant. The information provided is for informational purposes only and does not constitute legal advice.</li>
            <li><strong>No Attorney-Client Relationship:</strong> Your use of this service does not create an attorney-client relationship.</li>
            <li><strong>Consult a Professional:</strong> You should always consult with a qualified attorney for advice regarding your individual situation.</li>
          </ul>
          <p style={{ marginTop: '1rem' }}>By clicking "Accept and Continue", you acknowledge that you have read, understood, and agree to this disclaimer.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onAccept}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="btn"
            style={{
                color: 'var(--color-bg)',
                backgroundColor: isHovered ? '#D4C69E' :'var(--color-primary)',
                border: 'none',
                fontWeight: 500,
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered ? '0 0 15px rgba(212, 198, 158, 0.4)' : 'none',
            }}
          >
            Accept and Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;