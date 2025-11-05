import React, { useState } from 'react';
// FIX: Imported the correct constant 'DEPARTMENT_MAP' instead of the non-existent 'DEPARTMENTS'.
import { DEPARTMENT_MAP } from '../constants';
import DialPad from './DialPad';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (target: string) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onTransfer }) => {
  const [useDialpad, setUseDialpad] = useState(false);
  const [isLinkHovered, setIsLinkHovered] = useState(false);
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
      padding: '1rem',
    }} className="animate-fade-in">
      <div className="smoked-glass-pane animate-pop-in" style={{
        padding: '1.5rem',
        width: '100%',
        maxWidth: '24rem',
        margin: '1rem',
      }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem' }}>Transfer Call</h2>
        {useDialpad ? (
          <DialPad onDial={onTransfer} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Select a department to transfer to:</p>
            {/* FIX: Used DEPARTMENT_MAP and called the function to get the persona's role for display. */}
            {Object.entries(DEPARTMENT_MAP).map(([id, dept]) => (
              <button
                key={id}
                onClick={() => onTransfer(id)}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                }}
              >
                {dept().role} (ext. {id})
              </button>
            ))}
          </div>
        )}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => setUseDialpad(!useDialpad)} 
            onMouseEnter={() => setIsLinkHovered(true)}
            onMouseLeave={() => setIsLinkHovered(false)}
            style={{ 
                fontSize: '0.875rem', 
                color: isLinkHovered ? 'var(--color-text)' : 'var(--color-primary)', 
                textDecoration: 'underline', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                transition: 'color 0.3s ease',
            }}>
            {useDialpad ? 'Show Departments' : 'Use Dialpad'}
          </button>
          <button onClick={onClose} className="btn btn-secondary" style={{padding: '0.5rem 1rem'}}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;