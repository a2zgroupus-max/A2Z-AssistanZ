
import React, { useState, useEffect, useRef } from 'react';
import { CallState } from '../types';
import { AgentPersona } from '../constants';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { EndCallIcon } from './icons/EndCallIcon';
import { MuteIcon } from './icons/MuteIcon';
import { UnmuteIcon } from './icons/UnmuteIcon';
import { KeypadIcon } from './icons/KeypadIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { TransferIcon } from './icons/TransferIcon';
import InCallKeypad from './InCallKeypad';
import { AGENT_VIDEO_URL } from '../assets/videos';
import { VideoOnIcon } from './icons/VideoOnIcon';
import { VideoOffIcon } from './icons/VideoOffIcon';
import { RecordIcon } from './icons/RecordIcon';

interface InCallViewProps {
    callState: CallState;
    agent: AgentPersona | null;
    isMuted: boolean;
    error: string | null;
    transferTarget: string | null;
    isCameraOn: boolean;
    userVideoStream: MediaStream | null;
    isAgentSpeaking: boolean;
    isUserSpeaking: boolean;
    isRecording: boolean;
    onEndCall: () => void;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onToggleRecording: () => void;
    onOpenTransferModal: () => void;
    onKeypadPress: (key: string) => void;
}

const CallControlButton: React.FC<{
    onClick?: () => void;
    title: string;
    children: React.ReactNode;
    isDisabled?: boolean;
    isActive?: boolean;
    isEndCall?: boolean;
}> = ({ onClick, title, children, isDisabled, isActive, isEndCall }) => (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`call-control-btn ${isActive ? 'active' : ''} ${isEndCall ? 'end-call-btn' : ''}`}
            aria-label={title}
        >
            {children}
        </button>
        {!isEndCall && <span className="call-control-btn-label">{title}</span>}
    </div>
);


