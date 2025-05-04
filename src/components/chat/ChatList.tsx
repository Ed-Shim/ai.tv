'use client';

import React, { useState, useMemo } from 'react';
import { ChatMessage } from '@/services/chatService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface ChatListProps {
  messages: ChatMessage[];
}

type InterestFilter = 'all' | 'high' | 'mid' | 'low';

/**
 * Component to display chat messages from viewers
 */
export default function ChatList({ messages }: ChatListProps) {
  // Filter state
  const [interestFilter, setInterestFilter] = useState<InterestFilter>('all');
  
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Apply interest level filtering
  const filteredMessages = useMemo(() => {
    if (interestFilter === 'all') {
      return messages;
    }
    return messages.filter(message => message.interestLevel === interestFilter);
  }, [messages, interestFilter]);

  // Get interest level indicator color
  const getInterestColor = (level?: 'high' | 'mid' | 'low'): string => {
    switch (level) {
      case 'high': return 'bg-green-500';
      case 'mid': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      
      {/* Message list */}
      <ScrollArea className="flex-1 w-full pr-4">
        <div className="flex flex-col space-y-1">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-4">
              {messages.length === 0 
                ? 'No chat messages yet' 
                : `No messages with ${interestFilter} interest level`}
            </div>
          ) : (
            // Display messages from latest to oldest
            [...filteredMessages]
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((message) => (
                <div 
                  key={`${message.id}-${message.timestamp}`} 
                  className="py-1.5 px-2 rounded-md hover:bg-gray-50 flex items-start gap-2"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-gray-400">
                        {formatTime(message.timestamp)}
                      </span>
                      <span 
                        className="text-xs font-semibold" 
                        style={{ color: message.color }}
                      >
                        {message.id}
                      </span>
                    </div>
                    <span className="text-sm text-black">{message.content}</span>
                  </div>
                </div>
              ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}