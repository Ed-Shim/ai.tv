'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MemoryListProps {
  memory: string;
}

/**
 * Component to display continuous paragraph-based memory
 */
export default function MemoryList({ memory }: MemoryListProps) {
  // Split memory into paragraphs (each paragraph represents a scene)
  const paragraphs = memory ? memory.split(/\n\n+/) : [];
  
  return (
    <ScrollArea className="h-full w-full pr-4">
      <div className="flex flex-col p-4">
        {!memory ? (
          <div className="text-center text-sm text-gray-400 py-4">
            No memories recorded yet
          </div>
        ) : (
          <div className="space-y-4">
            {/* Display each paragraph/scene with a timestamp-like header */}
            {paragraphs.map((paragraph, index) => (
              <div key={index} className="mb-4">
                <div className="text-xs text-gray-500 mb-1">Scene {paragraphs.length - index}</div>
                <p className="text-sm whitespace-pre-wrap">{paragraph}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}