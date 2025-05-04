import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateCommentary } from '@/services/commentaryService';
import { CommentaryMessage, AudioItem } from '@/types/commentary';
import { Frame } from '@/hooks/useFrameCapture';
import { audioConfig } from '@/config/audioConfig';

export interface CommentaryOptions {
  transcription: string;
  initialIsMainSpeaking?: boolean;
  onTabChange?: (tab: string) => void;
}

/**
 * Custom hook to manage commentary generation and audio playback
 */
export function useCommentarySystem(frames: Frame[], options: CommentaryOptions) {
  const { transcription, initialIsMainSpeaking = true, onTabChange } = options;
  
  // State management
  const [messages, setMessages] = useState<CommentaryMessage[]>([]);
  const [audioQueue, setAudioQueue] = useState<AudioItem[]>([]);
  const [isMainSpeaking, setIsMainSpeaking] = useState<boolean>(initialIsMainSpeaking);
  const [isContinuous, setIsContinuous] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Refs
  const processingMessageRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isGenerationDelayedRef = useRef<boolean>(false); // Ref to track if generation was delayed due to queue size

  /**
   * Generate a new commentary
   */
  const generateNextCommentary = useCallback(() => {
    // Check audio queue size first - don't generate if we already have 2+ audio files
    const currentAudioCount = audioQueue.filter(
      item => item.status === 'queued' || item.status === 'playing'
    ).length;
    
    // Guard clauses
    if (frames.length === 0 || isGenerating || processingMessageRef.current) {
      // Can't generate now, set flag to try later
      if (isContinuous && currentAudioCount < 2) {
        isGenerationDelayedRef.current = true;
      }
      return;
    }
    
    // Don't generate if the audio queue is already full
    if (currentAudioCount >= 2) {
      console.log(`Generation skipped - queue has ${currentAudioCount} items`);
      isGenerationDelayedRef.current = true;
      return;
    }
    
    // Clear the delay flag since we're generating now
    isGenerationDelayedRef.current = false;
    
    // Generate a unique ID for this message
    const messageId = uuidv4();
    processingMessageRef.current = messageId;
    
    // Get the last 5 messages for context
    const recentMessages = messages.slice(-5);
    
    // Generate the commentary
    generateCommentary(
      frames.map(f => f.src), 
      transcription, 
      {
        isMainSpeaker: isMainSpeaking,
        pastMessages: recentMessages,
        onStart: () => {
          setIsGenerating(true);
          onTabChange?.('response');
        },
        onText: text => {
          // Add new message to the history
          const newMessage: CommentaryMessage = {
            id: messageId,
            content: text,
            isMainSpeaker: isMainSpeaking,
            timestamp: Date.now(),
            audioStatus: 'pending'
          };
          
          setMessages(prev => [...prev, newMessage]);
          
          // When text is received, check if we should prepare for the next generation
          if (isContinuous && frames.length > 0) {
            // Switch the speaker for the next generation
            setIsMainSpeaking(prev => !prev);
            
            // Check if we already have ≥ 2 audio items (including this new one that's pending)
            const currentAudioCount = audioQueue.filter(
              item => item.status === 'queued' || item.status === 'playing'
            ).length;
            
            // Adding 1 for the audio that will be created for this message
            if (currentAudioCount + 1 >= 2) {
              // We'll have 2 or more audio items, so delay the next generation
              isGenerationDelayedRef.current = true;
              console.log('Next generation delayed due to audio queue size');
            }
          }
        },
        onAudioStart: (totalSize, format) => {
          console.log(`Audio prepare: ${totalSize} bytes, format ${format}`);
        },
        onAudioReady: (base64Data, format) => {
          // Add to audio queue
          const newAudioItem: AudioItem = {
            id: messageId,
            base64Data,
            format,
            isMainSpeaker: isMainSpeaking,
            status: 'queued'
          };
          
          setAudioQueue(prev => [...prev, newAudioItem]);
        },
        onError: error => {
          console.error('Commentary error:', error);
          
          // Update the message status if it exists
          setMessages(prev => 
            prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, audioStatus: 'error' } 
                : msg
            )
          );
          
          setIsGenerating(false);
          processingMessageRef.current = null;
          
          // Reset the processing flag, but don't trigger generation here
          // The useEffect watching audioQueue will handle that if needed
          if (isContinuous) {
            // If we were in continuous mode, we might want to retry later
            isGenerationDelayedRef.current = true;
          }
        },
        onComplete: () => {
          // We've already switched the speaker in the onText handler
          setIsGenerating(false);
          processingMessageRef.current = null;
          
          // Let the reactive useEffect handle the next generation
          // Just make sure the delay flag is set if needed
          if (isContinuous) {
            // Let the useEffect do the job of checking queue size and triggering generation
            isGenerationDelayedRef.current = true;
          }
        },
      }
    );
  }, [frames, isGenerating, messages, isMainSpeaking, transcription, onTabChange, isContinuous]);

  /**
   * Generate commentary with main speaker
   */
  const generateMainCommentary = useCallback(() => {
    if (frames.length === 0 || isGenerating) return;
    
    // Force main speaker
    setIsMainSpeaking(true);
    generateNextCommentary();
  }, [frames.length, isGenerating, generateNextCommentary]);

  /**
   * Handle toggle for continuous mode
   */
  const toggleContinuous = useCallback((pressed: boolean) => {
    setIsContinuous(pressed);
  }, []);

  /**
   * Process audio queue
   */
  useEffect(() => {
    const playNextAudio = async () => {
      // If no audio in queue or already playing, return
      if (audioQueue.length === 0 || audioQueue.some(a => a.status === 'playing')) return;
      
      // Get the next audio item
      const nextAudioIndex = audioQueue.findIndex(a => a.status === 'queued');
      if (nextAudioIndex === -1) return;
      
      // Update status to playing
      const updatedQueue = [...audioQueue];
      updatedQueue[nextAudioIndex] = {
        ...updatedQueue[nextAudioIndex],
        status: 'playing'
      };
      setAudioQueue(updatedQueue);
      
      const audioItem = updatedQueue[nextAudioIndex];
      
      try {
        // Create and play audio
        const audio = new Audio(`data:audio/${audioItem.format};base64,${audioItem.base64Data}`);
        audio.playbackRate = audioConfig.playbackRate;
        
        // Update message status to playing
        setMessages(prev => 
          prev.map(msg => 
            msg.id === audioItem.id 
              ? { ...msg, audioStatus: 'playing' } 
              : msg
          )
        );
        
        // When audio ends
        audio.onended = () => {
          // Mark audio as complete
          setAudioQueue(prev => 
            prev.map(a => 
              a.id === audioItem.id 
                ? { ...a, status: 'completed' } 
                : a
            )
          );
          
          // Mark message as complete
          setMessages(prev => 
            prev.map(msg => 
              msg.id === audioItem.id 
                ? { ...msg, audioStatus: 'completed' } 
                : msg
            )
          );
          
          // Remove from queue
          setAudioQueue(prev => prev.filter(a => a.id !== audioItem.id));
          
          // The audio.onended handler no longer needs to trigger generation
          // We rely on the useEffect that watches audioQueue changes
          // Just clean up the queue
        };
        
        // Handle errors
        audio.onerror = () => {
          setAudioQueue(prev => 
            prev.map(a => 
              a.id === audioItem.id 
                ? { ...a, status: 'error' } 
                : a
            )
          );
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === audioItem.id 
                ? { ...msg, audioStatus: 'error' } 
                : msg
            )
          );
        };
        
        audio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        // Update status on error
        setAudioQueue(prev => 
          prev.map(a => 
            a.id === audioItem.id 
              ? { ...a, status: 'error' } 
              : a
          )
        );
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === audioItem.id 
              ? { ...msg, audioStatus: 'error' } 
              : msg
          )
        );
      }
    };
    
    playNextAudio();
  }, [audioQueue, isContinuous, frames.length]);

  /**
   * Initialize continuous mode
   */
  useEffect(() => {
    // When continuous mode is turned on, start the process if we're not already generating
    if (isContinuous && !isGenerating && !processingMessageRef.current && frames.length > 0) {
      // Check how many items are in the queue
      const queuedCount = audioQueue.filter(item => 
        item.status === 'queued' || item.status === 'playing'
      ).length;
      
      // Only start generating if we have < 2 items in queue
      if (queuedCount < 2) {
        // Start generating commentary immediately when continuous mode is turned on
        generateNextCommentary();
      } else {
        // We already have enough commentaries queued
        console.log(`Continuous mode activated but queue has ${queuedCount} items, waiting for some to complete`);
        isGenerationDelayedRef.current = true; // Set flag for future generation
      }
    }
    
    // Clear the delayed flag if continuous mode is turned off
    if (!isContinuous) {
      isGenerationDelayedRef.current = false;
    }
    
    // Clean up timeout if continuous mode is turned off
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isContinuous, isGenerating, audioQueue, frames.length, generateNextCommentary]);
  
  /**
   * Reactive effect to handle queue changes and trigger delayed generation
   */
  useEffect(() => {
    // Only proceed if:
    // 1. Continuous mode is on
    // 2. Generation was delayed
    // 3. We're not currently generating
    // 4. We have frames to analyze
    if (isContinuous && isGenerationDelayedRef.current && !isGenerating && !processingMessageRef.current && frames.length > 0) {
      // Count current audio items
      const currentAudioCount = audioQueue.filter(
        item => item.status === 'queued' || item.status === 'playing'
      ).length;
      
      // If we now have room in the queue, generate the next commentary
      if (currentAudioCount < 2) {
        console.log('Queue has space, triggering delayed generation');
        isGenerationDelayedRef.current = false; // Reset the flag
        
        // Use setTimeout to avoid potential state issues
        timeoutRef.current = setTimeout(() => {
          generateNextCommentary();
        }, 0);
      }
    }
  }, [audioQueue, isContinuous, isGenerating, frames.length, generateNextCommentary]);

  return {
    // State
    messages,
    audioQueue,
    isMainSpeaking,
    isContinuous,
    isGenerating,
    
    // Actions
    generateNextCommentary,
    generateMainCommentary,
    toggleContinuous,
  };
}