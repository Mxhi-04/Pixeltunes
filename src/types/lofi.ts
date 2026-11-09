/**
 * Procedural Lo-Fi Audio Engine Type Definitions
 */

export interface BuiltinTrackMetadata {
  readonly id: string;
  readonly name: string;
  readonly artist: string;
  readonly album: string;
  readonly duration: number; // in seconds
  readonly bpm: number;
  readonly scale: readonly number[];
  readonly chords: readonly (readonly number[])[];
}

export type PlaybackMode = 'lofi' | 'spotify';
