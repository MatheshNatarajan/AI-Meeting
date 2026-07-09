/**
 * Speech-to-Text Service
 * 
 * PRIMARY: Web Speech API (Chrome/Edge built-in, cloud-powered, highly accurate)
 * FALLBACK: VOSK (offline, less accurate)
 * 
 * The Web Speech API uses Google's speech recognition servers and handles:
 * - All accents and dialects
 * - Background noise
 * - Natural conversational speech
 * - Automatic punctuation
 */

// ─────────────────────────────────────────────
//  Web Speech API Implementation (Primary)
// ─────────────────────────────────────────────

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

/**
 * Check if Web Speech API is available
 */
export function isSpeechApiAvailable() {
  return !!SpeechRecognition;
}

/**
 * Start real-time transcription using Web Speech API.
 * 
 * @param {object} callbacks - { onPartial, onResult, onError, onStatusChange }
 * @param {string} lang - Language code (default: 'en-US')
 * @returns {object} { stop, cleanup }
 */
export function startWebSpeechRecognition(callbacks = {}, lang = 'en-US') {
  const { onPartial, onResult, onError, onStatusChange } = callbacks;

  if (!SpeechRecognition) {
    const err = new Error('Web Speech API not available. Use Chrome or Edge.');
    if (onError) onError(err);
    throw err;
  }

  const recognition = new SpeechRecognition();
  
  // Configuration
  recognition.continuous = true;       // Keep listening until explicitly stopped
  recognition.interimResults = true;   // Get partial results as user speaks
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  let isRunning = false;
  let shouldRestart = true;
  let restartTimer = null;

  recognition.onstart = () => {
    isRunning = true;
    console.log('[Speech] Recognition started');
    if (onStatusChange) onStatusChange('listening');
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Send partial results (interim)
    if (interimTranscript && onPartial) {
      onPartial(interimTranscript.trim());
    }

    // Send final results
    if (finalTranscript && onResult) {
      onResult(finalTranscript.trim());
    }
  };

  recognition.onerror = (event) => {
    console.warn('[Speech] Error:', event.error);
    
    if (event.error === 'no-speech') {
      // This is normal — user is silent. Auto-restart.
      if (onStatusChange) onStatusChange('waiting');
      return;
    }

    if (event.error === 'aborted') {
      // Aborted intentionally, don't restart
      return;
    }

    if (event.error === 'network') {
      if (onStatusChange) onStatusChange('offline');
      if (onError) onError(new Error('Network error — check internet connection'));
    }

    if (event.error === 'not-allowed') {
      shouldRestart = false;
      if (onStatusChange) onStatusChange('denied');
      if (onError) onError(new Error('Microphone permission denied'));
    }
  };

  recognition.onend = () => {
    isRunning = false;
    console.log('[Speech] Recognition ended');

    // Auto-restart if we should keep listening
    if (shouldRestart) {
      restartTimer = setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[Speech] Restart failed:', e);
        }
      }, 300);
    }
  };

  // Start
  try {
    recognition.start();
  } catch (e) {
    console.error('[Speech] Start failed:', e);
    if (onError) onError(e);
  }

  // Return control object
  return {
    recognition,
    stop: () => {
      shouldRestart = false;
      clearTimeout(restartTimer);
      try { recognition.stop(); } catch {}
    },
    cleanup: () => {
      shouldRestart = false;
      clearTimeout(restartTimer);
      try { recognition.abort(); } catch {}
      isRunning = false;
    },
    isRunning: () => isRunning,
  };
}


// ─────────────────────────────────────────────
//  VOSK Implementation (Fallback — offline)
// ─────────────────────────────────────────────

import { createModel } from 'vosk-browser';

const MODEL_URL = '/models/vosk-model-en.zip';
let modelInstance = null;
let modelLoadPromise = null;

export async function initVoskModel(onProgress) {
  if (modelInstance) {
    if (onProgress) onProgress(100);
    return modelInstance;
  }
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    try {
      if (onProgress) onProgress(0);
      console.log('[VOSK] Loading model...');
      const model = await createModel(MODEL_URL);
      modelInstance = model;
      if (onProgress) onProgress(100);
      console.log('[VOSK] Model loaded');
      return model;
    } catch (error) {
      modelLoadPromise = null;
      console.error('[VOSK] Load failed:', error);
      throw error;
    }
  })();

  return modelLoadPromise;
}

export function isModelLoaded() {
  return modelInstance !== null;
}

export async function processAudioStream(mediaStream, callbacks = {}) {
  const { onPartial, onResult, onError } = callbacks;

  if (!modelInstance) {
    throw new Error('VOSK model not loaded');
  }

  const audioContext = new AudioContext({ sampleRate: 16000 });
  if (audioContext.state === 'suspended') await audioContext.resume();

  const source = audioContext.createMediaStreamSource(mediaStream);
  const recognizer = new modelInstance.KaldiRecognizer(16000);
  recognizer.setWords(true);

  recognizer.on('result', (msg) => {
    const text = msg?.result?.text || msg?.text || '';
    if (text?.trim() && onResult) onResult(text.trim());
  });

  recognizer.on('partialresult', (msg) => {
    const partial = msg?.result?.partial || msg?.partial || '';
    if (partial?.trim() && onPartial) onPartial(partial.trim());
  });

  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  processor.onaudioprocess = (event) => {
    try {
      const audioBuffer = event.inputBuffer;
      if (recognizer && audioBuffer) {
        recognizer.acceptWaveform(audioBuffer);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  source.connect(processor);
  const gain = audioContext.createGain();
  gain.gain.value = 0;
  processor.connect(gain);
  gain.connect(audioContext.destination);

  return {
    recognizer,
    audioContext,
    cleanup: () => {
      try {
        processor.disconnect();
        gain.disconnect();
        source.disconnect();
        audioContext.close();
        recognizer.remove();
      } catch {}
    },
  };
}

export function disposeModel() {
  if (modelInstance) {
    try { modelInstance.terminate(); } catch {}
    modelInstance = null;
    modelLoadPromise = null;
  }
}
