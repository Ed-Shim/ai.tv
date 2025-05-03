import { parseEventStream, SSEEvent } from '@/utils/parseEventStream';
import { playAudioFromBase64Chunks } from '@/utils/audioPlayer';

export interface CommentaryCallbacks {
  onStart?: () => void;
  onText?: (text: string) => void;
  onAudioStart?: (totalSize: number, format: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export async function generateCommentary(
  images: string[],
  transcription: string,
  callbacks: CommentaryCallbacks
): Promise<void> {
  callbacks.onStart?.();
  try {
    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, transcription }),
    });

    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response reader');

    let audioChunks: string[] = [];
    let audioFormat = 'wav';

    await parseEventStream(reader, (ev: SSEEvent) => {
      switch (ev.type) {
        case 'text':
          if (ev.content) callbacks.onText?.(ev.content);
          break;
        case 'audio_prepare':
          if (ev.totalSize != null && ev.format) {
            audioChunks = [];
            audioFormat = ev.format;
            callbacks.onAudioStart?.(ev.totalSize, ev.format);
          }
          break;
        case 'audio_chunk':
          if (ev.data) {
            audioChunks.push(decodeURIComponent(ev.data));
          }
          break;
        case 'audio_complete':
          playAudioFromBase64Chunks(audioChunks, audioFormat)
            .then(() => callbacks.onComplete?.())
            .catch((err: unknown) => callbacks.onError?.(err as Error));
          break;
        default:
          if (ev.error) {
            callbacks.onError?.(new Error(ev.error));
          }
      }
    });
  } catch (err: any) {
    callbacks.onError?.(err);
  }
}
