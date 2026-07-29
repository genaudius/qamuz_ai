// Robust Audio Engine with HTML5 Audio and Web Audio fallback synthesizer

const AudioFallback = typeof window !== 'undefined' ? window.Audio : class Audio {
  preload: string = '';
  src: string = '';
  volume: number = 1;
  currentTime: number = 0;
  paused: boolean = true;
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
} as any;

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private synthInterval: number | null = null;
  private isUsingSynth = false;
  private currentTrackId: string | null = null;
  
  private onTimeUpdateCallback: ((time: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;
  private onDurationChangeCallback: ((duration: number) => void) | null = null;

  private synthTime = 0;
  private synthDuration = 180;

  constructor() {
    this.audio = new AudioFallback();
    this.audio.preload = 'auto';
    this.setupListeners();
  }

  public initOnUserGesture() {
    if (typeof window === 'undefined') return;
    this.initAudioContext();
  }

  private setupListeners() {
    this.audio.addEventListener('timeupdate', () => {
      if (!this.isUsingSynth && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audio.currentTime);
      }
    });

    this.audio.addEventListener('durationchange', () => {
      if (!this.isUsingSynth && this.onDurationChangeCallback && !isNaN(this.audio.duration)) {
        this.onDurationChangeCallback(this.audio.duration);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn("HTML5 Audio player warning or media load event:", e);
      // Only switch to synth fallback if no audio source URL is set
      if (!this.audio.src) {
        this.startSynthFallback();
      }
    });
  }

  public setCallbacks(callbacks: {
    onTimeUpdate?: (time: number) => void;
    onEnded?: () => void;
    onError?: (err: any) => void;
    onDurationChange?: (duration: number) => void;
  }) {
    if (callbacks.onTimeUpdate) this.onTimeUpdateCallback = callbacks.onTimeUpdate;
    if (callbacks.onEnded) this.onEndedCallback = callbacks.onEnded;
    if (callbacks.onError) this.onErrorCallback = callbacks.onError;
    if (callbacks.onDurationChange) this.onDurationChangeCallback = callbacks.onDurationChange;
  }

  public loadAndPlay(trackId: string, url: string, durationSeconds: number = 180) {
    this.initAudioContext();
    this.stopSynth();
    this.currentTrackId = trackId;
    this.synthDuration = durationSeconds;

    // Check if valid media URL (supports relative /api/* URLs, http, https, blob, data)
    if (url && (url.startsWith('http') || url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:'))) {
      this.isUsingSynth = false;
      this.audio.src = url;
      this.audio.load();
      
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay or user gesture required for audio playback:", err);
        });
      }
    } else {
      // Use synthesized audio directly for procedural tracks
      this.startSynthFallback();
    }
  }

  public pause() {
    if (this.isUsingSynth) {
      if (this.synthInterval) {
        window.clearInterval(this.synthInterval);
        this.synthInterval = null;
      }
    } else {
      this.audio.pause();
    }
  }

  public resume() {
    this.initAudioContext();
    if (this.isUsingSynth) {
      this.resumeSynth();
    } else {
      this.audio.play().catch(() => this.startSynthFallback());
    }
  }

  public seek(seconds: number) {
    if (this.isUsingSynth) {
      this.synthTime = Math.max(0, Math.min(seconds, this.synthDuration));
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.synthTime);
      }
    } else {
      if (!isNaN(this.audio.duration)) {
        this.audio.currentTime = seconds;
      }
    }
  }

  public setVolume(volume: number) {
    // volume is 0.0 to 1.0
    const clamped = Math.max(0, Math.min(1, volume));
    this.audio.volume = clamped;
  }

  // --- Web Audio Fallback Synth ---
  private initAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private startSynthFallback() {
    this.isUsingSynth = true;
    this.initAudioContext();
    this.synthTime = this.synthTime || 0;
    this.resumeSynth();
  }

  private resumeSynth() {
    this.initAudioContext();
    if (this.synthInterval) window.clearInterval(this.synthInterval);

    // Dynamic Scale Notes & Chords for Procedural Song Generation
    const leadNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // C Major Pentatonic / Pop Lead
    const bassNotes = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00]; // Low Bass

    this.synthInterval = window.setInterval(() => {
      this.synthTime += 0.25;

      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.synthTime);
      }

      if (this.synthTime >= this.synthDuration) {
        this.stopSynth();
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
        return;
      }

      if (!this.audioContext) return;

      const masterVol = Math.max(0.01, Math.min(1, this.audio.volume ?? 0.8));
      const step = Math.floor(this.synthTime * 4); // 16th note steps

      try {
        const now = this.audioContext.currentTime;

        // 1. Kick Drum (Every downbeat)
        if (step % 4 === 0) {
          const kickOsc = this.audioContext.createOscillator();
          const kickGain = this.audioContext.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(120, now);
          kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
          
          kickGain.gain.setValueAtTime(masterVol * 0.4, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          
          kickOsc.connect(kickGain);
          kickGain.connect(this.audioContext.destination);
          kickOsc.start(now);
          kickOsc.stop(now + 0.18);
        }

        // 2. Snare / Hi-Hat Percussion (Offbeats)
        if (step % 2 === 1) {
          const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.05, this.audioContext.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          const whiteNoise = this.audioContext.createBufferSource();
          whiteNoise.buffer = noiseBuffer;

          const filter = this.audioContext.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = step % 4 === 2 ? 1000 : 5000;

          const noiseGain = this.audioContext.createGain();
          noiseGain.gain.setValueAtTime(masterVol * 0.2, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          whiteNoise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.audioContext.destination);

          whiteNoise.start(now);
          whiteNoise.stop(now + 0.05);
        }

        // 3. Bassline
        if (step % 2 === 0) {
          const bassOsc = this.audioContext.createOscillator();
          const bassGain = this.audioContext.createGain();
          const bassIndex = Math.floor(this.synthTime) % bassNotes.length;
          
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(bassNotes[bassIndex], now);

          bassGain.gain.setValueAtTime(masterVol * 0.25, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

          bassOsc.connect(bassGain);
          bassGain.connect(this.audioContext.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.22);
        }

        // 4. Melodic Lead Arpeggiator
        const leadOsc = this.audioContext.createOscillator();
        const leadGain = this.audioContext.createGain();
        const leadIndex = (step * 3 + Math.floor(step / 8)) % leadNotes.length;
        
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(leadNotes[leadIndex], now);

        leadGain.gain.setValueAtTime(masterVol * 0.2, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        leadOsc.connect(leadGain);
        leadGain.connect(this.audioContext.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.2);

      } catch (e) {
        // Ignore AudioContext transient errors
      }
    }, 250);
  }

  private stopSynth() {
    if (this.synthInterval) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  public getCurrentTime(): number {
    return this.isUsingSynth ? this.synthTime : (this.audio.currentTime || 0);
  }
}

export const audioEngine = new AudioEngine();
