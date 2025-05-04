/**
 * Types for commentary system
 */

export interface CommentaryMessage {
  id: string; // Unique identifier for the message
  content: string; // Text content of the message
  isMainSpeaker: boolean; // Whether this is from the main commentator
  timestamp: number; // When the message was created
  audioStatus: 'pending' | 'playing' | 'completed' | 'error'; // Status of the audio for this message
}

export interface AudioItem {
  id: string; // Matches the message ID
  base64Data: string; // Combined base64 audio data
  format: string; // Audio format (e.g., 'wav')
  isMainSpeaker: boolean; // Whether this is from the main commentator
  status: 'queued' | 'playing' | 'completed' | 'error'; // Status of the audio
}

// Type for passing to the API
export interface CommentaryRequest {
  images: string[]; // Base64 encoded images
  transcription: string; // User transcription
  isMainSpeaker: boolean; // Whether the main commentator should speak
  pastMessages: CommentaryMessage[]; // Previous 5 messages for context
}

// Response structure from the API (just for type safety)
export interface CommentaryResponse {
  type: string;
  content?: string;
  totalSize?: number;
  format?: string;
  index?: number;
  total?: number;
  last?: boolean;
  data?: string;
  error?: string;
}

export interface ViewerPersona {
  account_id: string;
  text_color: string;
  demographics: {
    age: number;
    gender: "male" | "female" | "unknown";
  };
  personality: string;
}
