import React, { useState, useEffect, useRef, useCallback } from 'react';
import { testimonials, Testimonial } from '../assets/testimonialsData';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { StarIcon } from './icons/StarIcon'; // Import the new StarIcon
import { GoogleGenAI, Modality } from '@google/genai';
import { getAi, decodeAudioData } from '../services/geminiLiveService'; // Import getAi and decodeAudioData

// Define available voices for TTS
const MALE_VOICES = ['Zephyr', 'Puck', 'Fenrir'];
const FEMALE_VOICES = ['Kore', 'Charon'];

const TestimonialsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [currentDate, setCurrentDate] = useState('');
    const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Audio context for TTS playback
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    const nextPlaybackTime = useRef(0);
    const currentlyPlayingSource = useRef<AudioBufferSourceNode | null>(null);

    // For cycling through voices
    const maleVoiceIndex = useRef(0);
    const femaleVoiceIndex = useRef(0);

    useEffect(() => {
        const date = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        setCurrentDate(date.toLocaleDateString('en-US', options));

        // Initialize AudioContext
        const initAudio = async () => {
            const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000, latencyHint: 'interactive' });
            audioContextRef.current = outCtx;
            outputGainNodeRef.current = outCtx.createGain();
            outputGainNodeRef.current.connect(outCtx.destination);
        };
        initAudio();

        return () => {
            // Cleanup audio resources
            if (currentlyPlayingSource.current) {
                try { currentlyPlayingSource.current.stop(); } catch (e) {}
                currentlyPlayingSource.current.disconnect();
                currentlyPlayingSource.current = null;
            }
            audioContextRef.current?.close().catch(console.error);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const playAudioChunk = useCallback(async (base64Audio: string): Promise<void> => {
        if (!audioContextRef.current || !outputGainNodeRef.current) return Promise.resolve();
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const audioBuffer = await decodeAudioData(base64Audio, ctx);

        if (currentlyPlayingSource.current) {
            try { currentlyPlayingSource.current.stop(); } catch (e) {}
            currentlyPlayingSource.current.disconnect();
            currentlyPlayingSource.current = null;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputGainNodeRef.current);
        currentlyPlayingSource.current = source;

        const startTime = Math.max(ctx.currentTime, nextPlaybackTime.current);
        source.start(startTime);
        nextPlaybackTime.current = startTime + audioBuffer.duration;

        return new Promise<void>((resolve) => {
            source.onended = () => {
                currentlyPlayingSource.current = null;
                resolve();
            };
        });
    }, []);

    const generateAndPlaySpeech = useCallback(async (testimonial: Testimonial) => {
        setIsSpeaking(true);
        let voiceName: string;
        if (testimonial.gender === 'male') {
            maleVoiceIndex.current = (maleVoiceIndex.current + 1) % MALE_VOICES.length;
            voiceName = MALE_VOICES[maleVoiceIndex.current];
        } else {
            femaleVoiceIndex.current = (femaleVoiceIndex.current + 1) % FEMALE_VOICES.length;
            voiceName = FEMALE_VOICES[femaleVoiceIndex.current];
        }

        const ai = getAi();
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: testimonial.quote }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
                    },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                await playAudioChunk(base64Audio);
            } else {
                console.warn("No audio data received for testimonial:", testimonial.name);
            }
        } catch (e) {
            console.error("Error generating or playing speech:", e);
        } finally {
            setIsSpeaking(false);
        }
    }, [playAudioChunk]);

    useEffect(() => {
        if (!scrollContainerRef.current || isSpeaking) return;

        const testimonial = testimonials[currentReviewIndex];
        if (testimonial) {
            const playAndScroll = async () => {
                // Ensure the view is scrolled before playing audio
                const targetElement = scrollContainerRef.current?.children[currentReviewIndex] as HTMLElement;
                if (targetElement) {
                    scrollContainerRef.current?.scrollTo({
                        top: targetElement.offsetTop - scrollContainerRef.current.offsetTop,
                        behavior: 'smooth'
                    });
                }
                
                await generateAndPlaySpeech(testimonial);
                
                // After speech, wait a small buffer, then scroll to next
                setTimeout(() => {
                    setCurrentReviewIndex(prevIndex => (prevIndex + 1) % testimonials.length);
                }, 1000); // 1-second pause after speech
            };
            playAndScroll();
        }
    }, [currentReviewIndex, isSpeaking, generateAndPlaySpeech]);


    const renderStars = (rating: number) => {
        return (
            <div style={{display: 'inline-flex', gap: '0.2rem', marginLeft: '0.5rem'}}>
                {[...Array(5)].map((_, i) => (
                    <StarIcon 
                        key={i} 
                        style={{
                            width: '16px', 
                            height: '16px', 
                            color: i < rating ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            opacity: i < rating ? 1 : 0.4
                        }} 
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="newspaper-page animate-fade-in">
            <header className="newspaper-header">
                <div className="back-button-wrapper">
                     <button onClick={onBack} className="btn" style={{gap: '0.5rem'}}>
                        <ArrowLeftIcon style={{width: '20px', height: '20px'}} />
                        Back
                    </button>
                </div>
                <h1>The A²Z Chronicle</h1>
                <div className="sub-header">
                    <span>Total Reviews: {testimonials.length}</span> {/* Updated text */}
                    <span>{currentDate}</span>
                    <span>EXTRA EDITION</span>
                </div>
            </header>
            <main ref={scrollContainerRef} className="newspaper-content">
                {testimonials.map((testimonial, index) => (
                    <article 
                        key={index} 
                        className="testimonial-article"
                        style={{
                            opacity: index === currentReviewIndex ? 1 : 0.4,
                            transition: 'opacity 0.5s ease',
                        }}
                    >
                        <h3 style={{display: 'flex', alignItems: 'center'}}>
                            From {testimonial.location} {renderStars(testimonial.rating)}
                        </h3>
                        <p>"{testimonial.quote}" &mdash; <strong>{testimonial.name}</strong></p>
                    </article>
                ))}
            </main>
        </div>
    );
};

export default TestimonialsPage;