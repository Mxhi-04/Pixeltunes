// Procedural Web Audio Lo-Fi & 8-bit Synthesizer
// Provides real audio playback and frequency analysis for the visualizer without requiring external MP3s!

export interface BuiltinTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  bpm: number;
  scale: number[];
  chords: number[][];
}

export const BUILTIN_TRACKS: BuiltinTrack[] = [
  {
    id: 'track-1',
    name: 'FLY ME TO THE MOON',
    artist: 'PIXEL JAZZ TRIO',
    album: 'LO-FI MOONLIGHT',
    duration: 184, // 3:04
    bpm: 76,
    // Cmaj7 -> Am7 -> Dm7 -> G7 -> Em7 -> A7 -> Dm7 -> G7
    scale: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25],
    chords: [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [146.83, 220.00, 261.63, 349.23], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
      [164.81, 246.94, 329.63, 392.00], // Em7
      [220.00, 277.18, 329.63, 392.00], // A7
      [146.83, 220.00, 261.63, 349.23], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
    ]
  },
  {
    id: 'track-2',
    name: 'MIDNIGHT ORBIT',
    artist: 'CHIP CHILL',
    album: 'STARDUST VAPOR',
    duration: 160, // 2:40
    bpm: 68,
    scale: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00],
    chords: [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [164.81, 196.00, 246.94, 293.66], // Em7
    ]
  },
  {
    id: 'track-3',
    name: 'PASTEL CLOUDS',
    artist: 'BUNNY HOP',
    album: 'RABGON TAPES VOL.1',
    duration: 145, // 2:25
    bpm: 82,
    scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25],
    chords: [
      [261.63, 329.63, 392.00], // C
      [329.63, 392.00, 493.88], // Em
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66], // G
    ]
  }
];

class LofiEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private currentTrackIndex = 0;
  private playbackPosition = 0; // seconds
  private timer: number | null = null;
  private stepInterval: number | null = null;
  private beatStep = 0;
  private volume = 0.8;

  private onStateChange: (() => void) | null = null;

  constructor() {
    // will initialize AudioContext on user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setOnStateChange(callback: () => void) {
    this.onStateChange = callback;
  }

  public getTrack(): BuiltinTrack {
    return BUILTIN_TRACKS[this.currentTrackIndex];
  }

  public getTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getPosition(): number {
    return this.playbackPosition;
  }

  public getDuration(): number {
    return this.getTrack().duration;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.notify();
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public play() {
    this.initContext();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.startSequencer();
    this.notify();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stopSequencer();
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public selectTrack(index: number) {
    if (index >= 0 && index < BUILTIN_TRACKS.length) {
      this.currentTrackIndex = index;
      this.playbackPosition = 0;
      this.beatStep = 0;
      this.notify();
      if (!this.isPlaying) {
        this.play();
      }
    }
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % BUILTIN_TRACKS.length;
    this.playbackPosition = 0;
    this.beatStep = 0;
    this.notify();
  }

  public previousTrack() {
    if (this.playbackPosition > 3) {
      this.playbackPosition = 0;
      this.beatStep = 0;
    } else {
      this.currentTrackIndex = (this.currentTrackIndex - 1 + BUILTIN_TRACKS.length) % BUILTIN_TRACKS.length;
      this.playbackPosition = 0;
      this.beatStep = 0;
    }
    this.notify();
  }

  public seek(seconds: number) {
    this.playbackPosition = Math.max(0, Math.min(this.getDuration(), seconds));
    this.notify();
  }

  private startSequencer() {
    this.stopSequencer();
    const track = this.getTrack();
    const stepDurationMs = (60 / track.bpm / 2) * 1000; // 8th notes

    this.stepInterval = window.setInterval(() => {
      this.playBeatStep();
      this.beatStep = (this.beatStep + 1) % 16;
    }, stepDurationMs);

    // Track position timer
    this.timer = window.setInterval(() => {
      if (this.isPlaying) {
        this.playbackPosition += 1;
        if (this.playbackPosition >= this.getDuration()) {
          this.nextTrack();
        } else {
          this.notify();
        }
      }
    }, 1000);
  }

  private stopSequencer() {
    if (this.stepInterval !== null) {
      clearInterval(this.stepInterval);
      this.stepInterval = null;
    }
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private playBeatStep() {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    const track = this.getTrack();
    const now = this.ctx.currentTime;

    const chordIndex = Math.floor(this.beatStep / 4) % track.chords.length;
    const currentChord = track.chords[chordIndex];

    // Downbeat: warm mellow chord pad
    if (this.beatStep % 4 === 0) {
      currentChord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * 0.5, now); // 1 octave lower for warmth

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600 + Math.sin(now) * 200, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 1.2);
      });
    }

    // Cozy Lo-Fi Kick Drum on steps 0, 8, 10
    if (this.beatStep === 0 || this.beatStep === 8 || this.beatStep === 10) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(120, now);
      kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      kickGain.gain.setValueAtTime(0.2, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      kickOsc.connect(kickGain);
      kickGain.connect(this.masterGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.15);
    }

    // Soft Lo-Fi Snare / Rimshot on steps 4, 12
    if (this.beatStep === 4 || this.beatStep === 12) {
      const snareOsc = this.ctx.createOscillator();
      const snareGain = this.ctx.createGain();
      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(240, now);
      snareOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      snareGain.gain.setValueAtTime(0.12, now);
      snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      snareOsc.connect(snareGain);
      snareGain.connect(this.masterGain);
      snareOsc.start(now);
      snareOsc.stop(now + 0.1);
    }

    // Cute 8-bit Hi-Hat every other step
    if (this.beatStep % 2 === 0) {
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      const hatFilter = this.ctx.createBiquadFilter();

      hatOsc.type = 'square';
      hatOsc.frequency.setValueAtTime(1000 + Math.random() * 400, now);

      hatFilter.type = 'highpass';
      hatFilter.frequency.setValueAtTime(6000, now);

      hatGain.gain.setValueAtTime(0.02, now);
      hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      hatOsc.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(this.masterGain);

      hatOsc.start(now);
      hatOsc.stop(now + 0.03);
    }

    // 8-bit Melodic Chime notes
    if (Math.random() > 0.4) {
      const noteIndex = (this.beatStep * 2 + Math.floor(Math.random() * 3)) % track.scale.length;
      const noteFreq = track.scale[noteIndex] * 2; // high octave
      const melOsc = this.ctx.createOscillator();
      const melGain = this.ctx.createGain();

      melOsc.type = 'sine';
      melOsc.frequency.setValueAtTime(noteFreq, now);

      melGain.gain.setValueAtTime(0.04, now);
      melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      melOsc.connect(melGain);
      melGain.connect(this.masterGain);

      melOsc.start(now);
      melOsc.stop(now + 0.25);
    }
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
}

export const lofiEngine = new LofiEngine();

