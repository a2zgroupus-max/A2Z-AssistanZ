import React from 'react';

const TypingIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0' }}>
        <div className="animate-bounce" style={{ width: '0.5rem', height: '0.5rem', backgroundColor: 'var(--color-text-muted)', borderRadius: '9999px', animationDelay: '-0.3s' }}></div>
        <div className="animate-bounce" style={{ width: '0.5rem', height: '0.5rem', backgroundColor: 'var(--color-text-muted)', borderRadius: '9999px', animationDelay: '-0.15s' }}></div>
        <div className="animate-bounce" style={{ width: '0.5rem', height: '0.5rem', backgroundColor: 'var(--color-text-muted)', borderRadius: '9999px' }}></div>
    </div>
);

export default TypingIndicator;