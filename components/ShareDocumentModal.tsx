import React, { useState } from 'react';

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (emails: string[]) => void;
  sharedWith: string[];
}

const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({ isOpen, onClose, onShare, sharedWith }) => {
  const [emails, setEmails] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  if (!isOpen) return null;

  const handleShare = () => {
    const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
    if (emailList.length > 0) {
      onShare(emailList);
      setShareStatus(`Document shared successfully with ${emailList.join(', ')}.`);
      setEmails('');
      setTimeout(() => setShareStatus(''), 3000);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem'
    }} className="animate-fade-in">
      <div className="smoked-glass-pane animate-pop-in" style={{
        width: '100%', maxWidth: '32rem',
        display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem'
      }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem' }}>
          Share Document
        </h2>
        
        <div className="form-group">
            <label htmlFor="share-emails">Recipient Email(s)</label>
            <input 
                type="email" 
                id="share-emails"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
            />
            <p style={{fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem'}}>Separate multiple emails with a comma.</p>
        </div>
        
        {shareStatus && <p style={{fontSize: '0.875rem', color: 'var(--color-success)'}}>{shareStatus}</p>}
        
        {sharedWith.length > 0 && (
            <div>
                <h3 style={{fontWeight: 500, marginBottom: '0.5rem'}}>Already shared with:</h3>
                <div style={{maxHeight: '100px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px'}}>
                    {sharedWith.map((email, index) => (
                        <div key={index} style={{fontSize: '0.875rem', color: 'var(--color-text-muted)'}}>{email}</div>
                    ))}
                </div>
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={handleShare} className="btn btn-primary" disabled={!emails.trim()}>Share</button>
        </div>
      </div>
    </div>
  );
};

export default ShareDocumentModal;
