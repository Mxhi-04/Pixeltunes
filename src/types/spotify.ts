export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice;
  repeat_state: 'off' | 'track' | 'context';
  shuffle_state: boolean;
  is_playing: boolean;
  item: SpotifyTrack | null;
  progress_ms: number;
}

export interface SpotifyAuthData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in ms
}

