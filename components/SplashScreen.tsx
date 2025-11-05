import React from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';

const SplashScreen = () => {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    };
    const textStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: 'var(--color-text-muted)',
        fontSize: '1.125rem'
    };

    return (
        <div style={containerStyle} className="animate-fade-in">
            <div style={textStyle}>
                <SpinnerIcon style={{ width: '24px', height: '24px' }} />
                <p>Initializing Assistant...</p>
            </div>
        </div>
    );
};

export default SplashScreen;