const InCallView: React.FC<InCallViewProps> = ({ 
    callState, agent, isMuted, error, transferTarget, 
    isCameraOn, userVideoStream, isAgentSpeaking, isUserSpeaking,
    isRecording,
    onEndCall, onToggleMute, onToggleCamera, onToggleRecording, onOpenTransferModal, onKeypadPress
}) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showKeypad, setShowKeypad] = useState(false);
    const userVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (userVideoRef.current && userVideoStream) {
            userVideoRef.current.srcObject = userVideoStream;
        }
    }, [userVideoStream]);

    useEffect(() => {
        if (agent?.role === 'Dispatcher') {
            setShowKeypad(true);
        } else if (callState !== CallState.CONNECTED) {
            setShowKeypad(false);
        }
    }, [agent, callState]);

    useEffect(() => {
        let timer: number;
        if (callState === CallState.CONNECTED) {
            timer = window.setInterval(() => {
                setElapsedTime(prevTime => prevTime + 1);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(timer);
    }, [callState]);
    
    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };
    
    const renderStatus = () => {
        switch (callState) {
            case CallState.AGENT_CONNECTING:
                return (
                    <>
                        <SpinnerIcon style={{ width: '48px', height: '48px', margin: '0 auto 1rem', color: 'var(--color-primary)' }}/>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>Calling...</p>
                    </>
                );
            case CallState.TRANSFERRING:
                 return (
                    <>
                        <SpinnerIcon style={{ width: '48px', height: '48px', color: 'var(--color-primary)' }}/>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem', marginTop: '1rem' }}>
                            {transferTarget ? `Transferring to ${transferTarget}...` : 'Transferring...'}
                        </p>
                    </>
                );
            case CallState.DISCONNECTED:
                return <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Call Ended</h2>;
            case CallState.ERROR:
                 return (
                    <>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-destructive)' }}>Connection Error</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', maxWidth: '300px' }}>{error}</p>
                    </>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="video-call-container animate-fade-in">
             <video
                key={agent?.name}
                autoPlay
                loop
                muted
                playsInline
                className="remote-video"
                style={{ 
                    filter: `brightness(${isAgentSpeaking ? 0.85 : 0.7})`,
                    transition: 'filter 0.5s ease',
                }}
            >
                <source src={AGENT_VIDEO_URL} type="video/mp4" />
            </video>

            {isCameraOn && (
                <div 
                    className="self-view-container animate-pop-in" 
                    style={{
                        boxShadow: isUserSpeaking ? '0 0 20px 5px rgba(192, 178, 131, 0.4)' : '0 4px 15px rgba(0,0,0,0.3)',
                        borderColor: isUserSpeaking ? 'rgba(192, 178, 131, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                    }}
                >
                    <video ref={userVideoRef} autoPlay muted playsInline className="self-view-video" />
                </div>
            )}

            <div className="call-overlay">
                <header className="in-call-header">
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem' }}>{agent?.name || 'A²Z Assistant'}</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
                        {callState === CallState.CONNECTED ? agent?.role : (callState === CallState.AGENT_CONNECTING ? 'Connecting...' : '')}
                    </p>
                    {callState === CallState.CONNECTED && agent?.role !== 'Dispatcher' && (
                        <p className="call-timer">{formatTime(elapsedTime)}</p>
                    )}
                </header>

                <main className="in-call-main">
                    {callState !== CallState.CONNECTED && (
                        <div className="status-container smoked-glass-pane animate-pop-in" style={{textAlign: 'center'}}>
                            {renderStatus()}
                        </div>
                    )}
                    {callState === CallState.CONNECTED && showKeypad && (
                         <div className="keypad-container smoked-glass-pane">
                            <InCallKeypad onKeyPress={onKeypadPress} />
                        </div>
                    )}
                </main>

                <footer className="in-call-footer animate-slide-up">
                     {callState === CallState.CONNECTED && agent?.role !== 'Dispatcher' && (
                        <div className="in-call-controls-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: '420px' }}>
                            <CallControlButton onClick={onToggleMute} title={isMuted ? 'Unmute' : 'Mute'} isActive={isMuted}>
                                {isMuted ? <MuteIcon style={{ width: '32px', height: '32px' }} /> : <UnmuteIcon style={{ width: '32px', height: '32px' }} />}
                            </CallControlButton>
                            <CallControlButton onClick={() => setShowKeypad(p => !p)} title="Keypad" isActive={showKeypad}>
                                <KeypadIcon style={{ width: '32px', height: '32px' }} />
                            </CallControlButton>
                            <CallControlButton onClick={onToggleRecording} title={isRecording ? "Stop Rec" : "Record"} isActive={isRecording}>
                                <RecordIcon style={{ width: '32px', height: '32px', color: isRecording ? 'var(--color-destructive)' : 'currentColor' }} className={isRecording ? 'animate-pulse' : ''}/>
                            </CallControlButton>
                             <CallControlButton onClick={onToggleCamera} title={isCameraOn ? 'Cam Off' : 'Cam On'} isActive={isCameraOn}>
                                {isCameraOn ? <VideoOnIcon style={{ width: '32px', height: '32px' }} /> : <VideoOffIcon style={{ width: '32px', height: '32px' }} />}
                            </CallControlButton>
                             <CallControlButton onClick={onOpenTransferModal} title="Transfer">
                                <TransferIcon style={{ width: '32px', height: '32px' }} />
                            </CallControlButton>
                             <CallControlButton title="Speaker" isDisabled>
                                <SpeakerIcon style={{ width: '32px', height: '32px' }} />
                            </CallControlButton>
                        </div>
                     )}
                     {callState !== CallState.DISCONNECTED && callState !== CallState.ERROR && (
                        <CallControlButton onClick={onEndCall} title="End Call" isEndCall>
                            <EndCallIcon style={{ width: '36px', height: '36px' }} />
                        </CallControlButton>
                     )}
                </footer>
            </div>
        </div>
    );
};

export default InCallView;