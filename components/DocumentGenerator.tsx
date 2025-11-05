
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDocumentGenerator, WizardState, FormQuestion, REVISION_SYSTEM_INSTRUCTION } from '../hooks/useDocumentGenerator';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import SignatureConsentModal from './SignatureConsentModal';
import { PdfIcon } from './icons/PdfIcon';
import { WordIcon } from './icons/WordIcon'; // Import the new Word icon
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { GoogleGenAI, Type } from '@google/genai';


interface DocumentGeneratorProps {
  onBack: () => void;
  initialPrompt: string;
}

// FIX: Redefined global types for SpeechRecognition and webkitSpeechRecognition
// to avoid self-referencing type annotation errors and ensure global availability.
interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
    prototype: SpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionConstructor;
        webkitSpeechRecognition: SpeechRecognitionConstructor;
    }
    // Also ensuring the base SpeechRecognition interface is known, if not provided by default libs
    interface SpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
        onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
        onend: ((this: SpeechRecognition, ev: Event) => any) | null;
        onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
        start(): void;
        stop(): void;
        abort(): void;
    }
    // Minimal definitions for SpeechRecognitionEvent and related types used in this file
    interface SpeechRecognitionEvent extends Event {
        readonly resultIndex: number;
        readonly results: SpeechRecognitionResultList;
    }
    interface SpeechRecognitionResultList {
        readonly [index: number]: SpeechRecognitionResult;
        readonly length: number;
        item(index: number): SpeechRecognitionResult;
    }
    interface SpeechRecognitionResult {
        readonly [index: number]: SpeechRecognitionAlternative;
        readonly isFinal: boolean;
        readonly length: number;
        item(index: number): SpeechRecognitionAlternative;
    }
    interface SpeechRecognitionAlternative {
        readonly confidence: number;
        readonly transcript: string;
    }
    interface SpeechRecognitionErrorEvent extends Event {
        readonly error: string; // Simplified for this context
        readonly message: string;
    }
}


