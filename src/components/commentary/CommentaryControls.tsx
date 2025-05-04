'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

interface CommentaryControlsProps {
  isGenerating: boolean;
  isContinuous: boolean;
  hasFrames: boolean;
  onGenerate: () => void;
  onToggleContinuous: (pressed: boolean) => void;
}

/**
 * Controls for generating commentary and toggling continuous mode
 */
const CommentaryControls: React.FC<CommentaryControlsProps> = ({
  isGenerating,
  isContinuous,
  hasFrames,
  onGenerate,
  onToggleContinuous
}) => {
  return (
    <div className="mb-2 flex flex-col gap-2">
      <Button
        onClick={onGenerate}
        disabled={isGenerating || !hasFrames}
        className="w-full"
      >
        {isGenerating ? 'Generating Commentary...' : 'Generate Commentary'}
      </Button>
      <Toggle
        pressed={isContinuous}
        onPressedChange={onToggleContinuous}
        className="w-full justify-center"
        aria-label="Toggle continuous commentary"
      >
        {isContinuous ? 'Stop Commentaries' : 'Start Commentaries'}
      </Toggle>
    </div>
  );
};

export default CommentaryControls;