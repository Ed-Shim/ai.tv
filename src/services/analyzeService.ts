import { parseEventStream, SSEEvent } from '../utils/parseEventStream';

export interface AnalysisCallbacks {
  onStart?: () => void;
  onData?: (text: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

/**
 * Sends frames and transcription to /api/analyze and streams back text chunks.
 */
export async function generateAnalysis(
  images: string[],
  transcription: string,
  callbacks: AnalysisCallbacks
): Promise<void> {
  callbacks.onStart?.();
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, transcription }),
    });

    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response reader');

    let accumulated = '';
    await parseEventStream(reader, (ev: SSEEvent) => {
      if (ev.type === 'text' && ev.content) {
        accumulated += ev.content;
        callbacks.onData?.(accumulated);
      } else if (ev.error) {
        callbacks.onError?.(new Error(ev.error));
      }
    });

    callbacks.onComplete?.();
  } catch (err: any) {
    callbacks.onError?.(err);
  }
}
