import React, { useRef, useState } from 'react';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { FormQuestion } from '../hooks/useDocumentGenerator';

interface SignatureConsentModalProps {
  isOpen: boolean;
  question: FormQuestion | null;
  onConsent: (dataUrl: string) => void;
  onDecline: () => void;
}

const SignatureConsentModal: React.FC<SignatureConsentModalProps> = ({ isOpen, question, onConsent, onDecline }) => {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isCancelHovered, setIsCancelHovered] = useState(false);
  const [isClearHovered, setIsClearHovered] = useState(false);

  if (!isOpen || !question) return null;
  
  const handleConsent = () => {
    if (signaturePadRef.current?.isSigned()) {
      const signature = signaturePadRef.current.getSignature();
      if (signature) {
          onConsent(signature);
      }
    } else {
        alert('Please provide your signature or initials.');
    }
  };

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
      <div className="animate-pop-in" style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '36rem',
          margin: '1rem',
          border: '1px solid rgba(192, 178, 131, 0.2)',
      }}>
        <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '1rem',
        }}>
          {question.type === 'signature' ? 'Electronic Signature Consent' : 'Electronic Initials Consent'} for {question.partyName}
        </h2>
        <div style={{
            color: 'var(--color-text)',
            marginBottom: '1.5rem',
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: '1rem',
            borderRadius: '8px',
            maxHeight: '10rem',
            overflowY: 'auto'
        }}>
           <h3 style={{fontWeight: 500, color: 'var(--color-text)'}}>Please review and agree:</h3>
           <p style={{fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem'}}>{question.summary}</p>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <label style={{marginBottom: '0.5rem', fontWeight: 500}}>
              Please {question.type === 'signature' ? 'sign' : 'initial'} in the box below:
            </label>
            <SignaturePad ref={signaturePadRef} width={400} height={200} />
            <button 
                onClick={() => signaturePadRef.current?.clear()} 
                onMouseEnter={() => setIsClearHovered(true)}
                onMouseLeave={() => setIsClearHovered(false)}
                style={{
                    fontSize: '0.875rem',
                    color: isClearHovered ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    marginTop: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    transition: 'color 0.3s ease',
                }}
            >
                Clear
            </button>
        </div>
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem'}}>
          <button
            onClick={onDecline}
            onMouseEnter={() => setIsCancelHovered(true)}
            onMouseLeave={() => setIsCancelHovered(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConsent}
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
            Agree and Sign
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureConsentModal;