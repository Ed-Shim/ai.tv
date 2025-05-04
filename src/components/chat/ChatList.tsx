'use client';

import React from 'react';
import { ChatMessage } from '@/services/chatService';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatListProps {
  messages: ChatMessage[];
}

/**
 * Component to display chat messages from viewers
 */
export default function ChatList({ messages }: ChatListProps) {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <ScrollArea className="h-full w-full pr-4">
      <div className="flex flex-col space-y-0">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">
            No chat messages yet
          </div>
        ) : (
          // Display messages from latest to oldest
          [...messages]
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((message) => (
              <div key={`${message.id}-${message.timestamp}`} className="py-1">
                <span className="text-xs font-mono">
                  {formatTime(message.timestamp)}{' '}
                  <span style={{ color: message.color }}>{message.id}</span>:{' '}
                  {message.content}
                </span>
              </div>
            ))
        )}
      </div>
    </ScrollArea>
  );
}