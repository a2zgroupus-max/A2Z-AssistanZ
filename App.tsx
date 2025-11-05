

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import ErrorBoundary from './components/ErrorBoundary';
import InCallView from './components/InCallView';
import { useGeminiLive } from './hooks/useGeminiLive';
import { useDocumentGenerator, GenerationPlan, WizardState } from './hooks/useDocumentGenerator';
import { CallState } from './types';
import { generateDispatcherPersona, DEPARTMENT_MAP } from './constants';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import { PhoneIcon } from './components/icons/PhoneIcon';
import DocumentGenerator from './components/DocumentGenerator';
import TestimonialsPage from './components/TestimonialsPage';
import { FileSearchIcon } from './components/icons/FileSearchIcon';
import SignUpForm from './components/SignUpForm';
import TransferModal from './components/TransferModal';
import ShareDocumentModal from './components/ShareDocumentModal';
import DarkTruthDisclaimer from './components/DarkTruthDisclaimer';
import DownloadRecordingModal from './components/DownloadRecordingModal';
import InitialDisclaimerSplash from './components/InitialDisclaimerSplash';


type AppState = 'INITIAL_DISCLAIMER' | 'IDLE' | 'READY' | 'GENERATING_DOCUMENT' | 'IN_CALL' | 'SIGN_UP' | 'VIEWING_TESTIMONIALS' | 'SHOWING_DISCLAIMER';
type ToolCall = { name: string, args: any, id: string };

const MainPage: React.FC<{
    onStartCall: () => void;
    onStartDocumentGeneration: (prompt: string) => void;
    onStartSignUp: () => void;
    onViewTestimonials: () => void;
}> = ({ onStartCall, onStartDocumentGeneration, onStartSignUp, onViewTestimonials }) => {
    const [docPrompt, setDocPrompt] = useState('');

    const handleDocGenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (docPrompt.trim()) {
            onStartDocumentGeneration(docPrompt.trim());
        }
    };

    return (
        <>
            <div className="main-page-container animate-fade-in">
                <header className="main-header">
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 5vw, 3rem)', textAlign: 'center' }}>A to Z AssistanZ</h1>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '600px', textAlign: 'center', lineHeight: 1.6 }}>
                        Instantly generate legal documents, get answers to your legal questions, or perform web-based research with our advanced AI assistants.
                    </p>
                </header>

                <main className="main-content-grid">
                    <div className="smoked-glass-pane feature-card">
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem' }}>Document Creation</h2>
                        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1.5rem' }}>Describe the document you need, and our AI will generate a customized form and final document for you.</p>
                        <form onSubmit={handleDocGenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <textarea
                                value={docPrompt}
                                onChange={(e) => setDocPrompt(e.target.value)}
                                placeholder="e.g., A non-disclosure agreement for a software project"
                                rows={4}
                                required
                            />
                            <button type="submit" disabled={!docPrompt.trim()} className="btn btn-primary" style={{ gap: '0.5rem' }}>
                                <FileSearchIcon style={{width: '20px', height: '20px'}} />
                                Create Document
                            </button>
                        </form>
                    </div>
                    <div className="smoked-glass-pane feature-card call-card">
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem' }}>Talk to an Agent</h2>
                        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1.5rem' }}>Prefer to talk? Connect with our AI IVR system to be routed to a specialized agent for your needs.</p>
                        <button onClick={onStartCall} className="btn btn-primary call-us-btn">
                            <PhoneIcon style={{width: '24px', height: '24px'}} />
                            Call Us Now
                        </button>
                    </div>
                     <div className="smoked-glass-pane feature-card grid-col-span-2" style={{ alignItems: 'center', textAlign: 'center' }}>
                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem' }}>What Our Clients Say</h2>
                        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem auto 1.5rem', maxWidth: '600px' }}>
                            Hear directly from professionals and business owners who have transformed their legal workflows with our AI.
                        </p>
                        <button onClick={onViewTestimonials} className="btn btn-secondary">
                            Explore Success Stories
                        </button>
                    </div>
                </main>
            </div>
            
            <div className="bottom-left-container">
                <button onClick={onStartSignUp} className="btn btn-primary animate-slide-up">
                    Try Free for 3 Days
                </button>
            </div>
        </>
    );
};


