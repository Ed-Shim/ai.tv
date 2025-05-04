'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

interface CommentaryControlsProps {
  isGenerating: boolean;
  isContinuous: boolean;
  hasFrames: boolean;
  onToggleContinuous: (pressed: boolean) => void;
}

/**
 * Controls for generating commentary and toggling continuous mode
 */
const CommentaryControls: React.FC<CommentaryControlsProps> = ({
  isGenerating,
  isContinuous,
  hasFrames,
  onToggleContinuous
}) => {
  return (
    <div className="mb-2 flex flex-col gap-2 h-[36px]">
      <Toggle
        pressed={isContinuous}
        onPressedChange={onToggleContinuous}
        className="w-full justify-center bg-black text-white hover:bg-black/80 hover:text-white data-[state=on]:bg-rose-200 data-[state=on]:hover:bg-rose-300 data-[state=on]:border data-[state=on]:border-rose-400 cursor-pointer"
        aria-label="Toggle continuous commentary"
      >
        {isContinuous ? 'Stop Streaming' : 'Start Streaming'}
      </Toggle>
    </div>
  );
};

export default CommentaryControls;