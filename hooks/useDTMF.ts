// hooks/useDTMF.ts
import { useRef, useCallback, useEffect } from 'react';

const DTMF_FREQUENCIES: { [key: string]: [number, number] } = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

export const useDTMF = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const activeOscillatorsRef = useRef<OscillatorNode[]>([]);

    const setupAudioContext = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;
            
            const gainNode = context.createGain();
            gainNode.gain.setValueAtTime(0, context.currentTime);
            gainNode.connect(context.destination);
            gainNodeRef.current = gainNode;
        }
    }, []);
    
    const stopTone = useCallback(() => {
        const context = audioContextRef.current;
        const gainNode = gainNodeRef.current;

        if (!context || !gainNode || activeOscillatorsRef.current.length === 0) return;

        const stopTime = context.currentTime + 0.05;
        gainNode.gain.cancelScheduledValues(context.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

        activeOscillatorsRef.current.forEach(osc => {
            try {
                osc.stop(stopTime);
                osc.onended = () => {
                    try { osc.disconnect(); } catch(e) { /* ignore */ }
                };
            } catch(e) { /* ignore if already stopped */ }
        });
        
        activeOscillatorsRef.current = [];
    }, []);

    const startTone = useCallback((digit: string) => {
        setupAudioContext();
        
        const context = audioContextRef.current;
        const gainNode = gainNodeRef.current;
        if (!context || !gainNode) return;

        stopTone(); // Stop any existing tones before starting a new one

        const frequencies = DTMF_FREQUENCIES[digit];
        if (!frequencies) return;

        const [freq1, freq2] = frequencies;
        
        const oscillator1 = context.createOscillator();
        const oscillator2 = context.createOscillator();
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';

        oscillator1.frequency.setValueAtTime(freq1, context.currentTime);
        oscillator2.frequency.setValueAtTime(freq2, context.currentTime);
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);

        // Ramp up volume
        gainNode.gain.cancelScheduledValues(context.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.3, context.currentTime + 0.02);
        
        oscillator1.start();
        oscillator2.start();

        activeOscillatorsRef.current = [oscillator1, oscillator2];

    }, [setupAudioContext, stopTone]);

    const cleanup = useCallback(() => {
        stopTone();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    }, [stopTone]);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    return { startTone, stopTone };
};