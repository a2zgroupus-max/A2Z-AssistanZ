// services/audioProcessor.ts

/**
 * This string contains the code for the AudioWorkletProcessor.
 * It's defined as a string to be easily injected as a Blob URL.
 * NOTE: This code runs in a separate worklet thread and does not have access
 * to the window, document, or external libraries like React.
 */
export const audioProcessorWorklet = `
  class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
    }

    // This method is called for every block of audio data.
    process(inputs, outputs, parameters) {
      // We expect one input, with one channel (mono).
      const input = inputs[0];
      const inputChannel = input[0];

      // The input data is a Float32Array. We need to convert it to 16-bit PCM.
      // This is the format required by the Gemini API.
      if (inputChannel) {
        const buffer = new Int16Array(inputChannel.length);
        for (let i = 0; i < inputChannel.length; i++) {
          // Clamp the value between -1 and 1, then scale to 16-bit integer range.
          buffer[i] = Math.max(-1, Math.min(1, inputChannel[i])) * 32767;
        }
        
        // Post the raw PCM data back to the main thread.
        // We transfer the buffer to avoid copying, which is more efficient.
        this.port.postMessage(buffer.buffer, [buffer.buffer]);
      }

      // Return true to keep the processor alive.
      return true;
    }
  }

  registerProcessor('audio-processor', AudioProcessor);
`;