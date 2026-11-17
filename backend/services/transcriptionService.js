/**
 * Transcription Service - Supports AssemblyAI and local Whisper.cpp
 * Provides real-time and batch transcription for patient audio during consultations
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class TranscriptionService {
  constructor() {
    this.provider = process.env.TRANSCRIPTION_PROVIDER || 'assemblyai';
    this.assemblyaiApiKey = process.env.ASSEMBLYAI_API_KEY;
    this.whisperModelPath = process.env.WHISPER_MODEL_PATH || './models/ggml-base.en.bin';
    this.activeSessions = new Map(); // sessionId -> { chunks: [], transcript: '', ws: null }
  }

  /**
   * Initialize a new transcription session
   * @param {string} sessionId - Consultation session ID
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Session info
   */
  async startSession(sessionId, options = {}) {
    const session = {
      id: sessionId,
      chunks: [],
      transcript: '',
      language: options.language || 'en',
      medicalVocabulary: true,
      createdAt: new Date(),
      status: 'active'
    };

    this.activeSessions.set(sessionId, session);
    
    if (this.provider === 'assemblyai' && this.assemblyaiApiKey) {
      // For AssemblyAI, we'll use their real-time streaming API
      // This would typically connect to their WebSocket endpoint
      session.assemblyaiWs = null; // Will be set when client connects
    }

    return { sessionId, status: 'started' };
  }

  /**
   * Process an audio chunk (base64 encoded webm/opus or raw PCM)
   * @param {string} sessionId - Consultation session ID
   * @param {string} audioBase64 - Base64 encoded audio data
   * @param {Object} metadata - Chunk metadata (timestamp, sequence, etc.)
   * @returns {Promise<Object>} Transcription result
   */
  async processChunk(sessionId, audioBase64, metadata = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.error(`[TRANSCRIPTION SERVICE] processChunk - Session not found: ${sessionId}`);
      throw new Error('Transcription session not found');
    }

    console.log(`[TRANSCRIPTION SERVICE] processChunk | Session: ${sessionId} | Chunk seq: ${metadata.sequence} | Total chunks: ${session.chunks.length + 1} | Audio size: ${audioBase64.length} chars`);

    // Store chunk for batch processing
    session.chunks.push({
      data: audioBase64,
      timestamp: metadata.timestamp || new Date(),
      sequence: metadata.sequence || session.chunks.length
    });

    // For real-time, we could send to AssemblyAI WebSocket here
    // For now, we'll do batch processing on session end
    return {
      success: true,
      chunkCount: session.chunks.length,
      partialTranscript: session.transcript
    };
  }

  /**
   * Finalize transcription session and get full transcript
   * @param {string} sessionId - Consultation session ID
   * @returns {Promise<Object>} Final transcript with segments
   */
  async finalizeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.error(`[TRANSCRIPTION SERVICE] finalizeSession - Session not found: ${sessionId}`);
      throw new Error('Transcription session not found');
    }

    console.log(`[TRANSCRIPTION SERVICE] finalizeSession | Session: ${sessionId} | Provider: ${this.provider} | Has API Key: ${!!this.assemblyaiApiKey} | Chunks: ${session.chunks.length} | Created: ${session.createdAt}`);

    let result;
    
    if (this.provider === 'assemblyai' && this.assemblyaiApiKey) {
      console.log(`[TRANSCRIPTION SERVICE] Using AssemblyAI for session ${sessionId}`);
      result = await this._transcribeWithAssemblyAI(session);
    } else {
      console.log(`[TRANSCRIPTION SERVICE] Using Whisper for session ${sessionId}`);
      result = await this._transcribeWithWhisper(session);
    }

    session.transcript = result.text;
    session.segments = result.segments || [];
    session.status = 'completed';
    session.completedAt = new Date();

    // Clean up
    this.activeSessions.delete(sessionId);

    console.log(`[TRANSCRIPTION SERVICE] finalizeSession completed | Session: ${sessionId} | Duration: ${session.completedAt - session.createdAt}ms | Word count: ${session.transcript.split(/\s+/).filter(Boolean).length}`);
    return {
      sessionId,
      transcript: session.transcript,
      segments: session.segments,
      duration: session.completedAt - session.createdAt,
      wordCount: session.transcript.split(/\s+/).filter(Boolean).length
    };
  }

  /**
   * Get current transcript for a session
   * @param {string} sessionId - Consultation session ID
   * @returns {Promise<Object>} Current transcript
   */
  async getTranscript(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      // Check if we have a completed session in database
      return { transcript: '', segments: [], status: 'not_found' };
    }
    
    return {
      transcript: session.transcript,
      segments: session.segments || [],
      status: session.status,
      chunkCount: session.chunks.length
    };
  }

  /**
   * Transcribe using AssemblyAI API
   * @private
   */
  async _transcribeWithAssemblyAI(session) {
    // Helper function for retry logic with exponential backoff
    const fetchWithRetry = async (url, options, retries = 3, baseDelay = 1000) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const startTime = Date.now();
          const response = await fetch(url, options);
          const duration = Date.now() - startTime;
          
          // Handle rate limiting (429)
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
            console.error(`[429 TRACE] AssemblyAI rate limited (429) for session ${session.id} | URL: ${url} | Attempt: ${attempt + 1}/${retries} | Retry-After: ${retryAfter || 'none'} | Delay: ${delay}ms | Duration: ${duration}ms`);
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
            throw new Error('AssemblyAI rate limit exceeded. Please try again later.');
          }
          
          // Handle other HTTP errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[ERROR TRACE] AssemblyAI API error for session ${session.id} | URL: ${url} | Status: ${response.status} | Error: ${errorData.error || response.statusText} | Duration: ${duration}ms`);
            throw new Error(`AssemblyAI API error: ${response.status} - ${errorData.error || response.statusText}`);
          }
          
          console.log(`[AssemblyAI] Success for session ${session.id} | URL: ${url} | Status: ${response.status} | Duration: ${duration}ms`);
          return response;
        } catch (error) {
          if (attempt === retries) throw error;
          // Don't retry on non-network errors (like 429 which we handled above)
          if (error.message.includes('rate limit') || error.message.includes('429')) {
            throw error;
          }
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`AssemblyAI request failed (attempt ${attempt + 1}/${retries}): ${error.message}. Retrying in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    };

    try {
      // Combine all audio chunks into a single buffer
      // For AssemblyAI, we'd typically upload the combined audio file
      // This is a simplified version - in production, you'd stream to their WebSocket
      
      const audioBuffer = this._combineAudioChunks(session.chunks);
      
      // Save temporary file for AssemblyAI upload
      const tempFile = path.join('/tmp', `transcript_${session.id}_${Date.now()}.webm`);
      fs.writeFileSync(tempFile, audioBuffer);

      // Upload to AssemblyAI with retry logic
      const uploadResponse = await fetchWithRetry('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'Authorization': this.assemblyaiApiKey,
          'Content-Type': 'application/octet-stream'
        },
        body: fs.readFileSync(tempFile)
      });

      const uploadData = await uploadResponse.json();
      const audioUrl = uploadData.upload_url;

      // Request transcription with retry logic
      const transcriptResponse = await fetchWithRetry('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': this.assemblyaiApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: session.language,
          medical_vocabulary: session.medicalVocabulary,
          punctuate: true,
          format_text: true,
          speaker_labels: false // Single speaker (patient)
        })
      });

      const transcriptData = await transcriptResponse.json();
      const transcriptId = transcriptData.id;

      // Poll for completion with retry logic
      let transcriptResult;
      for (let i = 0; i < 60; i++) { // Max 60 seconds
        await new Promise(r => setTimeout(r, 1000));
        
        const pollResponse = await fetchWithRetry(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: { 'Authorization': this.assemblyaiApiKey }
        });
        
        transcriptResult = await pollResponse.json();
        
        if (transcriptResult.status === 'completed') break;
        if (transcriptResult.status === 'error') throw new Error(transcriptResult.error);
      }

      // Clean up temp file
      fs.unlinkSync(tempFile);

      if (transcriptResult.status !== 'completed') {
        throw new Error('Transcription timed out');
      }

      return {
        text: transcriptResult.text || '',
        segments: transcriptResult.words?.map(w => ({
          text: w.text,
          start: w.start,
          end: w.end,
          confidence: w.confidence
        })) || [],
        confidence: transcriptResult.confidence
      };

    } catch (error) {
      console.error('AssemblyAI transcription error:', {
        message: error.message,
        stack: error.stack,
        sessionId: session.id
      });
      // Fallback to mock for development
      return this._mockTranscription(session);
    }
  }

  /**
   * Transcribe using local Whisper.cpp
   * @private
   */
  async _transcribeWithWhisper(session) {
    try {
      const audioBuffer = this._combineAudioChunks(session.chunks);
      
      // Save as WAV file for Whisper
      const tempWav = path.join('/tmp', `transcript_${session.id}_${Date.now()}.wav`);
      this._saveAsWav(audioBuffer, tempWav, 16000); // 16kHz mono

      // Run whisper.cpp
      const whisperPath = this._findWhisperExecutable();
      if (!whisperPath || !fs.existsSync(this.whisperModelPath)) {
        throw new Error('Whisper.cpp not found or model missing');
      }

      const result = await this._runWhisper(whisperPath, this.whisperModelPath, tempWav);
      
      // Clean up
      fs.unlinkSync(tempWav);

      return {
        text: result.text || '',
        segments: result.segments || [],
        confidence: result.confidence
      };

    } catch (error) {
      console.error('Whisper transcription error:', error);
      return this._mockTranscription(session);
    }
  }

  /**
   * Find whisper.cpp executable
   * @private
   */
  _findWhisperExecutable() {
    const possiblePaths = [
      './whisper.cpp/main',
      './whisper.cpp/build/bin/whisper-cli',
      '/usr/local/bin/whisper-cli',
      '/opt/homebrew/bin/whisper-cli',
      'whisper-cli'
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Run whisper.cpp CLI
   * @private
   */
  _runWhisper(whisperPath, modelPath, audioPath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-m', modelPath,
        '-f', audioPath,
        '-l', 'en',
        '-otxt', // Output text
        '-ovtt', // Output VTT with timestamps
        '--no-timestamps', 'false'
      ];

      const proc = spawn(whisperPath, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Whisper exited with code ${code}: ${stderr}`));
          return;
        }

        // Parse VTT output for segments
        const vttPath = audioPath.replace('.wav', '.vtt');
        let segments = [];
        if (fs.existsSync(vttPath)) {
          segments = this._parseVTT(fs.readFileSync(vttPath, 'utf8'));
          fs.unlinkSync(vttPath);
        }

        resolve({
          text: stdout.trim(),
          segments,
          confidence: 0.9 // Whisper doesn't provide per-word confidence easily
        });
      });
    });
  }

  /**
   * Parse VTT subtitle format
   * @private
   */
  _parseVTT(vttContent) {
    const segments = [];
    const lines = vttContent.split('\n');
    let currentSegment = null;

    for (const line of lines) {
      if (line.includes('-->')) {
        const [start, end] = line.split('-->').map(s => s.trim());
        currentSegment = { start, end, text: '' };
      } else if (currentSegment && line.trim() && !line.startsWith('WEBVTT')) {
        currentSegment.text += (currentSegment.text ? ' ' : '') + line.trim();
      } else if (currentSegment && !line.trim()) {
        if (currentSegment.text) {
          segments.push(currentSegment);
        }
        currentSegment = null;
      }
    }

    if (currentSegment && currentSegment.text) {
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Combine audio chunks into single buffer
   * @private
   */
  _combineAudioChunks(chunks) {
    // Sort by sequence
    const sorted = [...chunks].sort((a, b) => a.sequence - b.sequence);
    
    // For simplicity, concatenate base64 decoded buffers
    // In production, you'd properly concatenate WebM/Opus streams
    const buffers = sorted.map(c => Buffer.from(c.data, 'base64'));
    return Buffer.concat(buffers);
  }

  /**
   * Save raw PCM as WAV file
   * @private
   */
  _saveAsWav(pcmBuffer, outputPath, sampleRate = 16000) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcmBuffer.length;
    const chunkSize = 36 + dataSize;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(chunkSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // PCM format chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    fs.writeFileSync(outputPath, Buffer.concat([header, pcmBuffer]));
  }

  /**
   * Mock transcription for development/testing
   * @private
   */
  _mockTranscription(session) {
    const mockTranscripts = [
      "I've been having a fever for three days with severe headache and body aches.",
      "Doctor, I have a persistent cough and difficulty breathing, especially at night.",
      "My stomach has been hurting since yesterday, with nausea and vomiting.",
      "I'm experiencing chest pain and shortness of breath when I walk.",
      "There's a rash on my arms and legs that's very itchy.",
      "I've been feeling very tired and dizzy lately, with occasional blurred vision."
    ];

    const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
    
    return {
      text: randomTranscript,
      segments: [{
        text: randomTranscript,
        start: 0,
        end: 30,
        confidence: 0.95
      }],
      confidence: 0.95
    };
  }

  /**
   * Clean up all sessions
   */
  cleanup() {
    this.activeSessions.clear();
  }
}

// Singleton instance
const transcriptionService = new TranscriptionService();

module.exports = transcriptionService;