const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ onBack, initialPrompt }) => {
    const { 
        wizardState, 
        plan, 
        finalDocument, 
        error: docGenError, // Renamed to avoid collision with local error state
        startGenerationPlan, 
        generateFinalDocument, 
        reset,
        getAiInstance
    } = useDocumentGenerator();
    
    const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
    const [currentSignatureQuestion, setCurrentSignatureQuestion] = useState<FormQuestion | null>(null);
    const [isBackHovered, setIsBackHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [documentContent, setDocumentContent] = useState('');

    // FIX: Add local state for revision-specific errors
    const [revisionError, setRevisionError] = useState<string | null>(null);
    const [generatedMetadata, setGeneratedMetadata] = useState<{ originalPrompt: string; generationDate: string; } | null>(null);

    const [editPrompt, setEditPrompt] = useState('');
    const [isRecordingVoiceEdit, setIsRecordingVoiceEdit] = useState(false);
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null);


    useEffect(() => {
        if (initialPrompt && wizardState === WizardState.IDLE) {
            startGenerationPlan(initialPrompt);
        }
    }, [initialPrompt, wizardState, startGenerationPlan]);

    useEffect(() => {
        if (finalDocument) {
            setDocumentContent(finalDocument);
            if (!generatedMetadata) { // Set metadata only once when entering PREVIEW
                setGeneratedMetadata({
                    originalPrompt: initialPrompt,
                    generationDate: new Date().toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    }),
                });
            }
        }
    }, [finalDocument, initialPrompt, generatedMetadata]);

    // Initialize SpeechRecognition
    useEffect(() => {
        // FIX: Reference window.SpeechRecognition directly. TypeScript now understands this after global declare.
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true; // Get results while speaking

            recognition.onstart = () => {
                setIsRecordingVoiceEdit(true);
            };

            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setEditPrompt(prev => prev + finalTranscript); // Append final results
                // Display interim results in UI if needed (e.g., in a separate temporary field)
            };

            recognition.onend = () => {
                setIsRecordingVoiceEdit(false);
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setIsRecordingVoiceEdit(false);
                alert(`Speech recognition error: ${event.error}. Please ensure microphone access.`);
            };

            speechRecognitionRef.current = recognition;
        } else {
            console.warn("Web Speech API not supported in this browser.");
        }

        return () => {
            if (speechRecognitionRef.current) {
                speechRecognitionRef.current.stop();
            }
        };
    }, []);

    const toggleVoiceInput = useCallback(() => {
        if (!speechRecognitionRef.current) {
            alert("Speech recognition is not supported in your browser or microphone access is denied.");
            return;
        }

        if (isRecordingVoiceEdit) {
            speechRecognitionRef.current.stop();
        } else {
            setEditPrompt(''); // Clear previous prompt before new recording
            speechRecognitionRef.current.start();
        }
    }, [isRecordingVoiceEdit]);

    const handleFormChange = (id: string, value: any) => {
        setFormAnswers(prev => ({ ...prev, [id]: value }));
    };
    
    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        generateFinalDocument(formAnswers);
    };

    const handleReviseDocument = useCallback(async () => {
        if (!editPrompt.trim()) {
            alert("Please enter revision instructions or use voice input.");
            return;
        }
        if (!documentContent) {
            alert("No document to revise.");
            return;
        }

        setIsProcessingEdit(true);
        // FIX: Use local revisionError state instead of undefined setError
        setRevisionError(null);

        try {
            const ai = getAiInstance();
            const revisionPrompt = `DOCUMENT TO REVISE:\n\`\`\`\n${documentContent}\n\`\`\`\n\nREVISION INSTRUCTIONS:\n${editPrompt}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: revisionPrompt,
                config: {
                    systemInstruction: REVISION_SYSTEM_INSTRUCTION,
                }
            });

            setDocumentContent(response.text);
            setEditPrompt(''); // Clear the prompt after revision
        } catch (e) {
            console.error("Document revision error:", e);
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during revision.';
            // FIX: Use local revisionError state instead of undefined setError
            setRevisionError(`Failed to revise document: ${errorMessage}`);
        } finally {
            setIsProcessingEdit(false);
        }
    }, [documentContent, editPrompt, getAiInstance]);

    const handleDownload = async (format: 'pdf' | 'docx') => {
        if (!documentContent) return;

        if (format === 'pdf') {
             const previewEl = document.getElementById('doc-preview');
             if (previewEl) {
                 const originalBg = previewEl.style.backgroundColor;
                 previewEl.style.backgroundColor = 'transparent';
                 await html2canvas(previewEl, { 
                     scale: 2, 
                     backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface'),
                     onclone: (document) => {
                         const clonedPreview = document.getElementById('doc-preview');
                         if(clonedPreview) {
                           clonedPreview.classList.add('prose');
                         }
                     }
                    }).then(canvas => {
                     const imgData = canvas.toDataURL('image/png');
                     const pdf = new jsPDF('p', 'mm', 'a4');
                     const pdfWidth = pdf.internal.pageSize.getWidth();
                     const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                     pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                     pdf.save("A2Z-Group-Legal-Document.pdf");
                 });
                 previewEl.style.backgroundColor = originalBg;
             }
        } else if (format === 'docx') {
            const htmlContent = marked.parse(documentContent);
            const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Document</title>
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 20mm; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Times New Roman', serif; margin-top: 1em; margin-bottom: 0.5em; }
        p { margin-bottom: 1em; }
        ul, ol { margin-left: 20px; margin-bottom: 1em; }
        strong { font-weight: bold; }
        em { font-style: italic; }
        blockquote { border-left: 4px solid #ccc; padding-left: 10px; color: #666; }
        code { background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
        img { max-width: 100%; height: auto; display: block; margin: 1em 0; }
        /* Apply signature-image styles directly for DOCX conversion compatibility */
        img.signature-image { background-color: white; padding: 4px; border-radius: 4px; max-width: 200px; height: auto; margin-top: 0.5rem; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;
            const blob = new Blob([fullHtml], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `A2Z-Group-Legal-Document.doc`; // Use .doc extension for MS Word compatibility
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };
    
    const renderQuestion = (question: FormQuestion) => {
        switch (question.type) {
            case 'textarea':
                return <textarea id={question.id} onChange={e => handleFormChange(question.id, e.target.value)} rows={4} required/>;
            case 'date':
                return <input type="date" id={question.id} onChange={e => handleFormChange(question.id, e.target.value)} required/>;
            case 'checkbox':
                return <div style={{display: 'flex', alignItems: 'center'}}><input type="checkbox" id={question.id} onChange={e => handleFormChange(question.id, e.target.checked)} style={{width: 'auto', height: '20px', accentColor: 'var(--color-primary)'}} /></div>;
            case 'signature':
            case 'initials':
                 return (
                    <div>
                        <p style={{fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem'}}>{question.summary}</p>
                        <button type="button" onClick={() => setCurrentSignatureQuestion(question)} className="btn btn-secondary">
                            {formAnswers[question.id] ? 'Re-sign' : `Add ${question.type === 'signature' ? 'Signature' : 'Initials'}`} for {question.partyName}
                        </button>
                        {formAnswers[question.id] && <img src={formAnswers[question.id]} alt="Signature" className="signature-image" />}
                    </div>
                 );
            default: // text
                return <input type="text" id={question.id} onChange={e => handleFormChange(question.id, e.target.value)} required/>;
        }
    };

    const renderContent = () => {
        switch (wizardState) {
            case WizardState.IDLE:
                 return (
                    <div style={{textAlign: 'center'}}>
                        <SpinnerIcon style={{width: '64px', height: '64px', margin: '0 auto 1rem', color: 'var(--color-primary)'}} />
                        <h2 style={{fontFamily: 'var(--font-serif)', fontSize: '1.75rem'}}>Initializing...</h2>
                        <p style={{color: 'var(--color-text-muted)', marginTop: '0.5rem'}}>Preparing your document generator.</p>
                    </div>
                );
            case WizardState.PLANNING:
                return (
                    <div style={{textAlign: 'center'}}>
                        <SpinnerIcon style={{width: '64px', height: '64px', margin: '0 auto 1rem', color: 'var(--color-primary)'}} />
                        <h2 style={{fontFamily: 'var(--font-serif)', fontSize: '1.75rem'}}>Creating Your Questionnaire...</h2>
                        <p style={{color: 'var(--color-text-muted)', marginTop: '0.5rem'}}>Our AI is searching for the best template and building a personalized form for you. This may take a moment.</p>
                    </div>
                );
            case WizardState.GATHERING:
                return (
                    <form onSubmit={handleGenerate} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                        <h2 style={{fontFamily: 'var(--font-serif)', fontSize: '1.75rem'}}>Complete Your Document</h2>
                        <p style={{color: 'var(--color-text-muted)'}}>Please fill out the fields below.</p>
                        {plan?.questions.map(q => (
                            <div key={q.id}>
                                <label htmlFor={q.id} style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>{q.label} {q.partyName ? `(${q.partyName})` : ''}</label>
                                {renderQuestion(q)}
                            </div>
                        ))}
                         <button type="submit" className="btn btn-primary">
                            Generate Document
                        </button>
                    </form>
                );
            case WizardState.GENERATING:
                 return (
                    <div style={{textAlign: 'center'}}>
                        <SpinnerIcon style={{width: '64px', height: '64px', margin: '0 auto 1rem', color: 'var(--color-primary)'}} />
                        <h2 style={{fontFamily: 'var(--font-serif)', fontSize: '1.75rem'}}>Generating Your Document...</h2>
                        <p style={{color: 'var(--color-text-muted)', marginTop: '0.5rem'}}>The AI is now assembling your final legal document. Please wait.</p>
                    </div>
                );
            case WizardState.PREVIEW:
                if (isEditing) {
                    return (
                         <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                            <h2 style={{fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem'}}>Edit Document</h2>
                            <textarea
                                value={documentContent}
                                onChange={(e) => setDocumentContent(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    flexGrow: 1,
                                    backgroundColor: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--color-primary)',
                                    color: 'var(--color-text)',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '0.875rem',
                                    lineHeight: 1.6,
                                    resize: 'none',
                                }}
                            />
                            <div style={{flexShrink: 0, paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem'}}>
                                 <button onClick={() => {
                                     setIsEditing(false);
                                     setDocumentContent(finalDocument || ''); // Revert on cancel
                                 }} className="btn btn-secondary">Cancel</button>
                                 <button onClick={() => setIsEditing(false)} className="btn btn-primary">Save Changes</button>
                            </div>
                        </div>
                    );
                }
                return (
                    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                        <h2 style={{fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem'}}>Your Document is Ready</h2>
                        <div id="doc-preview" className="prose" style={{backgroundColor: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px', flexGrow: 1, overflowY: 'auto'}} dangerouslySetInnerHTML={{ __html: marked.parse(documentContent || '') }} />
                        
                        {generatedMetadata && (
                            <div className="smoked-glass-pane" style={{ marginTop: '1.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Document Overview</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                    <strong>Original Request:</strong> {generatedMetadata.originalPrompt}
                                </p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                    <strong>Generated On:</strong> {generatedMetadata.generationDate}
                                </p>
                            </div>
                        )}

                        <div style={{flexShrink: 0, paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                             <button onClick={reset} className="btn btn-secondary">Start Over</button>
                             <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                <button onClick={() => setIsEditing(true)} className="btn btn-secondary">Edit</button>
                                 <span style={{color: 'var(--color-text-muted)'}}>Download as:</span>
                                 <button onClick={() => handleDownload('docx')} title="Download DOCX" className="btn" style={{backgroundColor: 'var(--color-secondary)', color: 'white', padding: '0.5rem', marginRight: '0.5rem'}}><WordIcon style={{width: '24px', height: '24px'}} /></button>
                                 <button onClick={() => handleDownload('pdf')} title="Download PDF" className="btn" style={{backgroundColor: 'var(--color-destructive)', color: 'white', padding: '0.5rem'}}><PdfIcon style={{width: '24px', height: '24px'}} /></button>
                             </div>
                        </div>

                        {/* New AI Revision Section */}
                        <div className="smoked-glass-pane" style={{marginTop: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            <h3 style={{fontFamily: 'var(--font-serif)', fontSize: '1.5rem'}}>Revise Document with AI</h3>
                            <p style={{color: 'var(--color-text-muted)', fontSize: '0.875rem'}}>Enter instructions to modify the document (e.g., "Add a clause about late fees").</p>
                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                <textarea
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder="e.g., Add a force majeure clause, change font to Times New Roman for headings."
                                    rows={3}
                                    style={{flexGrow: 1, minWidth: 0}}
                                    disabled={isProcessingEdit}
                                />
                                <button
                                    onClick={toggleVoiceInput}
                                    className="btn"
                                    title={isRecordingVoiceEdit ? 'Stop Recording' : 'Start Voice Input'}
                                    style={{
                                        backgroundColor: isRecordingVoiceEdit ? 'var(--color-destructive)' : 'var(--color-secondary)',
                                        color: 'white',
                                        width: '48px',
                                        height: '48px',
                                        minWidth: '48px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0',
                                        boxShadow: isRecordingVoiceEdit ? '0 0 15px rgba(220, 38, 38, 0.4)' : 'none',
                                        animation: isRecordingVoiceEdit ? 'pulse 1.5s infinite' : 'none',
                                    }}
                                    disabled={isProcessingEdit}
                                >
                                    <MicrophoneIcon style={{width: '24px', height: '24px'}} />
                                </button>
                            </div>
                            {/* FIX: Display local revisionError */}
                            {revisionError && (
                                <p style={{color: 'var(--color-destructive)', fontSize: '0.875rem'}}>{revisionError}</p>
                            )}
                            <button
                                onClick={handleReviseDocument}
                                className="btn btn-primary"
                                disabled={!editPrompt.trim() || isProcessingEdit}
                            >
                                {isProcessingEdit ? (
                                    <>
                                        <SpinnerIcon style={{width: '20px', height: '20px'}} />
                                        Revising...
                                    </>
                                ) : 'Revise Document'}
                            </button>
                        </div>
                    </div>
                );
            case WizardState.ERROR:
                return (
                    <div style={{textAlign: 'center', color: 'var(--color-destructive)'}}>
                         <h2 style={{fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem'}}>An Error Occurred</h2>
                         {/* FIX: Display error from useDocumentGenerator for generation errors */}
                         <p>{docGenError}</p> 
                         <button onClick={reset} className="btn btn-primary" style={{marginTop: '1.5rem'}}>Try Again</button>
                    </div>
                );
        }
    };

    return (
        <div style={{height: '100%', display: 'flex', flexDirection: 'column', padding: '1rem'}}>
             <div style={{flexShrink: 0, marginBottom: '1rem', alignSelf: 'flex-start'}}>
                <button 
                    onClick={onBack} 
                    onMouseEnter={() => setIsBackHovered(true)}
                    onMouseLeave={() => setIsBackHovered(false)}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        color: isBackHovered ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: isBackHovered ? 'translateX(-2px)' : 'none',
                    }}
                >
                    <ArrowLeftIcon style={{width: '20px', height: '20px'}} />
                    Back to Homepage
                </button>
            </div>
            <div style={{flexGrow: 1, padding: '1.5rem', borderRadius: '8px', overflowY: 'auto', backgroundColor: 'var(--color-surface)'}}>
                 <div key={wizardState} className="animate-fade-in">
                    {renderContent()}
                </div>
            </div>
            {currentSignatureQuestion && (
                <SignatureConsentModal
                    isOpen={!!currentSignatureQuestion}
                    question={currentSignatureQuestion}
                    onDecline={() => setCurrentSignatureQuestion(null)}
                    onConsent={(dataUrl) => {
                        handleFormChange(currentSignatureQuestion.id, dataUrl);
                        setCurrentSignatureQuestion(null);
                    }}
                 />
            )}
        </div>
    );
};

export default DocumentGenerator;
