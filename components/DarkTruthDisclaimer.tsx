import React, { useState } from 'react';

interface DarkTruthDisclaimerProps {
  onConsent: () => void;
  onDecline: () => void;
}

const DarkTruthDisclaimer: React.FC<DarkTruthDisclaimerProps> = ({ onConsent, onDecline }) => {
  const [isHovered, setIsHovered] = useState(false);

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
      <div className="animate-pop-in smoked-glass-pane" style={{
          padding: '2rem',
          width: '100%',
          maxWidth: '36rem',
          margin: '1rem',
      }}>
        <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: 'var(--color-primary)'
        }}>Accessing the Dark Truth Advisor</h2>
        <div style={{
            color: 'var(--color-text)',
            marginBottom: '1.5rem',
            maxHeight: '15rem',
            overflowY: 'auto',
            paddingRight: '0.5rem'
        }}>
          <p style={{ marginBottom: '1rem' }}>Please read and acknowledge the following before proceeding:</p>
          <ul style={{ listStyleType: 'disc', listStylePosition: 'inside', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>This service explores complex and potentially sensitive topics by synthesizing publicly available data.</li>
            <li>Information provided may be incomplete, controversial, or disturbing.</li>
            <li>This is an AI assistant and does not provide classified information or professional advice. It is not intended for illegal purposes.</li>
            <li>User discretion is strongly advised.</li>
          </ul>
          <p style={{ marginTop: '1rem' }}>By clicking "Agree and Continue", you acknowledge that you have read, understood, and agree to these terms.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onDecline} className="btn btn-secondary">
            Decline
          </button>
          <button
            onClick={onConsent}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="btn"
            style={{
                color: 'var(--color-bg)',
                backgroundColor: 'var(--color-primary)',
                border: 'none',
                fontWeight: 500,
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered ? '0 0 15px rgba(192, 178, 131, 0.4)' : 'none',
            }}
          >
            Agree and Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DarkTruthDisclaimer;
