'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Frame } from '@/hooks/useFrameCapture';

interface FrameDisplayProps {
  frames: Frame[];
  transcription?: string;
}

/**
 * Component to display captured frames and transcription
 */
const FrameDisplay: React.FC<FrameDisplayProps> = ({ frames, transcription }) => {
  return (
    <div className="h-full flex flex-col">
      {transcription && (
        <div className="p-2 mb-4 bg-gray-50 rounded border">
          <p className="text-sm">{transcription}</p>
        </div>
      )}
      <ScrollArea className="flex-grow">
        <div className="space-y-4 p-1">
          {frames.map((frame, idx) => (
            <div key={idx} className="w-full h-auto">
              <img
                src={frame.src}
                alt={`Frame at timestamp ${frame.timestamp}`}
                className="w-full object-cover"
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FrameDisplay;