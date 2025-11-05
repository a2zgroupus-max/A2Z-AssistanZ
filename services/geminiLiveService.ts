// FIX: Removed unexported 'LiveSession' type from import.
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration } from '@google/genai';
import { AgentPersona } from '../constants';

export let ai: GoogleGenAI | null = null;

export const getAi = (): GoogleGenAI => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

type LiveTools = ({
    functionDeclarations?: FunctionDeclaration[];
} | {
    googleSearch: {};
})[]

// FIX: Removed the explicit 'Promise<LiveSession>' return type to allow for type inference.
export const createLiveSession = (
    persona: AgentPersona,
    tools: LiveTools,
    callbacks: {
        onopen: () => void;
        onmessage: (message: LiveServerMessage) => Promise<void>;
        onerror: (e: ErrorEvent) => void;
        onclose: (e: CloseEvent) => void;
    }
) => {
    const ai = getAi();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voice } },
            },
            systemInstruction: persona.systemInstruction,
            tools: tools,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
    });
};

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function createPcmBlobFromBuffer(buffer: ArrayBuffer): Blob {
    const uint8Array = new Uint8Array(buffer);
    return {
        data: encode(uint8Array),
        mimeType: 'audio/pcm;rate=16000',
    };
}

export function createSilentPcmBlob(durationMs: number = 50): Blob {
    const sampleRate = 16000;
    const frameCount = sampleRate * (durationMs / 1000);
    const buffer = new Int16Array(frameCount).fill(0);
    return {
        data: encode(new Uint8Array(buffer.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}


export async function decodeAudioData(
    base64: string,
    ctx: AudioContext,
): Promise<AudioBuffer> {
    const data = decode(base64);
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}