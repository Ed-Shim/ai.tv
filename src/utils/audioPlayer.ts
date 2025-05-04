/**
 * Plays audio from an array of base64 chunks.
 * Returns a promise that resolves when playback ends or rejects on error.
 */
import { audioConfig } from '@/config/audioConfig';

export function playAudioFromBase64Chunks(
  chunks: string[],
  format: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const fullBase64 = chunks.join('');
      const byteChars = atob(fullBase64);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: `audio/${format}` });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = audioConfig.playbackRate;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Audio playback error'));
      };
      audio.play().catch(reject);
    } catch (err) {
      reject(err as Error);
    }
  });
}
