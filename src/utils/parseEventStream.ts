export interface SSEEvent {
  type: 'text' | 'audio_prepare' | 'audio_chunk' | 'audio_complete' | 'error' | string;
  content?: string;
  format?: string;
  totalSize?: number;
  index?: number;
  total?: number;
  last?: boolean;
  data?: string;
  error?: string;
}

/**
 * Parses a Server-Sent Events (SSE) stream from the given reader.
 * Calls onEvent for each parsed event.
 */
export async function parseEventStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SSEEvent) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      if (!raw.startsWith('data: ')) continue;

      const data = raw.slice(6);
      if (data === '[DONE]') {
        return;
      }

      try {
        const event: SSEEvent = JSON.parse(data);
        onEvent(event);
      } catch (err) {
        console.error('SSE parse error:', err, 'raw data:', data);
      }
    }
  }
}
