export interface AudioConfig {
  /** Factor by which to accelerate audio playback */
  playbackRate: number;
}

/** Configuration for audio playback */
export const audioConfig: AudioConfig = {
  playbackRate: 1,
};
