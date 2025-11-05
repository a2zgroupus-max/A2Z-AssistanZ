import React, { useState } from 'react';

interface DownloadRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (format: 'mp3' | 'wav') => void;
}

const DownloadRecordingModal: React.FC<DownloadRecordingModalProps> = ({ isOpen, onClose, onDownload }) => {
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
    }}>
      <div className="smoked-glass-pane" style={{
          padding: '1.5rem',
          width: '100%',
          maxWidth: '24rem',
      }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem' }}>Download Recording</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Choose a format for your call recording.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            onClick={() => onDownload('mp3')}
            className="btn btn-primary"
          >
            MP3
          </button>
          <button
            onClick={() => onDownload('wav')}
            className="btn btn-secondary"
          >
            WAV
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button onClick={onClose} style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
            }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default DownloadRecordingModal;