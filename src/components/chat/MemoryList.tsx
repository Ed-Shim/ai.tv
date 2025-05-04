'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MemoryListProps {
  memories: string[];
}

/**
 * Component to display memory items
 */
export default function MemoryList({ memories }: MemoryListProps) {
  return (
    <ScrollArea className="h-full w-full pr-4">
      <div className="flex flex-col p-4">
        {memories.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">
            No memories recorded yet
          </div>
        ) : (
          <ul className="list-disc pl-5 space-y-2">
            {/* Display memories from latest to oldest */}
            {[...memories].reverse().map((memory, index) => (
              <li key={index} className="text-sm">
                {memory}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScrollArea>
  );
}