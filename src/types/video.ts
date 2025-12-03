/**
 * Video Cue Types
 * 
 * Supports multiple videos with cue-based triggering for performances.
 */

export interface VideoCue {
  id: string;
  name: string;
  uri: string;
  loop: boolean;
  duration?: number; // in seconds, if known
  thumbnail?: string;
  createdAt: number;
}

export interface VideoPlaylist {
  cues: VideoCue[];
  currentCueIndex: number;
}

export const createVideoCue = (uri: string, name?: string): VideoCue => ({
  id: `cue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: name || `Cue ${Date.now()}`,
  uri,
  loop: false,
  createdAt: Date.now(),
});

export const createEmptyPlaylist = (): VideoPlaylist => ({
  cues: [],
  currentCueIndex: 0,
});
