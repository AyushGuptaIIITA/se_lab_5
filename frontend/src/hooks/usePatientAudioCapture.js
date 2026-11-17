import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook to capture patient's remote audio stream and send to backend for transcription
 * Uses Web Audio API with AudioWorklet for real-time PCM capture
 */
export function usePatientAudioCapture(sessionId, remoteStream) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState([]);
  const [error, setError] = useState(null);
  
  const audioContextRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const chunkIntervalRef = useRef(null);
  const audioBufferRef = useRef([]);
  const sequenceRef = useRef(0);
  const isProcessingRef = useRef(false);
  const onTranscriptUpdateRef = useRef(null);

  // Initialize AudioWorklet processor code
  const AUDIO_WORKLET_CODE = `
    class AudioCaptureProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.chunkSize = 16384; // Send chunk every ~1 second at 16kHz
        this.sampleCount = 0;
      }

      process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
          const channelData = input[0];
          
          for (let i = 0; i < channelData.length; i++) {
            this.buffer[this.bufferIndex] = channelData[i];
            this.bufferIndex++;
            this.sampleCount++;
            
            if (this.bufferIndex >= this.bufferSize) {
              // Send buffer to main thread
              this.port.postMessage({
                type: 'audio-data',
                buffer: this.buffer.slice(0, this.bufferIndex)
              });
              this.bufferIndex = 0;
            }
            
            // Send chunk periodically
            if (this.sampleCount >= this.chunkSize) {
              this.port.postMessage({
                type: 'chunk-boundary',
                sampleCount: this.sampleCount
              });
              this.sampleCount = 0;
            }
          }
        }
        return true;
      }
    }
    
    registerProcessor('audio-capture-processor', AudioCaptureProcessor);
  `;

  // Create AudioWorklet blob URL
  const createWorkletBlob = useCallback(() => {
    const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }, []);

  // Convert Float32Array to base64 encoded 16-bit PCM
  const float32ToBase64 = useCallback((float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp and convert to 16-bit
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return btoa(String.fromCharCode.apply(null, new Uint8Array(int16Array.buffer)));
  }, []);

  // Send audio chunk to backend
  const sendAudioChunk = useCallback(async (base64Audio, metadata = {}) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const response = await api.post(`/consultation/${sessionId}/transcribe/chunk`, {
        audioBase64: base64Audio,
        metadata: {
          sequence: sequenceRef.current++,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      });
      
      if (response.data.transcription?.partialTranscript) {
        setTranscript(response.data.transcription.partialTranscript);
        if (onTranscriptUpdateRef.current) {
          onTranscriptUpdateRef.current(response.data.transcription.partialTranscript);
        }
      }
    } catch (err) {
      console.error('Failed to send audio chunk:', err);
      setError(err.message || 'Failed to send audio chunk');
    } finally {
      isProcessingRef.current = false;
    }
  }, [sessionId]);

  // Process accumulated audio buffer
  const processAudioBuffer = useCallback(() => {
    if (audioBufferRef.current.length === 0) return;
    
    // Concatenate all buffers
    const totalLength = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of audioBufferRef.current) {
      combined.set(buf, offset);
      offset += buf.length;
    }
    
    // Clear buffer
    audioBufferRef.current = [];
    
    // Convert to base64 and send
    const base64Audio = float32ToBase64(combined);
    sendAudioChunk(base64Audio);
  }, [float32ToBase64, sendAudioChunk]);

  // Start capturing patient's remote audio
  const startCapture = useCallback(async (onTranscriptUpdate) => {
    if (isCapturing) return;
    if (!remoteStream) {
      setError('No remote stream available');
      return;
    }

    onTranscriptUpdateRef.current = onTranscriptUpdate;
    setError(null);

    try {
      // Start transcription session on backend
      await api.post(`/consultation/${sessionId}/transcribe/start`);
      
      // Create AudioContext
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // 16kHz for transcription
      });
      audioContextRef.current = audioContext;

      // Load AudioWorklet
      const workletUrl = createWorkletBlob();
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      // Create media stream source from remote stream (patient's audio)
      const mediaStreamSource = audioContext.createMediaStreamSource(remoteStream);
      mediaStreamSourceRef.current = mediaStreamSource;

      // Create AudioWorkletNode
      const audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
      audioWorkletNodeRef.current = audioWorkletNode;

      // Handle messages from AudioWorklet
      audioWorkletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio-data') {
          audioBufferRef.current.push(event.data.buffer);
        } else if (event.data.type === 'chunk-boundary') {
          processAudioBuffer();
        }
      };

      // Connect: remote stream -> media stream source -> audio worklet -> destination (silent)
      mediaStreamSource.connect(audioWorkletNode);
      audioWorkletNode.connect(audioContext.destination);

      // Also send chunks periodically as fallback
      chunkIntervalRef.current = setInterval(processAudioBuffer, 2000);

      setIsCapturing(true);
      
      // Fetch initial transcript
      try {
        const transcriptRes = await api.get(`/consultation/${sessionId}/transcript`);
        if (transcriptRes.data.transcript) {
          setTranscript(transcriptRes.data.transcript);
          setSegments(transcriptRes.data.segments || []);
        }
      } catch (e) {
        // Ignore if no transcript yet
      }

    } catch (err) {
      console.error('Failed to start audio capture:', err);
      setError(err.message || 'Failed to start audio capture');
      stopCapture();
    }
  }, [sessionId, remoteStream, isCapturing, createWorkletBlob, processAudioBuffer]);

  // Stop capturing and finalize transcription
  const stopCapture = useCallback(async () => {
    if (!isCapturing) return;

    try {
      // Process any remaining buffer
      processAudioBuffer();
      
      // Finalize transcription on backend
      const response = await api.post(`/consultation/${sessionId}/transcribe/end`);
      
      if (response.data.transcript) {
        setTranscript(response.data.transcript);
        setSegments(response.data.segments || []);
        if (onTranscriptUpdateRef.current) {
          onTranscriptUpdateRef.current(response.data.transcript);
        }
      }
    } catch (err) {
      console.error('Failed to stop audio capture:', err);
      setError(err.message || 'Failed to finalize transcription');
    } finally {
      // Cleanup
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
        chunkIntervalRef.current = null;
      }
      
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
      }
      
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      audioBufferRef.current = [];
      sequenceRef.current = 0;
      isProcessingRef.current = false;
      setIsCapturing(false);
    }
  }, [sessionId, isCapturing, processAudioBuffer]);

  // Get current transcript
  const fetchTranscript = useCallback(async () => {
    try {
      const response = await api.get(`/consultation/${sessionId}/transcript`);
      setTranscript(response.data.transcript || '');
      setSegments(response.data.segments || []);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch transcript:', err);
      return null;
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCapturing) {
        stopCapture();
      }
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
      }
    };
  }, []);

  return {
    isCapturing,
    transcript,
    segments,
    error,
    startCapture,
    stopCapture,
    fetchTranscript
  };
}

export default usePatientAudioCapture;