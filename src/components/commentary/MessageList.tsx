'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommentaryMessage } from '@/types/commentary';
import { commentators } from '@/config/commentatorConfig';
import { PiPlayCircle } from 'react-icons/pi';

interface MessageItemProps {
  message: CommentaryMessage;
}

/**
 * Individual message item in the commentary list
 */
const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const bgColor = message.isMainSpeaker ? 'bg-blue-100' : 'bg-green-100';
  const speakerType = message.isMainSpeaker ? commentators.find(c => c.type === 'main')?.name : commentators.find(c => c.type === 'assist')?.name;
  
  return (
    <div className={`p-3 rounded-lg ${bgColor}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold">
          {speakerType}
        </span>
        <span className="text-xs text-gray-500">
          {message.audioStatus === 'playing' ? (
            <PiPlayCircle className="inline" />
          ) : message.audioStatus === 'completed' ? (
            <span>✓</span>
          ) : null}
        </span>
      </div>
      <div className="whitespace-pre-wrap">{message.content}</div>
    </div>
  );
};

interface MessageListProps {
  messages: CommentaryMessage[];
}

/**
 * List of commentary messages with scroll area
 */
const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {messages.length > 0 ? (
          messages.slice().reverse().map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))
        ) : (
          <div className="text-gray-400 italic">
            Generate a commentary to see the AI's interpretation of your images and transcription.
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default MessageList;