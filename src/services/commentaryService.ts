import { parseEventStream, SSEEvent } from '@/utils/parseEventStream';
import { CommentaryMessage } from '@/types/commentary';

export interface CommentaryCallbacks {
  onStart?: () => void;
  onText?: (text: string) => void;
  onAudioStart?: (totalSize: number, format: string) => void;
  onAudioReady?: (base64Data: string, format: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  isMainSpeaker?: boolean;
  pastMessages?: CommentaryMessage[];
  tone?: number;
  developmentMode?: boolean;
  memory?: string;
}

export async function generateCommentary(
  images: string[],
  transcription: string,
  callbacks: CommentaryCallbacks
): Promise<void> {
  callbacks.onStart?.();
  try {
    // Prepare request with new fields
    const requestBody = {
      images,
      transcription,
      isMainSpeaker: callbacks.isMainSpeaker !== undefined ? callbacks.isMainSpeaker : true,
      pastMessages: callbacks.pastMessages || [],
      tone: callbacks.tone,
      developmentMode: callbacks.developmentMode,
      memory: callbacks.memory || "",
    };

    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
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
          // Instead of playing audio directly, pass the collected audio data back to the caller
          const fullBase64 = audioChunks.join('');
          callbacks.onAudioReady?.(fullBase64, audioFormat);
          callbacks.onComplete?.();
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
