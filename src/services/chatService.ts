import { ViewerPersona } from '@/types/commentary';

export interface ChatMessage {
  id: string;      // Chat message ID
  content: string; // Chat message content
  color: string;   // Color for styling the message
  timestamp: number; // When the message was received
  interestLevel?: 'high' | 'mid' | 'low'; // Interest level of the message
}

export interface ChatStatistics {
  gender: {
    male: number;
    female: number;
    unknown: number;
  };
  interestLevel: {
    high: number;
    mid: number;
    low: number;
  };
}

export interface ChatResponse {
  responses: Array<{
    account_id: string;
    text_color: string;
    demographics: {
      age: number;
      gender: "male" | "female" | "unknown";
    };
    personality: string;
    thoughts: string[];
    interest_level: 'low' | 'mid' | 'high';
    // is_sending_chat is optional now as it was removed from schema
    is_sending_chat?: boolean;
    chat: string;
  }>;
  memory: {
    type: string;
    indexCount: number;
    memory: string;
  };
}

/**
 * Processes a chat response and extracts messages, statistics, and memory
 */
export function processChatResponse(
  data: ChatResponse
): {
  messages: ChatMessage[];
  statistics: ChatStatistics;
  memory: string;
} {
  // Extract messages from responses (only those with non-empty chat)
  const messages: ChatMessage[] = data.responses
    .filter(response => response.chat.trim() !== '')
    .map(response => ({
      id: response.account_id,
      content: response.chat,
      color: response.text_color,
      timestamp: Date.now(),
      interestLevel: response.interest_level
    }));

  // Extract statistics
  const statistics: ChatStatistics = {
    gender: { male: 0, female: 0, unknown: 0 },
    interestLevel: { high: 0, mid: 0, low: 0 }
  };

  // Calculate statistics
  data.responses.forEach(response => {
    // Gender statistics
    statistics.gender[response.demographics.gender]++;
    
    // Interest level statistics
    statistics.interestLevel[response.interest_level]++;
  });

  // Extract memory
  const memory = data.memory.memory;

  return {
    messages,
    statistics,
    memory
  };
}

/**
 * Sends frames to the chat API and processes the response
 */
export async function fetchChatResponse(
  frames: string[],
  currentMemory: string = '',
  transcription: string = '',
  commentaries: { content: string; isMainSpeaker: boolean }[] = []
): Promise<{
  messages: ChatMessage[];
  statistics: ChatStatistics;
  memory: string;
}> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        images: frames,
        currentMemory,
        transcription,
        commentaries 
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    return processChatResponse(data);
  } catch (error) {
    console.error('Chat streaming error:', error);
    // Return empty data on error
    return {
      messages: [],
      statistics: {
        gender: { male: 0, female: 0, unknown: 0 },
        interestLevel: { high: 0, mid: 0, low: 0 }
      },
      memory: currentMemory // Return the current memory if there's an error
    };
  }
}