function App() {
    const [appState, setAppState] = useState<AppState>('INITIAL_DISCLAIMER'); // Start with disclaimer
    const [activeToolCall, setActiveToolCall] = useState<ToolCall | null>(null);
    const [docGenPlan, setDocGenPlan] = useState<GenerationPlan | null>(null);
    const [initialDocPrompt, setInitialDocPrompt] = useState('');
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [recordingToDownload, setRecordingToDownload] = useState<Blob | null>(null);

    const handleToolCall = useCallback((toolCall: ToolCall) => {
        setActiveToolCall(toolCall);
    }, []);

    const { 
        callState, error, isMuted, currentAgent, transcript, transferTarget,
        isCameraOn, userVideoStream, isAgentSpeaking, isUserSpeaking, recordedBlob,
        connectToAgent, disconnect, toggleMute, toggleCamera, sendToolResponse, 
        isRecording, startRecording, stopRecording
    } = useGeminiLive({ onToolCall: handleToolCall });
    
    const { 
        wizardState: docGenState, plan, finalDocument, error: docGenError, 
        startGenerationPlan, generateFinalDocument, reset: resetDocGen 
    } = useDocumentGenerator();

    const handleShareDocument = (emails: string[]) => {
        console.log('Sharing document with:', emails);
        const newSharedWith = [...new Set([...sharedWith, ...emails])];
        setSharedWith(newSharedWith);
    };

    // Removed initial IDLE to READY transition as it's now handled by InitialDisclaimerSplash
    // useEffect(() => {
    //     const timer = setTimeout(() => setAppState('READY'), 500);
    //     return () => clearTimeout(timer);
    // }, []);

    useEffect(() => {
        if (callState === CallState.DISCONNECTED || callState === CallState.ERROR) {
            if (recordedBlob) {
                setRecordingToDownload(recordedBlob);
                setIsDownloadModalOpen(true);
            }
            const timer = setTimeout(() => {
                if (callState === CallState.DISCONNECTED || callState === CallState.ERROR) {
                     setAppState('READY');
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [callState, recordedBlob]);

    const handleStartCall = () => {
        connectToAgent(generateDispatcherPersona());
        setAppState('IN_CALL');
    };

    const handleStartDocumentGeneration = (prompt: string) => {
        setInitialDocPrompt(prompt);
        setAppState('GENERATING_DOCUMENT');
    };
    
    const handleStartSignUp = () => {
        setAppState('SIGN_UP');
    };

    const handleViewTestimonials = () => {
        setAppState('VIEWING_TESTIMONIALS');
    };

    const handleEndCall = () => {
        disconnect();
    };

    const handleTransfer = (targetId: string) => {
        const personaGenerator = DEPARTMENT_MAP[targetId];
        if (personaGenerator) {
            connectToAgent(personaGenerator());
        } else {
            console.error(`Unknown transfer target: ${targetId}`);
        }
    };
    
    const performTransfer = (targetId: string) => {
        handleTransfer(targetId);
        setIsTransferModalOpen(false);
    };

    const handleKeypadPress = (key: string) => {
        if (key === '3') {
            setAppState('SHOWING_DISCLAIMER');
        } else {
            handleTransfer(key);
        }
    };

    const handleDisclaimerAccept = () => {
        setAppState('IN_CALL');
        handleTransfer('3'); // '3' is for Dark Truth Advisor
    };

    const handleDisclaimerDecline = () => {
        // Return to IVR by reconnecting to dispatcher
        setAppState('IN_CALL');
        connectToAgent(generateDispatcherPersona());
    };

    const handleDownloadRecording = (format: 'mp3' | 'wav') => {
        if (!recordingToDownload) return;
        const url = URL.createObjectURL(recordingToDownload);
        const a = document.createElement('a');
        a.href = url;
        a.download = `A2Z-Recording-${new Date().toISOString()}.${format}`; // mp3 not supported, but keeping for UI
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloadModalOpen(false);
        setRecordingToDownload(null);
    };

    useEffect(() => {
        if (activeToolCall?.name === 'startDocumentGeneration') {
            const { documentType } = activeToolCall.args;
            if (documentType) {
                startGenerationPlan(documentType);
            } else {
                sendToolResponse({
                    functionResponses: {
                        id: activeToolCall.id,
                        name: activeToolCall.name,
                        response: { result: "Error: The document type was not specified." }
                    }
                });
                setActiveToolCall(null);
            }
        }
    }, [activeToolCall, startGenerationPlan, sendToolResponse]);
    
    useEffect(() => {
        if (docGenState === WizardState.GATHERING && plan && activeToolCall) {
            setDocGenPlan(plan);
            const prompt = `The questionnaire is ready. Please ask the user the following questions one by one. After you have collected all the answers, say 'Thank you, I will now generate the document.' Questions: ${JSON.stringify(plan.questions)}`;
            sendToolResponse({
                functionResponses: {
                    id: activeToolCall.id,
                    name: activeToolCall.name,
                    response: { result: prompt }
                }
            });
            setActiveToolCall(null);
        } else if (docGenState === WizardState.ERROR && activeToolCall) {
            sendToolResponse({
                functionResponses: {
                    id: activeToolCall.id,
                    name: activeToolCall.name,
                    response: { result: `Error creating document plan: ${docGenError}` }
                }
            });
            setActiveToolCall(null);
        }
    }, [docGenState, plan, docGenError, activeToolCall, sendToolResponse]);

    useEffect(() => {
        const lastMessage = transcript[transcript.length - 1];
        if (
            docGenPlan &&
            lastMessage?.speaker === 'model' &&
            lastMessage.text.toLowerCase().includes('generate the document')
        ) {
            const extractAnswers = async () => {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const extractionPrompt = `Here is a list of questions in JSON format and a conversation transcript. Your task is to extract the answers for each question from the transcript. Your response MUST be ONLY a valid JSON object mapping each question 'id' to its corresponding answer.
                
                QUESTIONS:
                ${JSON.stringify(docGenPlan.questions)}
                
                TRANSCRIPT:
                ${transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')}
                `;
                
                try {
                    // FIX: Added responseMimeType and responseSchema to ensure JSON output from the model
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: extractionPrompt,
                        config: {
                          responseMimeType: "application/json",
                          responseSchema: {
                            type: Type.OBJECT, // Using string literal as Type.OBJECT requires import which is not available directly here
                            properties: Object.fromEntries(
                                docGenPlan.questions.map(q => [q.id, { type: Type.STRING }]) // Assume all extracted answers are strings for simplicity
                            )
                          }
                        }
                    });
                    
                    let jsonText = response.text.trim();
                    if (jsonText.startsWith('```json')) {
                        jsonText = jsonText.substring(7, jsonText.length - 3).trim();
                    }
                    const parsedAnswers = JSON.parse(jsonText); // Renamed to avoid collision
                    generateFinalDocument(parsedAnswers); // Use parsedAnswers
                } catch (e) {
                    console.error("Failed to extract answers from transcript:", e);
                }
            };
            extractAnswers();
        }
    }, [transcript, docGenPlan, generateFinalDocument]);


    const renderContent = () => {
        switch (appState) {
            case 'INITIAL_DISCLAIMER':
                return <InitialDisclaimerSplash onAccept={() => setAppState('READY')} />;
            case 'IDLE':
                return null; // This state might become unused or used for internal loading
            case 'READY':
                 return <MainPage 
                    onStartCall={handleStartCall} 
                    onStartDocumentGeneration={handleStartDocumentGeneration}
                    onStartSignUp={handleStartSignUp}
                    onViewTestimonials={handleViewTestimonials}
                />;
            case 'GENERATING_DOCUMENT':
                return <DocumentGenerator 
                    initialPrompt={initialDocPrompt} 
                    onBack={() => { resetDocGen(); setAppState('READY'); }} 
                />;
            case 'IN_CALL':
                return <InCallView 
                    callState={callState}
                    agent={currentAgent}
                    isMuted={isMuted}
                    error={error}
                    transferTarget={transferTarget}
                    isCameraOn={isCameraOn}
                    userVideoStream={userVideoStream}
                    isAgentSpeaking={isAgentSpeaking}
                    isUserSpeaking={isUserSpeaking}
                    isRecording={isRecording}
                    onEndCall={handleEndCall}
                    onToggleMute={toggleMute}
                    onToggleCamera={toggleCamera}
                    onToggleRecording={() => isRecording ? stopRecording() : startRecording()}
                    onOpenTransferModal={() => setIsTransferModalOpen(true)}
                    onKeypadPress={handleKeypadPress}
                />;
             case 'SIGN_UP':
                return <SignUpForm onBack={() => setAppState('READY')} />;
             case 'VIEWING_TESTIMONIALS':
                return <TestimonialsPage onBack={() => setAppState('READY')} />;
             case 'SHOWING_DISCLAIMER':
                return <DarkTruthDisclaimer 
                    onConsent={handleDisclaimerAccept}
                    onDecline={handleDisclaimerDecline}
                />;
        }
    };

    return (
        <ErrorBoundary>
            <div className="app-background"></div>
            {renderContent()}
            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onTransfer={performTransfer}
            />
            <DocumentPreviewModal
                isOpen={!!finalDocument}
                documentContent={finalDocument || ''}
                onClose={() => {
                    resetDocGen();
                    setSharedWith([]);
                }}
                onOpenShareModal={() => setIsShareModalOpen(true)}
            />
            <ShareDocumentModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                onShare={handleShareDocument}
                sharedWith={sharedWith}
            />
            <DownloadRecordingModal
                isOpen={isDownloadModalOpen}
                onClose={() => { setIsDownloadModalOpen(false); setRecordingToDownload(null); }}
                onDownload={handleDownloadRecording}
            />
        </ErrorBoundary>
    );
}

export default App;