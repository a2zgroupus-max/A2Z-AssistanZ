
import { useState, useCallback, useRef, useEffect } from 'react';
import { LiveServerMessage } from '@google/genai';
import { createLiveSession, createPcmBlobFromBuffer, decodeAudioData, createSilentPcmBlob } from '../services/geminiLiveService';
import { AgentPersona } from '../constants';
import { CallState } from '../types';
import { audioProcessorWorklet } from '../services/audioProcessor';
import { CHIME_SOUND_B64, HOLD_MUSIC_B64 } from '../assets/sounds';

export interface TranscriptEntry {
    speaker: 'user' | 'model';
    text: string;
}
type ToolCall = { name: string, args: any, id: string };

type ToolResponsePayload = {
    functionResponses: {
        id: string;
        name: string;
        response: { result: any };
    };
};

interface UseGeminiLiveProps {
  onToolCall?: (toolCall: ToolCall) => void;
}

const decodeB64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

const encodeWAV = (userPcm: Int16Array, agentPcm: Int16Array, sampleRate: number): Blob => {
    const numChannels = 2;
    const bitsPerSample = 16;
    const dataSize = Math.max(userPcm.length, agentPcm.length) * numChannels * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const blockAlign = numChannels * (bitsPerSample / 8);

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    const length = Math.max(userPcm.length, agentPcm.length);
    for (let i = 0; i < length; i++) {
        view.setInt16(offset, i < userPcm.length ? userPcm[i] : 0, true);
        offset += 2;
        view.setInt16(offset, i < agentPcm.length ? agentPcm[i] : 0, true);
        offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
};


export const useGeminiLive = ({ onToolCall }: UseGeminiLiveProps = {}) => {
    const [callState, setCallState] = useState<CallState>(CallState.IDLE);
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [currentAgent, setCurrentAgent] = useState<AgentPersona | null>(null);
    const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [transferTarget, setTransferTarget] = useState<string | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [userVideoStream, setUserVideoStream] = useState<MediaStream | null>(null);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    
    const sessionPromiseRef = useRef<ReturnType<typeof createLiveSession> | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const userVideoStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    const audioPlaybackQueue = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextPlaybackTime = useRef(0);
    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');
    const isMutedRef = useRef(isMuted);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    const callStateRef = useRef(callState);
    useEffect(() => { callStateRef.current = callState; }, [callState]);
    const userSpeakingAnalyserRef = useRef<AnalyserNode | null>(null);
    const userSpeakingFrameId = useRef<number | null>(null);

    const chimeAudioBuffer = useRef<AudioBuffer | null>(null);
    const holdMusicAudioBuffer = useRef<AudioBuffer | null>(null);
    const holdMusicSourceNode = useRef<AudioBufferSourceNode | null>(null);
    
    const userAudioRecorder = useRef<MediaRecorder | null>(null);
    const userAudioChunks = useRef<Blob[]>([]);
    const agentAudioChunks = useRef<Int16Array[]>([]);

    const stopPlayback = useCallback(() => {
        audioPlaybackQueue.current.forEach(source => {
            try { source.stop(); } catch (e) {}
        });
        audioPlaybackQueue.current.clear();
        if (outputAudioContextRef.current) {
            nextPlaybackTime.current = outputAudioContextRef.current.currentTime;
        }
    }, []);

    const playAudio = useCallback(async (base64Audio: string) => {
        if (!outputAudioContextRef.current || !outputGainNodeRef.current) return;
        const ctx = outputAudioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();
        
        const audioBuffer = await decodeAudioData(base64Audio, ctx);
        if(isRecording) {
            const pcmData = new Int16Array(audioBuffer.getChannelData(0).length);
            for(let i=0; i<pcmData.length; i++) pcmData[i] = audioBuffer.getChannelData(0)[i] * 32767;
            agentAudioChunks.current.push(pcmData);
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputGainNodeRef.current!);
        setIsAgentSpeaking(true);
        const startTime = Math.max(ctx.currentTime, nextPlaybackTime.current);
        source.start(startTime);
        nextPlaybackTime.current = startTime + audioBuffer.duration;
        audioPlaybackQueue.current.add(source);
        source.onended = () => {
            audioPlaybackQueue.current.delete(source);
            if (audioPlaybackQueue.current.size === 0) setIsAgentSpeaking(false);
        };
    }, [isRecording]);

    const playHoldMusic = useCallback(() => {
        if (!outputAudioContextRef.current || !holdMusicAudioBuffer.current || holdMusicSourceNode.current) return;
        const ctx = outputAudioContextRef.current;
        const source = ctx.createBufferSource();
        source.buffer = holdMusicAudioBuffer.current;
        source.loop = true;
        source.connect(ctx.destination);
        source.start();
        holdMusicSourceNode.current = source;
    }, []);

    const stopHoldMusic = useCallback(() => {
        if (holdMusicSourceNode.current) {
            try { holdMusicSourceNode.current.stop(); } catch(e) {}
            holdMusicSourceNode.current = null;
        }
    }, []);

    const playChime = useCallback(() => {
        if (!outputAudioContextRef.current || !chimeAudioBuffer.current) return;
        const ctx = outputAudioContextRef.current;
        const source = ctx.createBufferSource();
        source.buffer = chimeAudioBuffer.current;
        source.connect(ctx.destination);
        source.start();
    }, []);

    const cleanupLiveResources = useCallback((isFullDisconnect = false) => {
        sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
        sessionPromiseRef.current = null;
        stopPlayback();
        stopHoldMusic();
        if (isRecording) stopRecording();

        if (userSpeakingFrameId.current) cancelAnimationFrame(userSpeakingFrameId.current);
        userSpeakingFrameId.current = null;
        if (userSpeakingAnalyserRef.current) {
            try { userSpeakingAnalyserRef.current.disconnect(); } catch(e) {}
            userSpeakingAnalyserRef.current = null;
        }

        if (isFullDisconnect) {
            if (audioWorkletNodeRef.current) {
                audioWorkletNodeRef.current.port.onmessage = null;
                try { audioWorkletNodeRef.current.disconnect(); } catch(e) {}
                audioWorkletNodeRef.current = null;
            }
            if (mediaStreamSourceRef.current) {
                try { mediaStreamSourceRef.current.disconnect(); } catch(e) {}
                mediaStreamSourceRef.current = null;
            }
            inputAudioContextRef.current?.close().catch(console.error);
            inputAudioContextRef.current = null;
            microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
            microphoneStreamRef.current = null;
            setMicrophoneStream(null);
            userVideoStreamRef.current?.getTracks().forEach(track => track.stop());
            userVideoStreamRef.current = null;
            setUserVideoStream(null);
            setIsCameraOn(false);
            outputAudioContextRef.current?.close().catch(console.error);
            outputAudioContextRef.current = null;
        }
    }, [stopPlayback, stopHoldMusic, isRecording]);
    
    const sendToolResponse = useCallback((response: ToolResponsePayload) => {
        sessionPromiseRef.current?.then(session => session.sendToolResponse(response));
    }, []);

    const handleServerMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
            playAudio(message.serverContent.modelTurn.parts[0].inlineData.data);
        }
        if (message.serverContent?.interrupted) stopPlayback();
        if (message.serverContent?.inputTranscription) currentInputTranscription.current += message.serverContent.inputTranscription.text;
        if (message.serverContent?.outputTranscription) currentOutputTranscription.current += message.serverContent.outputTranscription.text;
        if (message.serverContent?.turnComplete) {
            if (currentInputTranscription.current.trim()) setTranscript(prev => [...prev, { speaker: 'user', text: currentInputTranscription.current.trim() }]);
            if (currentOutputTranscription.current.trim()) setTranscript(prev => [...prev, { speaker: 'model', text: currentOutputTranscription.current.trim() }]);
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
        }

        if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
                if (fc.name && fc.id) onToolCall?.({ name: fc.name, args: fc.args, id: fc.id });
            }
        }
    }, [playAudio, stopPlayback, onToolCall]);

    const monitorUserSpeech = useCallback(() => {
        if (!userSpeakingAnalyserRef.current) return;
        const analyser = userSpeakingAnalyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const check = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setIsUserSpeaking(average > 10); 
            userSpeakingFrameId.current = requestAnimationFrame(check);
        };
        check();
    }, []);

    const connectToAgent = useCallback(async (persona: AgentPersona) => {
        const isTransfer = callStateRef.current === CallState.CONNECTED;
        if (isTransfer) {
            setTransferTarget(persona.role);
            playHoldMusic();
        }

        if (sessionPromiseRef.current) {
            if (isTransfer) callStateRef.current = CallState.TRANSFERRING;
            cleanupLiveResources(false);
        }
        
        setCallState(isTransfer ? CallState.TRANSFERRING : CallState.AGENT_CONNECTING);
        setCurrentAgent(persona);
        setError(null);
        if (!isTransfer) setTranscript([]);
        
        try {
            if (!microphoneStreamRef.current || microphoneStreamRef.current.getAudioTracks().every(t => t.readyState === 'ended')) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                microphoneStreamRef.current = stream;
                setMicrophoneStream(stream);
            }
            if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
                const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000, latencyHint: 'interactive' });
                outputAudioContextRef.current = outCtx;
                outputGainNodeRef.current = outCtx.createGain();
                outputGainNodeRef.current.connect(outCtx.destination);
                chimeAudioBuffer.current = await outCtx.decodeAudioData(decodeB64(CHIME_SOUND_B64).buffer);
                holdMusicAudioBuffer.current = await outCtx.decodeAudioData(decodeB64(HOLD_MUSIC_B64).buffer);
            }
            if (!audioWorkletNodeRef.current) {
                const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000, latencyHint: 'interactive' });
                inputAudioContextRef.current = inCtx;
                userSpeakingAnalyserRef.current = inCtx.createAnalyser();
                userSpeakingAnalyserRef.current.fftSize = 256;
                userSpeakingAnalyserRef.current.smoothingTimeConstant = 0.3;
                
                const workletBlob = new Blob([audioProcessorWorklet], { type: 'application/javascript' });
                const workletUrl = URL.createObjectURL(workletBlob);
                await inCtx.audioWorklet.addModule(workletUrl);
                URL.revokeObjectURL(workletUrl);
                const workletNode = new AudioWorkletNode(inCtx, 'audio-processor');
                mediaStreamSourceRef.current = inCtx.createMediaStreamSource(microphoneStreamRef.current);
                mediaStreamSourceRef.current.connect(userSpeakingAnalyserRef.current);
                userSpeakingAnalyserRef.current.connect(workletNode)
                workletNode.connect(inCtx.destination);
                audioWorkletNodeRef.current = workletNode;
                monitorUserSpeech();
            }

            const sessionPromise = createLiveSession(persona, persona.tools || [], {
                onopen: () => {
                    stopHoldMusic();
                    if(isTransfer) playChime();
                    setCallState(CallState.CONNECTED);
                    setTransferTarget(null);
                    sessionPromise.then(session => session.sendRealtimeInput({ media: createSilentPcmBlob() }));
                    if (audioWorkletNodeRef.current) {
                        audioWorkletNodeRef.current.port.onmessage = (event) => {
                            if (isMutedRef.current) return;
                            if (isRecording) userAudioChunks.current.push(new Blob([event.data]));
                            sessionPromise.then(session => session.sendRealtimeInput({ media: createPcmBlobFromBuffer(event.data) }));
                        };
                    }
                },
                onmessage: handleServerMessage,
                onerror: (e) => {
                    setError(e.message || 'An unknown connection error occurred.');
                    setCallState(CallState.ERROR);
                    setTransferTarget(null);
                    cleanupLiveResources(true);
                },
                onclose: (e) => {
                    if (callStateRef.current !== CallState.TRANSFERRING) {
                        setCallState(CallState.DISCONNECTED);
                        cleanupLiveResources(true);
                    }
                },
            });
            sessionPromiseRef.current = sessionPromise;
        } catch (e) {
            console.error("Failed to start call:", e);
            const message = (e instanceof Error) ? e.message : String(e);
            setError(`Failed to initialize session: ${message}`);
            setCallState(CallState.ERROR);
            cleanupLiveResources(true);
        }
    }, [cleanupLiveResources, handleServerMessage, monitorUserSpeech, playChime, playHoldMusic, stopHoldMusic, isRecording]);

    const startRecording = () => {
        if (!microphoneStreamRef.current || isRecording) return;
        userAudioChunks.current = [];
        agentAudioChunks.current = [];
        setRecordedBlob(null);
        setIsRecording(true);
    };

    const stopRecording = useCallback(() => {
        if (!isRecording) return;
        setIsRecording(false);
        const processRecording = async () => {
            const userBlob = new Blob(userAudioChunks.current, { type: 'audio/webm' });
            const userArrayBuffer = await userBlob.arrayBuffer();
            const userPcm = new Int16Array(userArrayBuffer);

            const agentTotalLength = agentAudioChunks.current.reduce((sum, arr) => sum + arr.length, 0);
            const agentFullPcm = new Int16Array(agentTotalLength);
            let offset = 0;
            for(const chunk of agentAudioChunks.current) {
                agentFullPcm.set(chunk, offset);
                offset += chunk.length;
            }

            const resample = (audio: Int16Array, fromRate: number, toRate: number) => {
                const ratio = fromRate / toRate;
                const newLength = Math.round(audio.length / ratio);
                const result = new Int16Array(newLength);
                for (let i = 0; i < newLength; i++) {
                    result[i] = audio[Math.floor(i * ratio)];
                }
                return result;
            };

            const agentPcmResampled = resample(agentFullPcm, 24000, 16000);
            const wavBlob = encodeWAV(userPcm, agentPcmResampled, 16000);
            setRecordedBlob(wavBlob);
        };
        processRecording();
    }, [isRecording]);
    
    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

    const toggleCamera = useCallback(async () => {
        if (isCameraOn) {
            userVideoStreamRef.current?.getTracks().forEach(track => track.stop());
            userVideoStreamRef.current = null;
            setUserVideoStream(null);
            setIsCameraOn(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                userVideoStreamRef.current = stream;
                setUserVideoStream(stream);
                setIsCameraOn(true);
            } catch (e) {
                console.error("Failed to get camera access:", e);
                setError("Camera permission denied or camera not found.");
            }
        }
    }, [isCameraOn]);

    const disconnect = useCallback(() => {
        cleanupLiveResources(true);
        setCallState(CallState.DISCONNECTED);
    }, [cleanupLiveResources]);

    return {
        callState, error, isMuted, currentAgent, transcript, transferTarget,
        isCameraOn, userVideoStream, isAgentSpeaking, isUserSpeaking,
        isRecording, recordedBlob,
        connectToAgent, disconnect, toggleMute, toggleCamera, sendToolResponse,
        startRecording, stopRecording,
    };
};